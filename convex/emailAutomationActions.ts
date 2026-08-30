"use node";
/* eslint-disable @typescript-eslint/no-explicit-any -- ctx.runQuery returns untyped results */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { renderTemplateToEmailHtml } from "@be-in-digital/marketing";
import {
  canDispatch,
  delayForStep,
  nextStep,
} from "@be-in-digital/convex-functions/automationDispatch";

function createSESClient() {
  return new SESv2Client({
    region: process.env.AWS_REGION ?? "eu-west-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Send one step of an automation to one subscriber, then schedule the next.
 *
 * `emailAutomations` was CRUD and nothing else: an owner could build a
 * sequence, set the delays, activate it, and switch on five toggles in the
 * settings screen, and no code anywhere dispatched on a trigger. This is the
 * half that was missing.
 *
 * The shape mirrors the campaign batches for the same reasons — bounded work
 * per invocation, and a record written after each send so nothing is delivered
 * twice — but the unit here is one subscriber rather than one page, because an
 * automation reaches people one at a time as they trigger it.
 */
export const runStep = internalAction({
  args: {
    automationId: v.id("emailAutomations"),
    subscriberId: v.id("emailSubscribers"),
    /** When the trigger fired. Delays are measured from here, not from now. */
    triggeredAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const automation: any = await ctx.runQuery(
      internal.emailAutomations.getByIdInternal,
      { id: args.automationId }
    );
    if (!automation) return;

    // Re-checked on every step, not just at the trigger: an owner who pauses an
    // automation means the sequence stops, including the steps already
    // scheduled days out.
    if (!canDispatch(automation)) return;

    const subscriber: any = await ctx.runQuery(
      internal.emailSubscribers.getByIdInternal,
      { id: args.subscriberId }
    );
    // Someone who has unsubscribed, bounced or complained since the trigger
    // must not receive the rest of a sequence they are no longer part of.
    if (!subscriber || subscriber.status !== "active") return;

    const sent: string[] = await ctx.runQuery(
      internal.emailAutomationRuns.stepsSentTo,
      { automationId: args.automationId, subscriberId: args.subscriberId }
    );

    const step = nextStep(automation.steps, sent);
    if (!step) return;

    const config: any = await ctx.runQuery(internal.emailConfig.getInternal, {
      storeId: automation.storeId,
    });
    const template: any = await ctx.runQuery(
      internal.emailTemplates.getByIdInternal,
      // `AutomationStep` is a plain shape in @be-in-digital/convex-functions,
      // deliberately unaware of any schema, so it types this as a string. The
      // column it comes from is `v.id("emailTemplates")`, so the value is an
      // id; the cast is the boundary between the two views, not a guess.
      { id: step.templateId as Id<"emailTemplates"> }
    );
    if (!config || !template) {
      console.error(
        `[emailAutomations] config or template missing for ${automation.name}`
      );
      return;
    }

    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    const appUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const unsubscribeUrl = `${siteUrl}/email/unsubscribe?id=${args.subscriberId}`;

    const html = renderTemplateToEmailHtml(
      template.blocks,
      {
        ...config.branding,
        senderName: config.senderName,
        unsubscribeUrl,
        unsubscribeText: config.unsubscribeText ?? "Se désabonner",
      },
      undefined,
      { siteUrl: appUrl }
    );

    try {
      await createSESClient().send(
        new SendEmailCommand({
          FromEmailAddress: config.senderName
            ? `${config.senderName} <${config.fromEmail}>`
            : config.fromEmail,
          Destination: { ToAddresses: [subscriber.email] },
          ReplyToAddresses: config.replyToEmail ? [config.replyToEmail] : undefined,
          ConfigurationSetName: "beindigital-email-tracking",
          Content: {
            Simple: {
              Subject: { Data: template.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: html, Charset: "UTF-8" },
                Text: { Data: `Se désabonner: ${unsubscribeUrl}`, Charset: "UTF-8" },
              },
              Headers: [
                { Name: "X-Automation-Id", Value: String(args.automationId) },
                { Name: "X-Subscriber-Id", Value: String(args.subscriberId) },
                { Name: "X-Store-Id", Value: String(automation.storeId) },
                // Same obligation as a campaign: this is bulk mail as far as
                // Gmail and Yahoo are concerned. See emailCampaignActions.
                {
                  Name: "List-Unsubscribe",
                  Value: `<mailto:${config.replyToEmail ?? config.fromEmail}?subject=unsubscribe>, <${unsubscribeUrl}>`,
                },
                { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
              ],
            },
          },
        })
      );
    } catch (error) {
      // Not recorded, so the step can be retried. Recording a send that failed
      // would drop the message from the sequence for good.
      console.error(`[emailAutomations] step ${step.id} failed:`, error);
      return;
    }

    await ctx.runMutation(internal.emailAutomationRuns.record, {
      automationId: args.automationId,
      subscriberId: args.subscriberId,
      storeId: automation.storeId,
      stepId: step.id,
    });

    await ctx.runMutation(internal.emailAutomations.incrementStats, {
      id: args.automationId,
      field: "sent",
    });

    const following = nextStep(automation.steps, [...sent, step.id]);
    if (!following) return;

    await ctx.scheduler.runAfter(
      delayForStep(following, args.triggeredAt, Date.now()),
      internal.emailAutomationActions.runStep,
      {
        automationId: args.automationId,
        subscriberId: args.subscriberId,
        triggeredAt: args.triggeredAt,
      }
    );
  },
});

/**
 * Start every `welcome` automation this store has active.
 *
 * Called when a subscriber confirms their double opt-in — the one trigger the
 * current schema can actually detect. The other four are declared unready in
 * `automationDispatch`, with the missing piece named for each.
 */
export const startWelcome = internalAction({
  args: {
    storeId: v.id("stores"),
    subscriberId: v.id("emailSubscribers"),
  },
  handler: async (ctx, args): Promise<void> => {
    const automations: any[] = await ctx.runQuery(
      internal.emailAutomations.listActiveInternal,
      { storeId: args.storeId }
    );

    const triggeredAt = Date.now();
    for (const automation of automations) {
      if (automation.trigger !== "welcome") continue;
      if (!canDispatch(automation)) continue;

      const first = automation.steps[0];
      if (!first) continue;

      await ctx.scheduler.runAfter(
        delayForStep(first, triggeredAt, triggeredAt),
        internal.emailAutomationActions.runStep,
        {
          automationId: automation._id,
          subscriberId: args.subscriberId,
          triggeredAt,
        }
      );
    }
  },
});
