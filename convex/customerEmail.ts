"use node";

/**
 * The emails a diner receives (AWS SES).
 *
 * Two of them, and neither is marketing:
 *  - the order confirmation, sent the moment an order is paid for;
 *  - the prize email, sent after a winner claims their lot.
 *
 * Both are best effort — a delivery failure never breaks the flow that
 * triggered it. The diner has already seen the outcome on screen.
 *
 * WHY THEY SHARE A FILE (this was `gameEmail.ts`, and the rename is the point):
 * Convex bundles every `"use node"` module separately with its dependencies,
 * and the e2e workflow pushes all of them into a local backend under a hard
 * five-minute ceiling — #315 measured the push already running at ~60% of it,
 * and a further Node bundle carrying its own copy of the AWS SDK took three of
 * four shards over. So a new transactional email joins an existing SES module
 * rather than opening another one. `emailAutomationActions.ts` made the same
 * call for the double opt-in confirmation and says so in the same words.
 *
 * It is also where the confirmation belongs, and why the file is no longer
 * named after the game: these are the establishment's transactional emails to
 * its customers, as opposed to the marketing ones in
 * `emailCampaignActions.ts` and `emailAutomationActions.ts`. The distinction is
 * load-bearing — `orders.ts` refuses to turn a buyer into a marketing
 * subscriber ("an order is a purchase, not consent"), so a receipt cannot ride
 * on the automation engine.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { emailSender, sendEmail } from "./emailTransport";
import { renderOrderConfirmation } from "@be-in-digital/core/aws/ses/order-confirmation";
import { renderOrderReady } from "@be-in-digital/core/aws/ses/order-ready";

async function sendViaSES(params: {
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  /** Overrides the deployment sender with the establishment's own identity. */
  fromEmail?: string;
  replyToEmail?: string;
}) {
  // No `noreply@beindigital.fr` fallback any more. That address is the
  // agency's: a client's own SES account cannot sign for it, so the fallback
  // turned "onboarding is not finished" into a confirmation that bounces
  // without anyone being told. Refusing names the problem instead — and the
  // caller at :252 already handles a missing sender that way.
  const fromEmail = params.fromEmail || emailSender();
  if (!fromEmail) {
    throw new Error(
      "aucun expéditeur : ni la configuration de l'établissement ni AWS_SES_FROM_EMAIL n'est renseigné"
    );
  }

  const outcome = await sendEmail({
    from: fromEmail,
    to: params.toEmail,
    subject: params.subject,
    html: params.htmlBody,
    text: params.textBody,
    ...(params.replyToEmail ? { replyTo: params.replyToEmail } : {}),
  });

  // This one THROWS where the transport reports, because its caller runs under
  // a confirmation claim it has to release on failure — see
  // `releaseConfirmationClaim`. Swallowing here would strand the claim and the
  // diner would never get a second attempt.
  if (!outcome.sent) {
    throw new Error(outcome.error ?? "envoi refusé par le fournisseur");
  }
}

/**
 * A display name that cannot break the `From` header.
 *
 * `Chez Luigi <no-reply@…>` is fine; « Pizzeria Luigi, Lyon 3e » is not — an
 * unquoted comma makes RFC 5322 read it as two addresses, SES rejects the whole
 * send, and the establishment never sends a confirmation again. The trading
 * name is a public, owner-typed string, so commas are ordinary rather than
 * exotic, and an angle bracket in it would let the name carry an address of its
 * own.
 */
