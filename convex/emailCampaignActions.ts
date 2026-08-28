"use node";
/* eslint-disable @typescript-eslint/no-explicit-any -- Convex action ctx.runQuery returns untyped results */

import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api as _api, internal as _internal } from "./_generated/api";
import { v } from "convex/values";

// Email modules not yet in codegen — will resolve after `convex dev` regenerates types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = _api as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  buildSegmentFilter,
  renderTemplateToEmailHtml,
} from "@be-in-digital/marketing";

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

/**
 * Send a campaign to all matching subscribers.
 *
 * Flow:
 *  1. Load campaign, template, emailConfig
 *  2. Fetch active subscribers (optionally filtered by segment)
 *  3. Mark campaign as "sending"
 *  4. For each subscriber: render HTML, send via SES, record event, increment stats
 *  5. Mark campaign as "sent"
 *
 * Custom SES headers (X-Campaign-Id, X-Subscriber-Id, X-Store-Id) are added
 * to each email for correlation in the SES webhook handler.
 *
 * NOTE: For large campaigns (5 000+), consider scheduling batches via ctx.scheduler.
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

    // 2. Get active subscribers (optionally filtered by segment)
    let subscribers: any[] = await ctx.runQuery(api.emailSubscribers.list, {
      storeId: campaign.storeId,
      status: "active",
    });

    if (campaign.segmentId) {
      const segment: any = await ctx.runQuery(api.emailSegments.getById, {
        id: campaign.segmentId,
      });
      if (segment) {
        const predicate = buildSegmentFilter(segment.rules, segment.ruleOperator);
        subscribers = subscribers.filter((s: any) => predicate(s));
      }
    }

    if (subscribers.length === 0) {
      throw new Error("Aucun abonné actif trouvé pour cette campagne");
    }

    // 3. Mark campaign as sending
    await ctx.runMutation(internal.emailCampaigns.markSending, {
      id: args.campaignId,
    });

    // 4. Send emails
    const sesClient = createSESClient();
    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    // Media stored without a CDN is a path on the storefront, not on Convex.
    const appUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const fromAddress = config.senderName
      ? `${config.senderName} <${config.fromEmail}>`
      : config.fromEmail;

    let sentCount = 0;

    for (const subscriber of subscribers) {
      try {
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
              Subject: { Data: campaign.subject, Charset: "UTF-8" },
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
              ],
            },
          },
        });

        await sesClient.send(command);
        sentCount++;

        // Record "sent" event + increment campaign stat
        await ctx.runMutation(internal.emailEvents.create, {
          storeId: campaign.storeId,
          campaignId: args.campaignId,
          subscriberId: subscriber._id,
          type: "sent",
          occurredAt: Date.now(),
        });

        await ctx.runMutation(internal.emailCampaigns.incrementStats, {
          id: args.campaignId,
          field: "sent",
        });

        // Rate limiting between sends
        await delay(BATCH_DELAY_MS);
      } catch (error) {
        console.error(`Erreur envoi subscriber ${subscriber._id}:`, error);
      }
    }

    // 5. Mark campaign as sent
    await ctx.runMutation(internal.emailCampaigns.markSent, {
      id: args.campaignId,
    });

    return { sent: sentCount, total: subscribers.length };
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
