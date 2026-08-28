/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auto-translation Convex functions
 *
 * Internal mutations/actions for automatic GPT translation.
 * scheduleTranslation() is a helper called from product/category mutations.
 */

import { action, internalAction, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import * as defs from "@be-in-digital/convex-functions/autoTranslate";

const DEBOUNCE_MS = defs.DEBOUNCE_MS;

// ── Internal mutations ───────────────────────────────────────────────────

export const executeTranslation = internalMutation(defs.executeTranslation);

export const batchChunk = internalMutation({
  args: defs.batchChunkCore.args,
  handler: async (ctx, args) => {
    const nextCursor = await defs.batchChunkCore.handler(ctx, args);

    // Schedule next chunk if more documents remain
    if (nextCursor !== null) {
      await ctx.scheduler.runAfter(0, internal.autoTranslate.batchChunk, {
        storeId: args.storeId,
        targetLang: args.targetLang,
        entityType: args.entityType,
        cursor: nextCursor,
        jobId: args.jobId,
      });
    }
  },
});

export const resetDailyQuota = internalMutation(defs.resetDailyQuota);

// ── Helper: schedule translation with debounce ───────────────────────────

/**
 * Schedule a translation for a document after a 5s debounce.
 * Cancel any previously scheduled job for this document.
 *
 * Call this from product/category/menu mutations:
 *   await scheduleTranslation(ctx, result, "products", args.storeId)
 */
export async function scheduleTranslation(
  ctx: MutationCtx,
  documentId: string,
  tableName: string,
  storeId: string
) {
  type TranslatableId = Id<"products"> | Id<"categories"> | Id<"menus">;
  const docId = documentId as TranslatableId;
  const doc = await ctx.db.get(docId);
  if (!doc) return;

  // Cancel previous scheduled job
  const existingJobId = (doc as Record<string, unknown>).scheduledTranslationJobId;
  if (existingJobId) {
    try {
      await ctx.scheduler.cancel(existingJobId as Id<"_scheduled_functions">);
    } catch {
      // Job already executed or cancelled
    }
  }

  // Schedule new translation after debounce
  const jobId = await ctx.scheduler.runAfter(
    DEBOUNCE_MS,
    internal.autoTranslate.executeTranslation,
    {
      documentId,
      tableName,
      storeId: storeId as Id<"stores">,
    }
  );

  // Mark document as pending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fields exist in schema but union type doesn't expose them
  await (ctx.db as any).patch(docId, {
    scheduledTranslationJobId: jobId,
    pendingTranslation: true,
  });
}

// ── UI Strings bulk translation ──────────────────────────────────────────

// Internal action: calls GPT (fetch only, no DB)
export const translateUIBulkAction = internalAction(defs.translateUIBulkAction);

// Internal mutation: writes translated strings to DB
export const saveUITranslations = internalMutation(defs.saveUITranslations);

/**
 * Public action: translate all UI strings for a target language.
 * Orchestrates: GPT fetch (action) → DB write (mutation).
 * Called from the admin languages page.
 */
// @guarded-inline: checks translations:write on the storeId it is given
export const translateUIStrings = action({
  args: {
    storeId: v.id("stores"),
    targetLang: v.string(),
    sourceLang: v.optional(v.string()),
    entries: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args): Promise<{ translated: number; saved: number }> => {
    // Auth check — prevent unauthenticated API cost exploitation
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Being logged in was the whole check: any customer account of any
    // restaurant reached this. The storeId is an argument, so it has to be
    // matched against what the caller may actually do there.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: args.storeId,
      permission: "translations:write",
    });

    const sourceLang = args.sourceLang ?? "fr";

    // 1. Translate via GPT (action can fetch)
    const translated = (await ctx.runAction(
      internal.autoTranslate.translateUIBulkAction,
      {
        targetLang: args.targetLang,
        sourceLang,
        entries: args.entries,
      }
    )) as Record<string, string>;

    // 2. Write to DB (via internal mutation)
    const result = (await ctx.runMutation(
      internal.autoTranslate.saveUITranslations,
      {
        storeId: args.storeId,
        targetLang: args.targetLang,
        translated,
      }
    )) as { saved: number };

    return { translated: Object.keys(translated).length, saved: result.saved };
  },
});