function quoteDisplayName(name: string): string {
  const cleaned = name.replace(/[\r\n]+/g, " ").trim();
  if (!cleaned) return "";
  // A bare atom only when every character is safe unquoted.
  if (/^[A-Za-z0-9 !#$%&'*+\-/=?^_`{|}~]+$/.test(cleaned)) return cleaned;
  return `"${cleaned.replace(/([\\"])/g, "\\$1")}"`;
}

/**
 * A subject line with no control characters in it.
 *
 * SESv2's `Content.Simple` builds and encodes the MIME itself, so this is not
 * header injection — but a CR or LF reaching SES gets the send rejected, and a
 * rejected send is a diner who hears nothing.
 */
function sanitiseSubject(subject: string): string {
  return subject.replace(/[\r\n\t]+/g, " ").trim();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildPrizeHtml(params: {
  firstName: string;
  storeName: string;
  prizeName: string;
  prizeDescription?: string;
  code: string;
  expiresAt: number;
  ticketUrl?: string;
}): string {
  const ticketButton = params.ticketUrl
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${params.ticketUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;">Voir mon ticket gagnant</a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#120d1a;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f97316,#fbbf24);padding:36px 40px;text-align:center;">
          <div style="font-size:44px;line-height:1;">🎉</div>
          <h1 style="margin:12px 0 0;font-size:24px;color:#ffffff;">Félicitations ${params.firstName} !</h1>
          <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">Vous avez gagné chez ${params.storeName}</p>
        </div>
        <div style="padding:32px 40px;">
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;text-align:center;">
            <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#9a3412;">Votre lot</p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#1a1a1a;">${params.prizeName}</p>
            ${params.prizeDescription ? `<p style="margin:6px 0 0;font-size:14px;color:#6b7280;">${params.prizeDescription}</p>` : ""}
          </div>
          <div style="margin:28px 0;text-align:center;">
            <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">Présentez ce code au personnel du restaurant :</p>
            <div style="display:inline-block;background:#111827;border-radius:10px;padding:14px 28px;">
              <span style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:6px;color:#fbbf24;">${params.code}</span>
            </div>
          </div>
          ${ticketButton}
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Valable jusqu'au ${formatDate(params.expiresAt)}. Une seule utilisation, sur place.</p>
        </div>
      </div>
      <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#6b7280;">${params.storeName} — à très vite !</p>
    </div>
  </body>
</html>`;
}

export const sendPrizeEmail = internalAction({
  args: {
    toEmail: v.string(),
    firstName: v.string(),
    storeName: v.string(),
    prizeName: v.string(),
    prizeDescription: v.optional(v.string()),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (_ctx, args) => {
    const siteUrl = process.env.BID_APP_URL ?? process.env.SITE_URL ?? "";
    const ticketUrl = siteUrl
      ? `${siteUrl.replace(/\/$/, "")}/game/prize/${args.code}`
      : undefined;

    try {
      await sendViaSES({
        toEmail: args.toEmail,
        subject: `🎁 Votre lot chez ${args.storeName} — code ${args.code}`,
        htmlBody: buildPrizeHtml({ ...args, ticketUrl }),
        textBody: [
          `Félicitations ${args.firstName} !`,
          `Vous avez gagné : ${args.prizeName}`,
          `Votre code : ${args.code}`,
          ticketUrl ? `Votre ticket : ${ticketUrl}` : "",
          `Valable jusqu'au ${formatDate(args.expiresAt)}. Présentez ce code au personnel.`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return { sent: true };
    } catch (error) {
      console.error("Échec envoi email lot gagné:", error);
      return { sent: false };
    }
  },
});

/**
 * Tell a diner their order is confirmed, and what they paid for.
 *
 * WHY THIS EXISTS: it did not. Five SES senders shipped — team invitations,
 * campaigns, maintenance notices, prizes, automations — and not one of them was
 * transactional. A guest paid and received nothing: no confirmation, no
 * receipt, no note of where to collect their food. This is the day-one support
 * call the product had built no answer to.
 *
 * Scheduled from `orders.markCashPaid` and `orders.internalUpdatePaymentStatus`
 * — the two seams where an order becomes paid — after
 * `planOrderConfirmation` has decided the diner qualifies and claimed the send
 * on the order. By the time this runs the decision is made; all that is left is
 * to render and hand it to SES.
 *
 * Best effort, and deliberately so: it is scheduled rather than awaited, so a
 * refused SES call cannot roll back a payment that has already been taken.
 */
export const sendOrderConfirmation = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const payload = await ctx.runQuery(
      internal.orders.confirmationPayload,
      { orderId: args.orderId }
    );
    // The order, its establishment or its email went away between the mutation
    // claiming the send and this running. Nothing to do, and nothing wrong.
    if (!payload) {
      // The order was cancelled, refunded or deleted between the claim and
      // this running, or its establishment went away. Nothing to send, and the
      // claim goes back so a later legitimate settlement can still write.
      await ctx.runMutation(internal.orders.releaseConfirmationClaim, {
        orderId: args.orderId,
      });
      return { sent: false };
    }

    // `||`, not `??`: `emailConfig.fromEmail` is a required `v.string()` that
    // `upsert` accepts empty, and `??` would hand SES "" rather than falling
    // back to the deployment sender.
    const config = await ctx.runQuery(internal.emailConfig.getInternal, {
      // The payload crosses the query boundary as plain JSON, so the branded id
      // has to be reasserted. It is the order's own `storeId`, read a moment ago.
      storeId: payload.storeId as Id<"stores">,
    });
    const fromAddress =
      (config?.fromEmail as string | undefined) ||
      process.env.AWS_SES_FROM_EMAIL ||
      "";
    if (!fromAddress) {
      // Nothing was attempted, so the claim made in the settling mutation has
      // to go back: `AWS_SES_FROM_EMAIL` is a per-client onboarding step, so
      // "not set yet" is the day-one state of a new backend, and keeping the
      // claim would silence that establishment's very first confirmation for
      // ever — including after the address was configured.
      console.error(
        "[orderConfirmation] no sender address: neither the establishment's email config nor AWS_SES_FROM_EMAIL is set"
      );
      await ctx.runMutation(internal.orders.releaseConfirmationClaim, {
        orderId: args.orderId,
      });
      return { sent: false };
    }
    const senderName = quoteDisplayName(
      (config?.senderName as string | undefined) || payload.email.store.name
    );
    const fromEmail = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

    // The link to the live order page. Composed here rather than in the query
    // because `SITE_URL` is an environment variable and a Convex query has no
    // business reading one. Absent deployment URL or absent view token both
    // mean "no button", which the renderer handles.
    const siteUrl = (process.env.SITE_URL ?? process.env.BID_APP_URL ?? "").replace(/\/$/, "");
    const trackingUrl =
      siteUrl && payload.viewToken
        ? `${siteUrl}/order/${encodeURIComponent(payload.orderId)}?token=${encodeURIComponent(payload.viewToken)}`
        : undefined;

    const rendered = renderOrderConfirmation(
      { ...payload.email, trackingUrl },
      { timeZone: payload.timeZone }
    );

    try {
      await sendViaSES({
        toEmail: payload.toEmail,
        subject: sanitiseSubject(rendered.subject),
        htmlBody: rendered.html,
        textBody: rendered.text,
        fromEmail,
        replyToEmail:
          (config?.replyToEmail as string | undefined) || undefined,
      });
      return { sent: true };
    } catch (error) {
      // Swallowed like every other transactional send here. The order is paid,
      // the kitchen has it, and the diner has already seen the confirmation
      // screen; losing the email must not turn into a failed scheduled
      // function retrying against a provider that has already refused it.
      console.error("[orderConfirmation] SES send failed:", error);
      return { sent: false };
    }
  },
});

