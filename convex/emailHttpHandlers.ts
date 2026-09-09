import { httpAction } from "./_generated/server";
import { captureBackendError } from "./errorReporting";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { normalizeBounceType } from "@be-in-digital/convex-functions/emailSubscribers";


// ─── Helper: minimal HTML response page ─────────────────────────────────────

const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function esc(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESC_MAP[ch] ?? ch);
}

/**
 * @param bodyExtra raw HTML appended after the message — callers pass only
 *   markup they built themselves, never anything taken from a request.
 */
function htmlPage(title: string, message: string, bodyExtra = ""): string {
  const safeTitle = esc(title);
  const safeMessage = esc(message);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; color: #1a1a1a; }
    .card { background: #fff; border-radius: 12px; padding: 48px; max-width: 440px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { font-size: 15px; color: #666; margin: 0; line-height: 1.6; }
    button { margin-top: 24px; font: inherit; font-size: 15px; padding: 12px 28px; border: 0; border-radius: 8px; background: #1a1a1a; color: #fff; cursor: pointer; }
    button:hover { background: #333; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    ${bodyExtra}
  </div>
</body>
</html>`;
}

// ─── GET /email/unsubscribe?id=<subscriberId> ───────────────────────────────

const HTML = { "Content-Type": "text/html; charset=utf-8" } as const;

const INVALID_LINK = htmlPage("Erreur", "Lien de désabonnement invalide.");

const UNSUBSCRIBED = htmlPage(
  "Désabonnement confirmé",
  "Vous ne recevrez plus d'emails de notre part. Cette action peut prendre quelques instants."
);

/**
 * GET only ASKS. It used to unsubscribe.
 *
 * A GET that mutates is fetched by things that are not the recipient: Outlook
 * Safe Links, corporate mail scanners and the Gmail image proxy all follow
 * links in delivered mail to check them. Every one of those fetches
 * unsubscribed a paying customer who never clicked anything, silently, and the
 * restaurant's list quietly shrank with no explanation available to anyone.
 *
 * The link in the email is unchanged, so everything already in an inbox keeps
 * working — it now lands on a button instead of firing on arrival.
 */
// @public-by-design: the recipient of a marketing email has no session and must
// be able to reach this from the link alone; this branch only renders a page
export const handleUnsubscribe = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return new Response(INVALID_LINK, { status: 400, headers: HTML });

  // The id is echoed into a hidden field, so it goes through `esc` — it is
  // attacker-controlled text on its way into HTML.
  const confirm = `<form method="POST" action="/email/unsubscribe">
      <input type="hidden" name="id" value="${esc(id)}" />
      <button type="submit">Confirmer le désabonnement</button>
    </form>`;

  return new Response(
    htmlPage(
      "Confirmer le désabonnement",
      "Cliquez pour ne plus recevoir nos emails.",
      confirm
    ),
    { status: 200, headers: HTML }
  );
});

/**
 * POST does it — from the button above, or from a mail client's one-click.
 *
 * RFC 8058 one-click sends `List-Unsubscribe=One-Click` as the body with no
 * further interaction, which is exactly this endpoint. That is why there is no
 * CSRF token here and why there must not be one: the caller is Gmail or Yahoo,
 * not a browser carrying a session.
 */
// @public-by-design: RFC 8058 one-click is a machine POST from the mail
// provider, and the unguessable id in the link is the only credential it has
export const handleUnsubscribePost = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  let id = url.searchParams.get("id");

  // The button posts a form body; one-click keeps the id in the query string.
  if (!id) {
    try {
      const form = await request.formData();
      const field = form.get("id");
      if (typeof field === "string") id = field;
    } catch {
      // No form body — the query string was the only source, and it was empty.
    }
  }

  if (!id) return new Response(INVALID_LINK, { status: 400, headers: HTML });

  try {
    await ctx.runMutation(internal.emailSubscribers.unsubscribe, {
      id: id as Id<"emailSubscribers">,
    });
  } catch (error) {
    // Reported as success on purpose, but only for the recipient's benefit:
    // an id that no longer exists or is already unsubscribed means they are
    // not on the list, which is what they asked for, and distinguishing the
    // cases would turn this page into an oracle for which ids are live.
    //
    // It is logged, because the previous version swallowed a genuine failure
    // and told the customer they had been unsubscribed when they had not.
    console.error("Unsubscribe failed:", error);
    await captureBackendError(ctx, {
      error,
      source: "emailHttpHandlers.handleUnsubscribePost",
    });
  }

  return new Response(UNSUBSCRIBED, { status: 200, headers: HTML });
});

// ─── GET /email/confirm?token=<doubleOptInToken> ────────────────────────────

// @guarded-inline: the single-use doubleOptInToken is the credential, and
// the mutation clears it on use
export const handleConfirmOptIn = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(
      htmlPage("Erreur", "Lien de confirmation invalide."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    await ctx.runMutation(internal.emailSubscribers.confirmDoubleOptIn, {
      token,
    });

    return new Response(
      htmlPage(
        "Inscription confirmée !",
        "Merci, votre adresse email a bien été confirmée. Vous recevrez bientôt nos prochaines communications."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    const userMsg =
      msg === "Token expiré"
        ? "Ce lien de confirmation a expiré (48h). Veuillez vous réinscrire."
        : msg === "Abonné déjà confirmé"
          ? "Votre inscription est déjà confirmée."
          : msg === "Adresse non distribuable"
            ? "Nous n'avons pas pu livrer d'email à cette adresse. Vérifiez-la, puis réinscrivez-vous."
            : "Ce lien de confirmation est invalide.";

    return new Response(htmlPage("Erreur", userMsg), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

// ─── POST /webhooks/ses ─────────────────────────────────────────────────────
//
// Receives SNS notifications from an SES Configuration Set.
// Tracked events: Bounce, Complaint, Delivery, Open, Click.
//
// Correlation relies on custom headers injected at send time:
//   X-Campaign-Id, X-Subscriber-Id, X-Store-Id
// ─────────────────────────────────────────────────────────────────────────────

interface SNSMessage {
  Type:
    | "SubscriptionConfirmation"
    | "Notification"
    | "UnsubscribeConfirmation";
  Message: string;
  SubscribeURL?: string;
  TopicArn?: string;
  SigningCertURL?: string;
}

interface SESNotification {
  notificationType:
    | "Bounce"
    | "Complaint"
    | "Delivery"
    | "Open"
    | "Click";
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    headers?: Array<{ name: string; value: string }>;
  };
  bounce?: {
    bounceType: "Permanent" | "Transient" | "Undetermined";
    bouncedRecipients: Array<{ emailAddress: string }>;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
  };
  open?: { timestamp: string; userAgent?: string };
  click?: { timestamp: string; link?: string };
}

function getMailHeader(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string
): string | undefined {
  return headers?.find((h) => h.name === name)?.value;
}

// @guarded-inline: verifies Amazon's RSA signature over the raw body before
// reading a single field out of it
export const handleSesWebhook = httpAction(async (ctx, request) => {
  const rawBody = await request.text();

  let snsMessage: SNSMessage;
  try {
    snsMessage = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // The check that used to stand here asked whether the body's own
  // `SigningCertURL` field looked like an Amazon host, and treated a yes as
  // authentication. The attacker writes that field. Everything below —
  // `markBounced`, `markComplained`, the campaign counters — was reachable by
  // anyone who could POST, for any subscriber id they cared to name.
  //
  // Amazon signs every message; that signature is the only thing here that an
  // attacker cannot produce. The host check still runs, in
  // `sesWebhookVerify`, doing the job it can actually do: deciding which host
  // we are willing to fetch a certificate from.
  const verdict = await ctx.runAction(internal.sesWebhookVerify.verify, {
    body: rawBody,
  });
  if (!verdict.valid) {
    console.error("Rejected SES webhook:", verdict.reason);
    return new Response("Unauthorized", { status: 403 });
  }

  // Handle subscription confirmation (first-time setup)
  if (snsMessage.Type === "SubscriptionConfirmation") {
    if (snsMessage.SubscribeURL) {
      // Validate SubscribeURL to prevent SSRF
      try {
        const subUrl = new URL(snsMessage.SubscribeURL);
        if (
          subUrl.protocol === "https:" &&
          /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(subUrl.hostname)
        ) {
          await fetch(snsMessage.SubscribeURL);
          console.log("SNS subscription confirmed for:", snsMessage.TopicArn);
        } else {
          console.error("Invalid SubscribeURL origin:", snsMessage.SubscribeURL);
        }
      } catch {
        console.error("Invalid SubscribeURL:", snsMessage.SubscribeURL);
      }
    }
    return new Response("OK", { status: 200 });
  }

  // Only process Notification type
  if (snsMessage.Type !== "Notification") {
    return new Response("OK", { status: 200 });
  }

  let notification: SESNotification;
  try {
    notification = JSON.parse(snsMessage.Message);
  } catch {
    return new Response("Invalid SES notification", { status: 400 });
  }

  // Extract correlation headers injected at send time
  const campaignId = getMailHeader(
    notification.mail.headers,
    "X-Campaign-Id"
  );
  const subscriberId = getMailHeader(
    notification.mail.headers,
    "X-Subscriber-Id"
  );
  const storeId = getMailHeader(notification.mail.headers, "X-Store-Id");

  const now = Date.now();
  const typedCampaignId = campaignId
    ? (campaignId as Id<"emailCampaigns">)
    : undefined;

  /* Who this notification is about.

     The headers above are the precise answer and are usually there. They are
     not always: SES omits `mail.headers` from a notification unless the sending
     identity is configured to include the original headers, and nothing
     configured that until `scripts/setup-aws.sh` grew its Step 2b. This
     function's whole body used to sit behind
     `if (!storeId || !subscriberId) return 200`, so on a deployment provisioned
     before then EVERY bounce and EVERY complaint was read as "sent outside the
     campaign system" and dropped — silently, with the 200 that tells SNS the
     delivery succeeded and never to send it again.

     So a bounce or a complaint falls back to the address. SES always names the
     recipient, and the recipient is what the notification is about: a hard
     bounce says the mailbox does not exist and a complaint says this person
     reported us, and neither fact depends on knowing which campaign carried the
     message. Both suppress, and suppression is what keeps the account sending —
     AWS suspends at a 5 % complaint rate, per ACCOUNT, and one AWS account
     holds every store an owner runs.

     Deliveries, opens and clicks do NOT fall back. Those are campaign
     statistics, and attributing one to a store that did not send the message
     would corrupt the figure rather than complete it. */
  const targets: Array<{
    storeId: Id<"stores">;
    subscriberId: Id<"emailSubscribers">;
  }> = [];

  if (storeId && subscriberId) {
    targets.push({
      storeId: storeId as Id<"stores">,
      subscriberId: subscriberId as Id<"emailSubscribers">,
    });
  } else if (
    notification.notificationType === "Bounce" ||
    notification.notificationType === "Complaint"
  ) {
    // The per-recipient lists first — one notification can carry several — with
    // `mail.destination` behind them, which SES always sets.
    const addresses = new Set(
      [
        ...(notification.bounce?.bouncedRecipients ?? []).map(
          (r) => r.emailAddress
        ),
        ...(notification.complaint?.complainedRecipients ?? []).map(
          (r) => r.emailAddress
        ),
        ...(notification.mail.destination ?? []),
      ]
        .filter((address): address is string => typeof address === "string")
        .map((address) => address.toLowerCase())
    );

    for (const address of addresses) {
      const matches = await ctx.runQuery(
        internal.emailSubscribers.listByEmailInternal,
        { email: address }
      );
      for (const subscriber of matches) {
        targets.push({
          storeId: subscriber.storeId,
          subscriberId: subscriber._id,
        });
      }
    }
  }

  if (targets.length === 0) {
    /* Genuinely nobody: a transactional mail to an address no list holds, or a
       Delivery/Open/Click whose headers did not survive. Nothing to record.

       But a bounce or a complaint reaching here is a misconfiguration rather
       than a stray, so it is reported instead of dropped. A silent 200 is
       exactly how this stayed invisible: the endpoint answered correctly, SES
       stopped mentioning it, and the first symptom available to anyone was the
       account being suspended. */
    if (
      notification.notificationType === "Bounce" ||
      notification.notificationType === "Complaint"
    ) {
      await captureBackendError(ctx, {
        error: new Error(
          `SES ${notification.notificationType} matched no subscriber` +
            (notification.mail.headers
              ? ""
              : " and carried no original headers — the sending identity is not" +
                " configured to include them (scripts/setup-aws.sh, Step 2b)")
        ),
        source: "emailHttpHandlers.handleSesWebhook",
      });
    }
    return new Response("OK", { status: 200 });
  }

  try {
    for (const {
      storeId: typedStoreId,
      subscriberId: typedSubscriberId,
    } of targets) {
      switch (notification.notificationType) {
        case "Bounce": {
          // The classification is the whole point of reading this branch.
          // Without it every dead mailbox was mailed three times, and it is the
          // bounce ratio — not the number of distinct bad addresses — that AWS
          // suspends an account over. The body is signed, so this is trustworthy
          // by the time execution reaches here.
          await ctx.runMutation(internal.emailSubscribers.markBounced, {
            id: typedSubscriberId,
            // Normalised rather than forwarded raw: `markBounced`'s validator is
            // a closed union, and this whole switch sits inside a catch that
            // only logs — so an unrecognised value would fail validation, be
            // swallowed, and lose the bounce entirely.
            bounceType: normalizeBounceType(notification.bounce?.bounceType),
          });
          await ctx.runMutation(internal.emailEvents.create, {
            storeId: typedStoreId,
            campaignId: typedCampaignId,
            subscriberId: typedSubscriberId,
            type: "bounced",
            occurredAt: now,
          });
          if (typedCampaignId) {
            await ctx.runMutation(internal.emailCampaigns.incrementStats, {
              id: typedCampaignId,
              field: "bounced",
            });
          }
          break;
        }

        case "Complaint": {
          await ctx.runMutation(internal.emailSubscribers.markComplained, {
            id: typedSubscriberId,
          });
          await ctx.runMutation(internal.emailEvents.create, {
            storeId: typedStoreId,
            campaignId: typedCampaignId,
            subscriberId: typedSubscriberId,
            type: "complained",
            occurredAt: now,
          });
          if (typedCampaignId) {
            await ctx.runMutation(internal.emailCampaigns.incrementStats, {
              id: typedCampaignId,
              field: "unsubscribed",
            });
          }
          break;
        }

        case "Delivery": {
          await ctx.runMutation(internal.emailEvents.create, {
            storeId: typedStoreId,
            campaignId: typedCampaignId,
            subscriberId: typedSubscriberId,
            type: "delivered",
            occurredAt: now,
          });
          if (typedCampaignId) {
            await ctx.runMutation(internal.emailCampaigns.incrementStats, {
              id: typedCampaignId,
              field: "delivered",
            });
          }
          break;
        }

        case "Open": {
          await ctx.runMutation(internal.emailEvents.create, {
            storeId: typedStoreId,
            campaignId: typedCampaignId,
            subscriberId: typedSubscriberId,
            type: "opened",
            metadata: notification.open?.userAgent
              ? { userAgent: notification.open.userAgent }
              : undefined,
            occurredAt: now,
          });
          if (typedCampaignId) {
            await ctx.runMutation(internal.emailCampaigns.incrementStats, {
              id: typedCampaignId,
              field: "opened",
            });
          }
          break;
        }

        case "Click": {
          await ctx.runMutation(internal.emailEvents.create, {
            storeId: typedStoreId,
            campaignId: typedCampaignId,
            subscriberId: typedSubscriberId,
            type: "clicked",
            metadata: notification.click?.link
              ? { linkUrl: notification.click.link }
              : undefined,
            occurredAt: now,
          });
          if (typedCampaignId) {
            await ctx.runMutation(internal.emailCampaigns.incrementStats, {
              id: typedCampaignId,
              field: "clicked",
            });
          }
          break;
        }
      }
    }
  } catch (error) {
    console.error("SES webhook processing error:", error);
    await captureBackendError(ctx, {
      error,
      source: "emailHttpHandlers.handleSesWebhook",
    });
  }

  return new Response("OK", { status: 200 });
});
