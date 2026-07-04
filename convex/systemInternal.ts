import { internalQuery, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { Role } from "@be-in-digital/core/auth/rbac"

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

/** Import rows into a table — clears existing data, then inserts */
export const importTable = internalMutation({
  args: {
    tableName: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertAllowedTable(args.tableName)

    // 1. Delete all existing rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (ctx.db.query(args.tableName as never) as any).collect()
    for (const row of existing) {
      await ctx.db.delete(row._id)
    }

    // 2. Insert new rows (strip Convex system fields)
    for (const row of args.rows) {
      const { _id, _creationTime, ...data } = row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ctx.db as any).insert(args.tableName, data)
    }
  },
})