/**
 * « Votre commande est prête » (#96).
 *
 * Scheduled from `orders.updateStatus` — the one seam every status change goes
 * through — after `planOrderReady` has decided the diner qualifies and claimed
 * the send on the order. By the time this runs the decision is made; all that is
 * left is to render and hand it to the transport.
 *
 * WHAT IT DOES NOT DO. It does not fire on `preparing`, `out_for_delivery` or
 * `completed`, and it never fires on a delivery order — see
 * `convex-functions/orderReady.ts` for both decisions. One email, at the one
 * moment the diner has to act.
 *
 * Best effort, like the confirmation beside it: scheduled rather than awaited, so
 * a refused send cannot roll back a status the kitchen has already moved.
 */
export const sendOrderReady = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const payload = await ctx.runQuery(internal.orders.readyNoticePayload, {
      orderId: args.orderId,
    });
    if (!payload) {
      // Cancelled, deleted, or its establishment gone between the claim and
      // this running. The claim goes back so a later legitimate `ready` can
      // still write.
      await ctx.runMutation(internal.orders.releaseReadyNoticeClaim, {
        orderId: args.orderId,
      });
      return { sent: false };
    }

    const config = await ctx.runQuery(internal.emailConfig.getInternal, {
      storeId: payload.storeId as Id<"stores">,
    });
    // `||`, not `??`: `fromEmail` is a required `v.string()` that `upsert`
    // accepts empty.
    const fromAddress =
      (config?.fromEmail as string | undefined) ||
      process.env.AWS_SES_FROM_EMAIL ||
      "";
    if (!fromAddress) {
      console.error(
        "[orderReady] no sender address: neither the establishment's email config nor AWS_SES_FROM_EMAIL is set"
      );
      await ctx.runMutation(internal.orders.releaseReadyNoticeClaim, {
        orderId: args.orderId,
      });
      return { sent: false };
    }

    const senderName = quoteDisplayName(
      (config?.senderName as string | undefined) || payload.email.store.name
    );
    const fromEmail = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

    const siteUrl = (process.env.SITE_URL ?? process.env.BID_APP_URL ?? "").replace(
      /\/$/,
      ""
    );
    const trackingUrl =
      siteUrl && payload.viewToken
        ? `${siteUrl}/order/${encodeURIComponent(payload.orderId)}?token=${encodeURIComponent(payload.viewToken)}`
        : undefined;

    const rendered = renderOrderReady(
      { ...payload.email, ...(trackingUrl ? { trackingUrl } : {}) } as never,
      { timeZone: payload.timeZone }
    );

    try {
      await sendViaSES({
        toEmail: payload.toEmail,
        subject: sanitiseSubject(rendered.subject),
        htmlBody: rendered.html,
        textBody: rendered.text,
        fromEmail,
        replyToEmail: (config?.replyToEmail as string | undefined) || undefined,
      });
      return { sent: true };
    } catch (error) {
      // Swallowed like every other transactional send here: the food is ready and
      // the kitchen has moved on, and losing the email must not turn into a
      // scheduled function retrying against a provider that already refused it.
      console.error("[orderReady] send failed:", error);
      return { sent: false };
    }
  },
});
