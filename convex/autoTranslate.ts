/**
 * Auto-translation Convex functions
 *
 * Architecture (Convex constraint: a mutation may not call `fetch`):
 *   scheduleTranslation()      → helper called from catalogue mutations
 *   _getTranslationPlan        → internalQuery   (reads doc + store + languages)
 *   executeTranslation         → internalAction  (query → GPT → mutation)
 *   _saveDocumentTranslations  → internalMutation (writes translations + quota)
 *   _finishTranslation         → internalMutation (clears the pending flags)
 *
 * The batch path is the same three-way split, with the action re-scheduling
 * itself for the next chunk. The chaining lives here rather than in
 * `@be-in-digital/convex-functions` because it needs `internal.*`, which only
 * the app's generated API provides.
 */

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import * as defs from "@be-in-digital/convex-functions/autoTranslate";

const DEBOUNCE_MS = defs.DEBOUNCE_MS;

// ── Incremental translation: query → fetch → mutation ────────────────────

export const _getTranslationPlan = internalQuery(defs.getTranslationPlan);

export const _saveDocumentTranslations = internalMutation(
  defs.saveDocumentTranslations
);

export const _finishTranslation = internalMutation(defs.finishTranslation);

/**
 * Translate one catalogue document into every active language.
 *
 * Scheduled by `scheduleTranslation` after a debounce. An action, not a
 * mutation: it calls OpenAI, and Convex mutations cannot fetch.
 */
export const executeTranslation = internalAction({
  args: {
    documentId: v.string(),
    tableName: v.string(),
    storeId: v.id("stores"),
  },
  handler: async (ctx, args): Promise<void> => {
    const plan = await ctx.runQuery(internal.autoTranslate._getTranslationPlan, {
      documentId: args.documentId,
      tableName: args.tableName,
      storeId: args.storeId,
    });

    // Nothing to translate — but the document is still flagged pending, and
    // something has to clear it or the admin sees a spinner for ever.
    if (!plan) {
      await ctx.runMutation(internal.autoTranslate._finishTranslation, {
        documentId: args.documentId,
      });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[autoTranslate] OPENAI_API_KEY not set");
      await ctx.runMutation(internal.autoTranslate._finishTranslation, {
        documentId: args.documentId,
      });
      return;
    }

    const { results, gptCalls } = await defs.runTranslationPlan(plan, apiKey);

    await ctx.runMutation(internal.autoTranslate._saveDocumentTranslations, {
      documentId: args.documentId,
      storeId: args.storeId,
      sourceTexts: plan.sourceTexts,
      sourceHashes: plan.sourceHashes,
      results,
      gptCalls,
      quota: plan.quota,
      quotaWasReset: plan.quotaWasReset,
    });
  },
});

// ── Batch translation: query → fetch → mutation, chunk by chunk ──────────

export const _getBatchChunkPlan = internalQuery(defs.getBatchChunkPlan);

export const _saveBatchChunk = internalMutation(defs.saveBatchChunk);

export const _createBatchJob = internalMutation(defs.createBatchJob);

