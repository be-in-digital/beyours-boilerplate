"use node";
/* eslint-disable @typescript-eslint/no-explicit-any -- Convex action ctx.runQuery returns untyped results */

import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  buildSegmentFilter,
  renderTemplateToEmailHtml,
} from "@be-in-digital/marketing";
import {
  ONE_WEEK_MS,
  resolveWeeklyCap,
  subjectFor,
  withinWeeklyCap,
} from "@be-in-digital/convex-functions/campaignDelivery";

const BATCH_DELAY_MS = 100; // ~10 emails/sec, well below SES sandbox limit

function createSESClient() {
  return new SESv2Client({
    region: process.env.AWS_REGION ?? "eu-west-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Subscribers handled per batch. One SES call and a 100 ms pause each. */
const BATCH_SIZE = 40;

/**
 * Begin sending a campaign. The work itself happens in `sendBatch`.
 *
 * This used to BE the send: one synchronous loop over every active subscriber,
 * invoked from the browser, with an SES call, two mutation round-trips and a
 * 100 ms pause each. Around 3,000 subscribers it exceeded the Convex time
 * limit, the campaign stayed at `sending` for good, and the only way out was
 * "Relancer" — which started again from the first subscriber and mailed
 * everyone who had already received it a second time.
 *
 * So the loop is gone. This validates, marks the campaign, and hands off to a
 * chain of scheduled batches that can be interrupted, paused and resumed.
 */
// @guarded-inline: runs authHelpers.checkStorePermission on the campaign's store
export const send = action({
  args: {
    campaignId: v.id("emailCampaigns"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 1. Load campaign, template, config
    const campaign: any = await ctx.runQuery(api.emailCampaigns.getById, {
      id: args.campaignId,
    });
    if (!campaign) throw new Error("Campagne introuvable");

    // Verify store-level permission (actions don't have ctx.db)
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: campaign.storeId,
      permission: "marketing:write",
    });

    if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
      throw new Error(
        "La campagne ne peut pas être envoyée dans son état actuel. Statut actuel : " +
          campaign.status
      );
    }

    const template: any = await ctx.runQuery(api.emailTemplates.getById, {
      id: campaign.templateId,
    });
    if (!template) throw new Error("Modèle introuvable");

    const config: any = await ctx.runQuery(api.emailConfig.get, {
      storeId: campaign.storeId,
    });
    if (!config) throw new Error("Configuration email introuvable");

    // Refusing an empty audience out loud, as before. It used to fall out of
    // loading every subscriber; asking for a single row keeps the warning
    // without bringing the unbounded read back with it.
    const firstPage: any = await ctx.runQuery(internal.emailSubscribers.pageForSending, {
      storeId: campaign.storeId,
      cursor: null,
      numItems: 1,
    });
    if (firstPage.page.length === 0) {
      throw new Error("Aucun abonné actif trouvé pour cette campagne");
    }

    // Starting fresh rather than resuming means the cursor must be cleared,
    // or a re-run of a finished campaign would resume at its end and send
    // nothing. Resuming a paused one keeps it.
    if (campaign.status !== "paused") {
      await ctx.runMutation(internal.emailCampaigns.saveSendCursor, {
        id: args.campaignId,
        cursor: null,
      });
    }

    await ctx.runMutation(internal.emailCampaigns.markSending, {
      id: args.campaignId,
    });

    await ctx.scheduler.runAfter(0, internal.emailCampaignActions.sendBatch, {
      campaignId: args.campaignId,
    });

    return { started: true };
  },
});

/**
 * Send one page of the campaign, then schedule the next.
 *
 * Three properties this has to hold, each one a defect it replaces:
 *
 * - **Bounded.** A batch reads one page and sends it, so no single invocation
 *   can outgrow the action time limit however long the list is.
 * - **Resumable.** The cursor is saved after every page, so an interruption
 *   costs at most one batch and "Relancer" continues rather than restarts.
 * - **Idempotent.** Before sending, it asks the events table which of these
 *   subscribers this campaign has already reached, and skips them. A cursor
 *   alone cannot survive a batch that is retried after a transient failure;
 *   this can, and duplicate marketing mail is the failure that costs real
 *   customers and real SES reputation.
 */
export const sendBatch = internalAction({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx: ActionCtx, args): Promise<void> => {
    const campaign: any = await ctx.runQuery(internal.emailCampaigns.getByIdInternal, {
      id: args.campaignId,
    });
    if (!campaign) return;

    // The owner pressed Pause between two batches. Stop the chain and leave the
    // cursor where it is — that is what makes resuming possible at all.
    if (campaign.status !== "sending") {
      console.log(
        `[emailCampaigns] batch stopped: campaign is "${campaign.status}"`
      );
      return;
    }

    const template: any = await ctx.runQuery(internal.emailTemplates.getByIdInternal, {
      id: campaign.templateId,
    });
    const config: any = await ctx.runQuery(internal.emailConfig.getInternal, {
      storeId: campaign.storeId,
    });
    if (!template || !config) {
      console.error("[emailCampaigns] template or config missing; send halted");
      return;
    }

    const page: any = await ctx.runQuery(internal.emailSubscribers.pageForSending, {
      storeId: campaign.storeId,
      cursor: campaign.sendCursor ?? null,
      numItems: BATCH_SIZE,
    });

    let recipients: any[] = page.page;

    if (campaign.segmentId) {
      const segment: any = await ctx.runQuery(internal.emailSegments.getByIdInternal, {
        id: campaign.segmentId,
      });
      if (segment) {
        const predicate = buildSegmentFilter(segment.rules, segment.ruleOperator);
        recipients = recipients.filter((s: any) => predicate(s));
      }
    }

    // One round-trip for the whole page, not one per subscriber.
    const alreadyReached: string[] = recipients.length
      ? await ctx.runQuery(internal.emailEvents.alreadySentTo, {
          campaignId: args.campaignId,
          subscriberIds: recipients.map((s: any) => s._id),
        })
      : [];
    const reached = new Set(alreadyReached);
    recipients = recipients.filter((s: any) => !reached.has(s._id));

    // `maxEmailsPerWeek` was presented in the settings screen as an anti-spam
    // guard, with a default of three, and nothing anywhere consulted it: a
    // restaurant sending four campaigns in a week sent all four to everyone,
    // having promised itself otherwise.
    //
    // Counted from the events table rather than a stored tally, so it cannot
    // disagree with the idempotency check about what actually went out. One
    // round-trip for the page, as with that check.
    const cap = resolveWeeklyCap(config.maxEmailsPerWeek);
    if (recipients.length > 0) {
      const counts: Array<{ subscriberId: string; count: number }> =
        await ctx.runQuery(internal.emailEvents.sentCountsSince, {
          subscriberIds: recipients.map((s: any) => s._id),
          since: Date.now() - ONE_WEEK_MS,
        });
      const sentThisWeek = new Map(
        counts.map((c) => [c.subscriberId, c.count])
      );
      const before = recipients.length;
      recipients = recipients.filter((s: any) =>
        withinWeeklyCap(sentThisWeek.get(s._id) ?? 0, cap)
      );
      const held = before - recipients.length;
      if (held > 0) {
        // Logged rather than silent: an owner who sees fewer sends than
        // subscribers deserves a reason that is findable.
        console.log(
          `[emailCampaigns] ${held} subscriber(s) held back by maxEmailsPerWeek=${cap}`
        );
      }
    }

    const sesClient = createSESClient();
    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    // Media stored without a CDN is a path on the storefront, not on Convex.
    const appUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const fromAddress = config.senderName
      ? `${config.senderName} <${config.fromEmail}>`
      : config.fromEmail;

    for (const subscriber of recipients) {
      try {
        // The wizard collects variants and checks their percentages sum to 100.
        // The send used `campaign.subject` for everyone, `campaign.variants`
        // was read by nothing, and `metadata.variantId` — a schema field that
        // exists for exactly this — was never written. An owner could run a
        // test whose two arms were the same email and read a result measuring
        // nothing.
        //
        // The arm is chosen deterministically from the two ids, because a send
        // now runs in batches that can be interrupted and retried: drawing at
        // random would let a retry send arm B to someone who already had arm A.
        const delivery = subjectFor(campaign, subscriber._id, args.campaignId);

        const unsubscribeUrl = `${siteUrl}/email/unsubscribe?id=${subscriber._id}`;

        const branding = {
          ...config.branding,
          senderName: config.senderName,
          unsubscribeUrl,
          unsubscribeText: config.unsubscribeText ?? "Se désabonner",
        };

        const html = renderTemplateToEmailHtml(template.blocks, branding, undefined, {
          siteUrl: appUrl,
        });

        const command = new SendEmailCommand({
          FromEmailAddress: fromAddress,
          Destination: { ToAddresses: [subscriber.email] },
          ReplyToAddresses: config.replyToEmail
            ? [config.replyToEmail]
            : undefined,
          ConfigurationSetName: "beindigital-email-tracking",
          Content: {
            Simple: {
              Subject: { Data: delivery.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: html, Charset: "UTF-8" },
                Text: {
                  Data: `Se désabonner: ${unsubscribeUrl}`,
                  Charset: "UTF-8",
                },
              },
              Headers: [
                { Name: "X-Campaign-Id", Value: String(args.campaignId) },
                { Name: "X-Subscriber-Id", Value: String(subscriber._id) },
                { Name: "X-Store-Id", Value: String(campaign.storeId) },
                // Gmail and Yahoo have required one-click unsubscribe from bulk
                // senders since February 2024. Without these two headers the
                // mail is filtered or refused outright — a deliverability
                // problem that looks exactly like "our campaigns get no opens".
                //
                // RFC 8058: the provider POSTs to the https URL with a body of
                // `List-Unsubscribe=One-Click` and no further interaction, which
                // is why `POST /email/unsubscribe` exists and takes no CSRF
                // token. The mailto is the fallback for clients that predate it.
                {
                  Name: "List-Unsubscribe",
                  Value: `<mailto:${config.replyToEmail ?? config.fromEmail}?subject=unsubscribe>, <${unsubscribeUrl}>`,
                },
                { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
              ],
            },
          },
        });

        await sesClient.send(command);

        // Recorded immediately after the send, so the idempotency check above
        // sees it even if this batch dies on the next subscriber.
        await ctx.runMutation(internal.emailEvents.create, {
          storeId: campaign.storeId,
          campaignId: args.campaignId,
          subscriberId: subscriber._id,
          type: "sent",
          occurredAt: Date.now(),
          // Which arm this address received. Without it a finished test has no
          // way to say which subject won.
          metadata: delivery.variantId
            ? { variantId: delivery.variantId }
            : undefined,
        });

        await ctx.runMutation(internal.emailCampaigns.incrementStats, {
          id: args.campaignId,
          field: "sent",
        });

        await delay(BATCH_DELAY_MS);
      } catch (error) {
        console.error(`Erreur envoi subscriber ${subscriber._id}:`, error);
      }
    }

    if (page.isDone) {
      await ctx.runMutation(internal.emailCampaigns.markSent, { id: args.campaignId });
      return;
    }

    await ctx.runMutation(internal.emailCampaigns.saveSendCursor, {
      id: args.campaignId,
      cursor: page.continueCursor,
    });

    await ctx.scheduler.runAfter(0, internal.emailCampaignActions.sendBatch, {
      campaignId: args.campaignId,
    });
  },
});

