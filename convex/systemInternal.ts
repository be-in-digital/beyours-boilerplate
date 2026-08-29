import { internalQuery, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { Role } from "@be-in-digital/core/auth/rbac"
import {
  remapIds,
  splitExportedRow,
  type IdMap,
} from "@be-in-digital/convex-functions/backupRemap"

// ─── Allowlist of tables that can be imported/exported ───────────────────────

const ALLOWED_TABLES = [
  "globalSettings",
  "stores",
  "languages",
  "categories",
  "products",
  "menus",
  "cmsPages",
  "cmsBlocks",
  "cmsMedia",
  "blogCategories",
  "blogTags",
  "blogArticles",
  "blogArticleTags",
  "gameQRCodes",
  "requiredActions",
  "games",
  "prizes",
  "promotions",
  "emailConfig",
  "emailTemplates",
  "emailSegments",
  "emailSubscribers",
] as const

type AllowedTable = (typeof ALLOWED_TABLES)[number]

function assertAllowedTable(tableName: string): asserts tableName is AllowedTable {
  if (!(ALLOWED_TABLES as readonly string[]).includes(tableName)) {
    throw new Error(`Table "${tableName}" non autorisee pour import/export`)
  }
}

// ─── Internal Queries ────────────────────────────────────────────────────────

/** Resolve authenticated user profile — safe to call from actions via ctx.runQuery */
export const getAuthUserInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const profile = await ctx.db
      .query("userProfiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_userId", (q: any) => q.eq("userId", identity.subject))
      .unique()

    if (!profile) throw new Error("User profile not found")

    const role = Object.values(Role).includes(profile.role as Role)
      ? (profile.role as Role)
      : Role.CUSTOMER

    return {
      userId: identity.subject,
      role,
      storeIds: profile.storeIds ?? [],
      profileId: profile._id as string,
    }
  },
})

/** Get globalSettings for internal use (no auth) */
export const getSettingsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("globalSettings").first()
  },
})

/** Export all rows from a given table */
export const exportTable = internalQuery({
  args: { tableName: v.string() },
  handler: async (ctx, args) => {
    assertAllowedTable(args.tableName)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (ctx.db.query(args.tableName as never) as any).collect()
    return rows
  },
})

// ─── Internal Mutations ──────────────────────────────────────────────────────

/**
 * Import rows into a table — clears existing data, then inserts.
 *
 * Convex will not let an insert choose its `_id`, so every restored row comes
 * back under a new one. That used to end the story: `stores` came back with new
 * ids while the products, menus, CMS pages and promotions restored after them
 * came back carrying the **old** `storeId`, and `v.id("stores")` waved it
 * through because it validates an id's encoding, not that it resolves. The
 * deployment came up with every catalogue detached from its establishment, and
 * `userProfiles.storeIds` naming stores that no longer existed — so the owner
 * was locked out of everything. Silently, and irreversibly.
 *
 * `idMap` carries `old id → new id` from the tables already imported, and every
 * id inside a row is rewritten through it before the insert. The caller passes
 * back what this returns, which is why `system.importBackup` walks the tables in
 * dependency order: a reference can only be rewritten once its target has been
 * inserted.
 *
 * References the map cannot resolve — a table never exported, or a row deleted
 * before the backup was taken — are left as they are. `backupRemap` explains
 * why they are not counted: there is no portable way to tell a reference from
 * an ordinary string, and the restore says plainly what a backup does not carry
 * instead of reporting a number that would be zero in exactly the case it
 * exists to catch.
 */
export const importTable = internalMutation({
  args: {
    tableName: v.string(),
    rows: v.array(v.any()),
    idMap: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    assertAllowedTable(args.tableName)

    const idMap: IdMap = args.idMap ?? {}

    // 1. Delete all existing rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (ctx.db.query(args.tableName as never) as any).collect()
    for (const row of existing) {
      await ctx.db.delete(row._id)
    }

    // 2. Insert new rows: strip Convex system fields, rewrite every id the map
    //    knows, and record what this table's own rows became.
    const inserted: IdMap = {}
    for (const row of args.rows) {
      const { oldId, data } = splitExportedRow(row)
      const newId = await (ctx.db as never as {
        insert: (table: string, doc: Record<string, unknown>) => Promise<string>
      }).insert(args.tableName, remapIds(data, idMap))
      if (oldId) inserted[oldId] = newId
    }

    return { idMap: inserted }
  },
})

/**
 * Re-point the profiles at the establishments they came back as.
 *
 * `userProfiles` is not exported — it holds identities, not restaurant data —
 * so a restore cannot replace it. But its `storeIds` name the stores of the
 * deployment *before* the restore, and after one those ids resolve to nothing:
 * every store-scoped screen refuses the owner, and `profileProvisioning` will
 * not hand them their own profile back. Rewriting the list in place is the one
 * thing that keeps a restore from locking out the person who ran it.
 *
 * Ids the map does not know are dropped rather than kept: they name stores the
 * backup did not contain, which after this import do not exist.
 */
export const remapProfileStores = internalMutation({
  args: { idMap: v.record(v.string(), v.string()) },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("userProfiles").collect()
    let updated = 0
    let dropped = 0

    for (const profile of profiles) {
      const before = profile.storeIds ?? []
      if (before.length === 0) continue

      const after = before
        .map((id) => args.idMap[id as unknown as string])
        .filter((id): id is string => typeof id === "string")

      dropped += before.length - after.length
      if (after.length === before.length && after.every((id, i) => id === (before[i] as unknown as string))) {
        continue
      }

      await ctx.db.patch(profile._id, {
        storeIds: after as unknown as typeof before,
        updatedAt: Date.now(),
      })
      updated++
    }

    return { updated, dropped }
  },
})