export const batchChunk = internalAction({
  args: {
    storeId: v.id("stores"),
    targetLang: v.string(),
    entityType: v.union(
      v.literal("products"),
      v.literal("categories"),
      v.literal("menus")
    ),
    cursor: v.optional(v.string()),
    jobId: v.optional(v.id("translationJobs")),
  },
  handler: async (ctx, args): Promise<void> => {
    const plan = await ctx.runQuery(internal.autoTranslate._getBatchChunkPlan, {
      storeId: args.storeId,
      targetLang: args.targetLang,
      entityType: args.entityType,
      ...(args.cursor === undefined ? {} : { cursor: args.cursor }),
    });

    if (!plan) return;

    const apiKey = process.env.OPENAI_API_KEY;
    const { results, attempted, gptCalls } = apiKey
      ? await defs.runBatchChunkPlan(
          plan,
          args.targetLang,
          `restaurant ${args.entityType}`,
          apiKey
        )
      : { results: [], attempted: 0, gptCalls: 0 };

    if (!apiKey) console.error("[autoTranslate] OPENAI_API_KEY not set");

    await ctx.runMutation(internal.autoTranslate._saveBatchChunk, {
      storeId: args.storeId,
      targetLang: args.targetLang,
      results,
      // Documents with nothing to translate — no text, already current, or
      // manually translated — never reach GPT but are still dealt with, so
      // the progress bar can reach the end.
      completed: attempted + plan.skippedCount,
      gptCalls,
      quotaResetAt: plan.quotaResetAt,
      isLastChunk: plan.nextCursor === null,
      quotaExhausted: plan.quotaExhausted,
      ...(args.jobId === undefined ? {} : { jobId: args.jobId }),
    });

    // A batch the budget stopped does not chunk on: the plan already reported
    // a null cursor for that case, and the job is marked failed with the
    // reason, so the owner sees why rather than a bar that stopped moving.
    if (plan.nextCursor !== null) {
      await ctx.scheduler.runAfter(0, internal.autoTranslate.batchChunk, {
        storeId: args.storeId,
        targetLang: args.targetLang,
        entityType: args.entityType,
        cursor: plan.nextCursor,
        ...(args.jobId === undefined ? {} : { jobId: args.jobId }),
      });
    }
  },
});

/**
 * Public action: translate an entire catalogue table into one language.
 *
 * This is what starts chunk 0 — the batch translator scheduled only itself
 * before, so a store that added a language after filling its catalogue had no
 * way of ever back-filling it.
 */
// @guarded-inline: checks translations:write on the storeId it is given
export const translateCatalogue = action({
  args: {
    storeId: v.id("stores"),
    targetLang: v.string(),
    entityType: v.union(
      v.literal("products"),
      v.literal("categories"),
      v.literal("menus")
    ),
  },
  handler: async (ctx, args): Promise<{ jobId: string; totalItems: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // The storeId is an argument, so it has to be matched against what the
    // caller may actually do there — being logged in is not the check.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: args.storeId,
      permission: "translations:write",
    });

    const job = await ctx.runMutation(internal.autoTranslate._createBatchJob, {
      storeId: args.storeId,
      targetLang: args.targetLang,
      entityType: args.entityType,
    });

    await ctx.scheduler.runAfter(0, internal.autoTranslate.batchChunk, {
      storeId: args.storeId,
      targetLang: args.targetLang,
      entityType: args.entityType,
      jobId: job.jobId as Id<"translationJobs">,
    });

    return job;
  },
});

export const resetDailyQuota = internalMutation(defs.resetDailyQuota);

// ── Helper: schedule translation with debounce ───────────────────────────

/** The catalogue tables that carry translatable text. */
type TranslatableId = Id<"products"> | Id<"categories"> | Id<"menus">;

/**
 * Schedule a translation for a document after a 5s debounce.
 *
 * Called from `products`, `categories` and `menus` on create and update. The
 * debounce is what makes a burst of edits cost one GPT call instead of five:
 * each call cancels the job the previous one booked.
 */
export async function scheduleTranslation(
  ctx: MutationCtx,
  documentId: string,
  tableName: string,
  storeId: string
) {
  const docId = documentId as TranslatableId;
  const doc = await ctx.db.get(docId);
  if (!doc) return;

  // Cancel the job the previous edit booked, if it has not fired yet.
  if (doc.scheduledTranslationJobId) {
    try {
      await ctx.scheduler.cancel(doc.scheduledTranslationJobId);
    } catch {
      // Job already executed or cancelled
    }
  }

  const jobId = await ctx.scheduler.runAfter(
    DEBOUNCE_MS,
    internal.autoTranslate.executeTranslation,
    {
      documentId,
      tableName,
      storeId: storeId as Id<"stores">,
    }
  );

  await ctx.db.patch(docId, {
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
