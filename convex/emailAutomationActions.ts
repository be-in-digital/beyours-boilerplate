"use node";
/* eslint-disable @typescript-eslint/no-explicit-any -- ctx.runQuery returns untyped results */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { renderTemplateToEmailHtml } from "@be-in-digital/marketing";
import {
  DEFAULT_INACTIVE_AFTER_DAYS,
  canDispatch,
  delayForStep,
  isLapsed,
  nextStep,
  occurrenceFor,
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
    /** Which firing this is; see `occurrenceFor`. Absent for a welcome. */
    occurrenceKey: v.optional(v.string()),
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
    const config: any = await ctx.runQuery(internal.emailConfig.getInternal, {
      storeId: automation.storeId,
    });

    // Re-checked on every step, not just at the trigger: an owner who pauses an
    // automation — or turns its settings toggle off — means the sequence stops,
    // including the steps already scheduled days out.
    if (!canDispatch(automation, config?.automationSettings)) return;

    const subscriber: any = await ctx.runQuery(
      internal.emailSubscribers.getByIdInternal,
      { id: args.subscriberId }
    );
    // Someone who has unsubscribed, bounced or complained since the trigger
    // must not receive the rest of a sequence they are no longer part of.
    if (!subscriber || subscriber.status !== "active") return;

    const sent: string[] = await ctx.runQuery(
      internal.emailAutomationRuns.stepsSentTo,
      {
        automationId: args.automationId,
        subscriberId: args.subscriberId,
        occurrenceKey: args.occurrenceKey,
      }
    );

    const step = nextStep(automation.steps, sent);
    if (!step) return;

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
      occurrenceKey: args.occurrenceKey,
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
        occurrenceKey: args.occurrenceKey,
      }
    );
  },
});

/**
 * Start every active automation on `trigger` for one subscriber.
 *
 * The generalisation of what `startWelcome` did for one trigger. Each firing
 * carries an occurrence key so the same automation can run again where that
 * makes sense — see `occurrenceFor`.
 */
async function startTrigger(
  ctx: any,
  args: {
    storeId: string;
    subscriberId: string;
    trigger: "welcome" | "post_order" | "inactive";
    context: { orderId?: string; lastOrderAt?: number };
  }
): Promise<number> {
  const [automations, config]: [any[], any] = await Promise.all([
    ctx.runQuery(internal.emailAutomations.listActiveInternal, {
      storeId: args.storeId,
    }),
    ctx.runQuery(internal.emailConfig.getInternal, { storeId: args.storeId }),
  ]);

  const triggeredAt = Date.now();
  let started = 0;

  for (const automation of automations) {
    if (automation.trigger !== args.trigger) continue;
    // The settings toggle is consulted here, which is the whole reason it
    // exists: turning "Post-commande" off has to stop the mail, not just store
    // a boolean.
    if (!canDispatch(automation, config?.automationSettings)) continue;

    const first = automation.steps[0];
    if (!first) continue;

    await ctx.scheduler.runAfter(
      delayForStep(first, triggeredAt, triggeredAt),
      internal.emailAutomationActions.runStep,
      {
        automationId: automation._id,
        subscriberId: args.subscriberId,
        triggeredAt,
        occurrenceKey: occurrenceFor(args.trigger, args.context),
      }
    );
    started += 1;
  }

  return started;
}

/**
 * Start every `welcome` automation this store has active.
 *
 * Called when a subscriber confirms their double opt-in.
 */
export const startWelcome = internalAction({
  args: {
    storeId: v.id("stores"),
    subscriberId: v.id("emailSubscribers"),
  },
  handler: async (ctx, args): Promise<void> => {
    await startTrigger(ctx, {
      storeId: args.storeId,
      subscriberId: args.subscriberId,
      trigger: "welcome",
      context: {},
    });
  },
});

/**
 * Start every `post_order` automation, for one confirmed order.
 *
 * Called from the order-confirmation seam, beside the write that records the
 * order against the subscriber. The order's id is the occurrence, so a
 * thank-you follows every order rather than only the first one a customer ever
 * placed.
 */
export const startPostOrder = internalAction({
  args: {
    storeId: v.id("stores"),
    subscriberId: v.id("emailSubscribers"),
    orderId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await startTrigger(ctx, {
      storeId: args.storeId,
      subscriberId: args.subscriberId,
      trigger: "post_order",
      context: { orderId: args.orderId },
    });
  },
});

/**
 * Find the customers who have gone quiet, and start the win-back.
 *
 * Runs daily from `crons.ts`. Walks the active subscribers of every store that
 * has an `inactive` automation, rather than every subscriber in the
 * deployment — a restaurant with no such automation costs nothing.
 *
 * Someone who has never ordered is never lapsed: "come back, we miss you" to a
 * person who has never been is how a sender gets reported.
 */
export const sweepInactive = internalAction({
  args: {},
  handler: async (ctx): Promise<{ started: number }> => {
    const automations: any[] = await ctx.runQuery(
      internal.emailAutomations.listActiveByTriggerInternal,
      { trigger: "inactive" }
    );

    const now = Date.now();
    let started = 0;

    // One pass per store, not per automation: two win-backs on one restaurant
    // would otherwise read the whole subscriber list twice.
    const byStore = new Map<string, any[]>();
    for (const automation of automations) {
      const list = byStore.get(automation.storeId) ?? [];
      list.push(automation);
      byStore.set(automation.storeId, list);
    }

    for (const [storeId, storeAutomations] of byStore) {
      const config: any = await ctx.runQuery(internal.emailConfig.getInternal, {
        storeId: storeId as never,
      });

      let cursor: string | null = null;
      for (;;) {
        const page: any = await ctx.runQuery(
          internal.emailSubscribers.pageForSending,
          { storeId: storeId as never, cursor, numItems: 100 }
        );

        for (const automation of storeAutomations) {
          if (!canDispatch(automation, config?.automationSettings)) continue;
          const afterDays =
            automation.inactiveAfterDays ?? DEFAULT_INACTIVE_AFTER_DAYS;

          for (const subscriber of page.page) {
            if (!isLapsed(subscriber, afterDays, now)) continue;

            await ctx.scheduler.runAfter(
              delayForStep(automation.steps[0], now, now),
              internal.emailAutomationActions.runStep,
              {
                automationId: automation._id,
                subscriberId: subscriber._id,
                triggeredAt: now,
                occurrenceKey: occurrenceFor("inactive", {
                  lastOrderAt: subscriber.metadata?.lastOrderAt,
                }),
              }
            );
            started += 1;
          }
        }

        if (page.isDone) break;
        cursor = page.continueCursor;
      }
    }

    if (started > 0) {
      console.log(`[emailAutomations] win-back started for ${started} subscriber(s)`);
    }
    return { started };
  },
});
