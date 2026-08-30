import { httpAction } from "./_generated/server";
import { internal as _internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Email modules not yet in codegen — will resolve after `convex dev` regenerates types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;

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

function htmlPage(title: string, message: string): string {
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
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
  </div>
</body>
</html>`;
}

// ─── GET /email/unsubscribe?id=<subscriberId> ───────────────────────────────

// @public-by-design: the recipient of a marketing email has no session and
// must be able to leave from the link alone — required by law, and a login
// wall on an unsubscribe link is itself the abuse. The unguessable document
// id in the link is the bearer credential, and the handler answers the same
// page whether or not it matched, so it is not an enumeration oracle.
export const handleUnsubscribe = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(
      htmlPage("Erreur", "Lien de désabonnement invalide."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    await ctx.runMutation(internal.emailSubscribers.unsubscribe, {
      id: id as Id<"emailSubscribers">,
    });
  } catch (error) {
    // Idempotent — show success even if already unsubscribed or invalid ID
    console.error("Unsubscribe error:", error);
  }

  return new Response(
    htmlPage(
      "Désabonnement confirmé",
      "Vous ne recevrez plus d'emails de notre part. Cette action peut prendre quelques instants."
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
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
  // `internal` is cast to `any` at the top of this file, so the action's
  // return type does not survive the call. Named here, or `verdict.valid`
  // would be `any` and the check below would prove nothing.
  const verdict = (await ctx.runAction(internal.sesWebhookVerify.verify, {
    body: rawBody,
  })) as { valid: boolean; reason?: string };
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

  if (!storeId || !subscriberId) {
    // Email sent outside the campaign system — nothing to track
    return new Response("OK", { status: 200 });
  }

  const now = Date.now();
  const typedStoreId = storeId as Id<"stores">;
  const typedSubscriberId = subscriberId as Id<"emailSubscribers">;
  const typedCampaignId = campaignId
    ? (campaignId as Id<"emailCampaigns">)
    : undefined;

  try {
    switch (notification.notificationType) {
      case "Bounce": {
        await ctx.runMutation(internal.emailSubscribers.markBounced, {
          id: typedSubscriberId,
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
  } catch (error) {
    console.error("SES webhook processing error:", error);
  }

  return new Response("OK", { status: 200 });
});