/**
 * Send a test email for preview purposes.
 * Prepends "[TEST]" to the subject line.
 */
// @guarded-inline: runs authHelpers.checkStorePermission before sending the test
export const sendTest = action({
  args: {
    campaignId: v.id("emailCampaigns"),
    testEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.testEmail)) {
      throw new Error("Adresse email invalide");
    }

    const campaign: any = await ctx.runQuery(api.emailCampaigns.getById, {
      id: args.campaignId,
    });
    if (!campaign) throw new Error("Campagne introuvable");

    // Verify store-level permission (actions don't have ctx.db)
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: campaign.storeId,
      permission: "marketing:write",
    });

    const template: any = await ctx.runQuery(api.emailTemplates.getById, {
      id: campaign.templateId,
    });
    if (!template) throw new Error("Modèle introuvable");

    const config: any = await ctx.runQuery(api.emailConfig.get, {
      storeId: campaign.storeId,
    });
    if (!config) throw new Error("Configuration email introuvable");

    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    // Media stored without a CDN is a path on the storefront, not on Convex.
    const appUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const branding = {
      ...config.branding,
      senderName: config.senderName,
      unsubscribeUrl: `${siteUrl}/email/unsubscribe?id=test`,
      unsubscribeText: config.unsubscribeText ?? "Se désabonner",
    };

    const html = renderTemplateToEmailHtml(template.blocks, branding, undefined, {
      siteUrl: appUrl,
    });

    const sesClient = createSESClient();
    const fromAddress = config.senderName
      ? `${config.senderName} <${config.fromEmail}>`
      : config.fromEmail;

    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: fromAddress,
        Destination: { ToAddresses: [args.testEmail] },
        ConfigurationSetName: "beindigital-email-tracking",
        Content: {
          Simple: {
            Subject: {
              Data: `[TEST] ${campaign.subject}`,
              Charset: "UTF-8",
            },
            Body: {
              Html: { Data: html, Charset: "UTF-8" },
              Text: {
                Data: `Email test pour: ${campaign.subject}`,
                Charset: "UTF-8",
              },
            },
          },
        },
      })
    );

    return { success: true };
  },
});
