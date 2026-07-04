import { query, mutation, action, internalMutation, type QueryCtx, type MutationCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { getAuthUser } from "@be-in-digital/convex-functions/auth"
import { hasPermission, type Permission, type Role } from "@be-in-digital/core/auth/rbac"
import { migrations } from "./migrations/index"

// Type returned by systemInternal.getAuthUserInternal
interface ActionAuthUser {
  userId: string
  role: Role
  storeIds: string[]
  profileId: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const LOCK_DURATION_MS = 10 * 60 * 1000 // 10 minutes
const BACKUP_FORMAT_VERSION = "1.0.0"

const PERM_SYSTEM_READ = "system:read" as Permission
const PERM_SYSTEM_BACKUP = "system:backup" as Permission
const PERM_SYSTEM_RESTORE = "system:restore" as Permission
const PERM_SYSTEM_MIGRATE = "system:migrate" as Permission

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function requireSystemPermission(ctx: QueryCtx | MutationCtx, permission: Permission) {
  const user = await getAuthUser(ctx)
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Permission "${permission}" requise`)
  }
  return user
}

async function getSettings(ctx: QueryCtx | MutationCtx) {
  return ctx.db.query("globalSettings").first()
}

function isLockActive(lock: { expiresAt: number } | undefined | null): boolean {
  if (!lock) return false
  return lock.expiresAt > Date.now()
}

// ─── Queries ────────────────────────────────────────────────────────────────────

/** Get system info: version snapshot, lock status, migrations, last backup */
export const getSystemInfo = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx)
    if (!hasPermission(user.role, PERM_SYSTEM_READ)) {
      throw new Error('Permission "system:read" requise')
    }

    const settings = await getSettings(ctx)

    return {
      deployedAppVersion: settings?.deployedAppVersion ?? null,
      backupFormatVersion: settings?.backupFormatVersion ?? BACKUP_FORMAT_VERSION,
      appliedMigrations: settings?.appliedMigrations ?? [],
      systemLock: settings?.systemLock ?? null,
      isLockActive: isLockActive(settings?.systemLock),
      lastBackupAt: settings?.lastBackupAt ?? null,
    }
  },
})

/** Get paginated audit log */
export const getAuditLog = query({
  args: {
    paginationOpts: v.object({
      cursor: v.union(v.string(), v.null()),
      numItems: v.number(),
    }),
    filterAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    if (!hasPermission(user.role, PERM_SYSTEM_READ)) {
      throw new Error('Permission "system:read" requise')
    }

    const numItems = Math.min(args.paginationOpts.numItems, 100)
    const { cursor } = args.paginationOpts

    // Use the appropriate index depending on whether we filter by action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any
    if (args.filterAction) {
      q = ctx.db.query("systemAuditLog")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_action", (q: any) => q.eq("action", args.filterAction))
        .order("desc")
    } else {
      q = ctx.db.query("systemAuditLog")
        .withIndex("by_performedAt")
        .order("desc")
    }

    // Bounded fetch: take one extra to determine if there's a next page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await q.take(numItems + 1)

    // If a cursor was provided, skip entries up to and including the cursor
    let startIndex = 0
    if (cursor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cursorIndex = results.findIndex((r: any) => r._id === cursor)
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0
    }

    const sliced = results.slice(startIndex)
    const page = sliced.slice(0, numItems)
    const hasMore = sliced.length > numItems
    const nextCursor = hasMore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (page[page.length - 1] as any)?._id ?? null
      : null

    return {
      page,
      continueCursor: nextCursor,
      isDone: !hasMore,
    }
  },
})

// ─── Internal mutations ─────────────────────────────────────────────────────────

export const _recordAuditEntry = internalMutation({
  args: {
    action: v.union(
      v.literal("backup_export"),
      v.literal("backup_import"),
      v.literal("backup_import_dryrun"),
      v.literal("migration_run"),
      v.literal("version_check"),
      v.literal("lock_force_release"),
    ),
    performedBy: v.string(),
    details: v.optional(v.string()),
    result: v.union(v.literal("success"), v.literal("failure")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("systemAuditLog", {
      ...args,
      performedAt: Date.now(),
    })
  },
})

export const _acquireSystemLock = internalMutation({
  args: {
    operation: v.string(),
    lockedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Parametres globaux introuvables")

    if (isLockActive(settings.systemLock)) {
      throw new Error(
        `Systeme verrouille par "${settings.systemLock!.lockedBy}" ` +
        `pour "${settings.systemLock!.operation}". ` +
        `Expire a ${new Date(settings.systemLock!.expiresAt).toLocaleString()}`
      )
    }

    await ctx.db.patch(settings._id, {
      systemLock: {
        operation: args.operation,
        lockedBy: args.lockedBy,
        lockedAt: Date.now(),
        expiresAt: Date.now() + LOCK_DURATION_MS,
      },
    })
  },
})

export const _releaseSystemLock = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx)
    if (!settings) return
    await ctx.db.patch(settings._id, { systemLock: undefined })
  },
})

export const _syncAppVersion = internalMutation({
  args: { version: v.string() },
  handler: async (ctx, args) => {
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Parametres globaux introuvables")
    await ctx.db.patch(settings._id, {
      deployedAppVersion: args.version,
      updatedAt: Date.now(),
    })
  },
})

export const _setLastBackupAt = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Parametres globaux introuvables")
    await ctx.db.patch(settings._id, {
      lastBackupAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const _addAppliedMigration = internalMutation({
  args: {
    id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await getSettings(ctx)
    if (!settings) return
    const current = settings.appliedMigrations ?? []
    await ctx.db.patch(settings._id, {
      appliedMigrations: [...current, {
        id: args.id,
        name: args.name,
        appliedAt: Date.now(),
      }],
      updatedAt: Date.now(),
    })
  },
})

// ─── Mutations ──────────────────────────────────────────────────────────────────

/** Force release system lock (owner/admin only) */
export const forceReleaseLock = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireSystemPermission(ctx, PERM_SYSTEM_RESTORE)
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Parametres globaux introuvables")

    await ctx.db.patch(settings._id, { systemLock: undefined })
    // Note: writing directly to systemAuditLog here is intentional —
    // mutations cannot call internalMutations, so we insert directly
    // instead of going through _recordAuditEntry.
    await ctx.db.insert("systemAuditLog", {
      action: "lock_force_release",
      performedBy: user.userId,
      performedAt: Date.now(),
      result: "success",
    })
  },
})

/** Sync runtime version to DB snapshot */
export const syncVersion = mutation({
  args: { version: v.string() },
  handler: async (ctx, args) => {
    await requireSystemPermission(ctx, PERM_SYSTEM_READ)
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Parametres globaux introuvables")

    await ctx.db.patch(settings._id, {
      deployedAppVersion: args.version,
      updatedAt: Date.now(),
    })
  },
})

// ─── Actions ────────────────────────────────────────────────────────────────────

/** Check for available updates via npm registry */
export const checkForUpdates = action({
  args: { currentVersion: v.string() },
  handler: async (ctx, args) => {
    const user: ActionAuthUser = await ctx.runQuery(internal.systemInternal.getAuthUserInternal, {})
    if (!hasPermission(user.role, PERM_SYSTEM_READ)) {
      throw new Error('Permission "system:read" requise')
    }

    try {
      const res = await fetch(
        "https://registry.npmjs.org/@be-in-digital/restaurant-theme/latest",
        { headers: { Accept: "application/json" } }
      )

      let latestVersion = args.currentVersion
      let hasUpdate = false

      if (res.ok) {
        const data = await res.json()
        latestVersion = data.version ?? args.currentVersion
        hasUpdate = latestVersion !== args.currentVersion
      }

      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "version_check",
        performedBy: user.userId,
        result: "success",
        details: JSON.stringify({
          currentVersion: args.currentVersion,
          latestVersion,
          hasUpdate,
        }),
      })

      return { currentVersion: args.currentVersion, latestVersion, hasUpdate }
    } catch (error) {
      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "version_check",
        performedBy: user.userId,
        result: "failure",
        errorMessage: error instanceof Error ? error.message : String(error),
      })

      return {
        currentVersion: args.currentVersion,
        latestVersion: args.currentVersion,
        hasUpdate: false,
      }
    }
  },
})

/** Export a full backup as JSON */
export const exportBackup = action({
  args: {},
  handler: async (ctx) => {
    const user: ActionAuthUser = await ctx.runQuery(internal.systemInternal.getAuthUserInternal, {})
    if (!hasPermission(user.role, PERM_SYSTEM_BACKUP)) {
      throw new Error('Permission "system:backup" requise')
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings: any = await ctx.runQuery(internal.systemInternal.getSettingsInternal, {})

      // Deterministic table export order (respects dependencies)
      const tableNames = [
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any[]> = {}
      const tableSummary: Record<string, number> = {}

      for (const tableName of tableNames) {
        const rows = await ctx.runQuery(internal.systemInternal.exportTable, {
          tableName,
        })
        data[tableName] = rows
        tableSummary[tableName] = rows.length
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manifest: Record<string, any> = {
        createdAt: Date.now(),
        deployedAppVersion: settings?.deployedAppVersion ?? "unknown",
        backupFormatVersion: BACKUP_FORMAT_VERSION,
        exportedBy: user.userId,
        tables: Object.keys(data),
        tableRowCounts: tableSummary,
        note: "Images S3 non incluses — seules les references/URLs sont sauvegardees",
      }

      await ctx.runMutation(internal.system._setLastBackupAt, {})
      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "backup_export",
        performedBy: user.userId,
        result: "success",
        details: JSON.stringify({ tables: Object.keys(tableSummary), totalRows: Object.values(tableSummary).reduce((a, b) => a + b, 0) }),
      })

      return { manifest, data }
    } catch (error) {
      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "backup_export",
        performedBy: user.userId,
        result: "failure",
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

/** Import backup — dry run mode by default */
export const importBackup = action({
  args: {
    manifest: v.any(),
    data: v.any(),
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user: ActionAuthUser = await ctx.runQuery(internal.systemInternal.getAuthUserInternal, {})
    if (!hasPermission(user.role, PERM_SYSTEM_RESTORE)) {
      throw new Error('Permission "system:restore" requise')
    }

    // Validate manifest
    const { manifest, data } = args
    if (!manifest?.backupFormatVersion || !manifest?.tables) {
      throw new Error("Manifest invalide : backupFormatVersion et tables requis")
    }
    if (manifest.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
      throw new Error(
        `Version de backup incompatible : ${manifest.backupFormatVersion} (attendu : ${BACKUP_FORMAT_VERSION})`
      )
    }

    // Validate data structure
    if (typeof data !== "object" || data === null) {
      throw new Error("Donnees de backup invalides")
    }
    for (const table of manifest.tables) {
      if (data[table] !== undefined && !Array.isArray(data[table])) {
        throw new Error(`Table "${table}" invalide : tableau attendu`)
      }
    }

    // Build summary
    const summary: Record<string, number> = {}
    for (const table of manifest.tables) {
      summary[table] = Array.isArray(data[table]) ? data[table].length : 0
    }

    if (args.dryRun) {
      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "backup_import_dryrun",
        performedBy: user.userId,
        result: "success",
        details: JSON.stringify({ tables: summary }),
      })

      return {
        dryRun: true,
        summary,
        totalRows: Object.values(summary).reduce((a, b) => a + b, 0),
        message: "Mode apercu — aucune donnee modifiee. ATTENTION : l'import reel n'est pas atomique — en cas d'echec, certaines tables pourraient etre partiellement modifiees.",
      }
    }

    // Real import
    try {
      await ctx.runMutation(internal.system._acquireSystemLock, {
        operation: "backup_import",
        lockedBy: user.userId,
      })

      // Import order (respects dependencies)
      const importOrder = [
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
      ]

      for (const tableName of importOrder) {
        if (!data[tableName] || !Array.isArray(data[tableName])) continue
        await ctx.runMutation(internal.systemInternal.importTable, {
          tableName,
          rows: data[tableName],
        })
      }

      await ctx.runMutation(internal.system._releaseSystemLock, {})
      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "backup_import",
        performedBy: user.userId,
        result: "success",
        details: JSON.stringify({ tables: summary }),
      })

      return {
        dryRun: false,
        summary,
        totalRows: Object.values(summary).reduce((a, b) => a + b, 0),
        message: "Import termine avec succes",
      }
    } catch (error) {
      try {
        await ctx.runMutation(internal.system._releaseSystemLock, {})
        await ctx.runMutation(internal.system._recordAuditEntry, {
          action: "backup_import",
          performedBy: user.userId,
          result: "failure",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      } catch (cleanupError) {
        console.error("Failed to clean up after error:", cleanupError)
      }
      throw error
    }
  },
})

/** Run pending migrations */
export const runMigrations = action({
  args: {},
  handler: async (ctx) => {
    const user: ActionAuthUser = await ctx.runQuery(internal.systemInternal.getAuthUserInternal, {})
    if (!hasPermission(user.role, PERM_SYSTEM_MIGRATE)) {
      throw new Error('Permission "system:migrate" requise')
    }

    try {
      await ctx.runMutation(internal.system._acquireSystemLock, {
        operation: "migrations",
        lockedBy: user.userId,
      })

      // Get applied migrations
      const settings = await ctx.runQuery(internal.systemInternal.getSettingsInternal, {})
      const applied = new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settings?.appliedMigrations ?? []).map((m: any) => m.id)
      )

      // Get migration registry (statically imported at top of file)
      const pending = migrations.filter((m) => !applied.has(m.id))

      if (pending.length === 0) {
        await ctx.runMutation(internal.system._releaseSystemLock, {})
        return { applied: 0, message: "Aucune migration en attente" }
      }

      let count = 0
      for (const migration of pending) {
        await migration.run(ctx)
        await ctx.runMutation(internal.system._addAppliedMigration, {
          id: migration.id,
          name: migration.name,
        })
        count++
      }

      await ctx.runMutation(internal.system._releaseSystemLock, {})
      await ctx.runMutation(internal.system._recordAuditEntry, {
        action: "migration_run",
        performedBy: user.userId,
        result: "success",
        details: JSON.stringify({
          applied: count,
          migrations: pending.map((m) => m.id),
        }),
      })

      return { applied: count, message: `${count} migration(s) appliquee(s)` }
    } catch (error) {
      try {
        await ctx.runMutation(internal.system._releaseSystemLock, {})
        await ctx.runMutation(internal.system._recordAuditEntry, {
          action: "migration_run",
          performedBy: user.userId,
          result: "failure",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      } catch (cleanupError) {
        console.error("Failed to clean up after error:", cleanupError)
      }
      throw error
    }
  },
})
