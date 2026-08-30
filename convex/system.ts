import { query, mutation, action, internalMutation, type QueryCtx, type MutationCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { getAuthUser } from "@be-in-digital/convex-functions/auth"
import * as maintenanceDefs from "@be-in-digital/convex-functions/maintenance"
import { Role, hasPermission, type Permission } from "@be-in-digital/core/auth/rbac"
import { migrations } from "./migrations/index"

// Type returned by systemInternal.getAuthUserInternal
interface ActionAuthUser {
  userId: string
  role: Role
  storeIds: string[]
  profileId: string
}

// Type returned by maintenance._getUpdateGatingData (annotated explicitly to
// break the api-type circularity between system.ts and maintenance.ts)
interface UpdateGatingData {
  contract: (maintenanceDefs.MaintenanceContractLike & { autoRenew: boolean }) | null
  releases: maintenanceDefs.ReleaseLike[]
}

// Type returned by checkForUpdates
interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  entitledVersion: string | null
  hasEntitledUpdate: boolean
  lockedVersions: string[]
  maintenanceStatus: maintenanceDefs.MaintenanceStatus
  coveredUntil: number | null
  registryError: string | null
  /**
   * Whether a release feed is configured at all. False means no lookup was
   * attempted, which is a different thing from one that was attempted and
   * failed — and the screen has to say so, or it accuses a registry that was
   * never asked.
   */
  registryConfigured: boolean
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
// @guarded-inline: system:* permission checked in the handler
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

/**
 * Can this reader see this entry?
 *
 * System operations belong to no establishment and stay visible to every
 * `system:read` holder. Establishment entries are scoped the way the rest of
 * the admin surface is scoped: a super admin sees all of them, anyone else sees
 * the stores their profile actually lists. Without this the journal would be
 * the one screen where a client admin could read another establishment's
 * address and opening hours.
 *
 * Membership is enough to keep the journal honest about your own work, which
 * was not always true. `stores.create` could hand a client admin a restaurant
 * they were not a member of, so scoping alone hid their own creation from them
 * and the journal read as "nothing happened". That gap was patched here with a
 * second rule — an entry you performed stays visible whatever the scope says —
 * and then closed at its source in #117: creating an establishment now makes
 * you its administrator, so the second rule is gone and one rule decides again.
 *
 * One path can still put your own entry on a store you no longer administer: a
 * super admin rewriting your profile and dropping the store. Team revocation
 * cannot do it — `revocationEffect` returns an admin's profile untouched — so
 * that removal is always deliberate, and the scoped answer is the wanted one.
 * Being removed from a restaurant is exactly what scoping is for.
 *
 * ACCESS entries are the exception, and are super-admin only. They are about a
 * PERSON rather than an establishment — who was promoted, moved or dismissed —
 * so there is no store to scope them by, and the "no target means everyone"
 * rule above would have handed a client admin the rights history of every
 * account on the deployment. Narrow on purpose: widening this later is easy,
 * un-leaking it is not.
 */
function canReadAuditEntry(
  user: { role: Role; storeIds: string[] },
  entry: { targetStoreId?: string; targetUserId?: string },
): boolean {
  if (entry.targetUserId) return user.role === Role.SUPER_ADMIN
  if (!entry.targetStoreId) return true
  if (user.role === Role.SUPER_ADMIN) return true
  return user.storeIds.includes(entry.targetStoreId)
}

/** Get paginated audit log */
// @guarded-inline: system:* permission checked in the handler
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

    // Convex's own cursor rather than a hand-rolled one.
    //
    // This used to re-`take(numItems + 1)` from the top of the index on every
    // call and hunt for the previous page's last `_id` inside that slice, so
    // page two came back holding a single row and declaring itself done.
    // Nothing noticed while the log held only the handful of system
    // operations; now that every establishment change lands here, a journal
    // that stops at row eleven is a journal nobody can read.
    const result = await q.paginate({
      cursor: args.paginationOpts.cursor,
      numItems,
    })

    // Filtering after the page is drawn can hand back a short page — the
    // cursor and `isDone` stay correct, so the reader keeps paging. Scoping
    // before the read would need one index per reader.
    return {
      page: result.page.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entry: any) => canReadAuditEntry(user, entry),
      ),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
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
    if (!settings) throw new Error("Paramètres globaux introuvables")

    if (isLockActive(settings.systemLock)) {
      throw new Error(
        `Système verrouillé par "${settings.systemLock!.lockedBy}" ` +
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
    if (!settings) throw new Error("Paramètres globaux introuvables")
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
    if (!settings) throw new Error("Paramètres globaux introuvables")
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
// @guarded-inline: system:* permission checked in the handler
export const forceReleaseLock = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireSystemPermission(ctx, PERM_SYSTEM_RESTORE)
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Paramètres globaux introuvables")

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
// @guarded-inline: system:* permission checked in the handler
export const syncVersion = mutation({
  args: { version: v.string() },
  handler: async (ctx, args) => {
    await requireSystemPermission(ctx, PERM_SYSTEM_READ)
    const settings = await getSettings(ctx)
    if (!settings) throw new Error("Paramètres globaux introuvables")

    await ctx.db.patch(settings._id, {
      deployedAppVersion: args.version,
      updatedAt: Date.now(),
    })
  },
})

// ─── Actions ────────────────────────────────────────────────────────────────────

/**
 * Check for available updates via npm registry, gated by the maintenance
 * contract: the release catalog is synced from the packument's `time` map,
 * then the entitled version is resolved against `coveredUntil`. Releases
 * published after the end of coverage are reported as locked.
 */
// @guarded-inline: getAuthUser + hasPermission on system:*
export const checkForUpdates = action({
  args: { currentVersion: v.string() },
  handler: async (ctx, args): Promise<UpdateCheckResult> => {
    const user: ActionAuthUser = await ctx.runQuery(internal.systemInternal.getAuthUserInternal, {})
    if (!hasPermission(user.role, PERM_SYSTEM_READ)) {
      throw new Error('Permission "system:read" requise')
    }

    let registryError: string | null = null

    // 1. Sync the release catalog from the release feed (best effort — an
    //    outage must not hide already-known releases).
    //
    //    This used to fetch `registry.npmjs.org/@be-in-digital/restaurant-theme`
    //    unconditionally. No package by that name is published anywhere, and the
    //    engine's ten packages go to npm.pkg.github.com as `restricted`, not to
    //    npmjs — so the request was a guaranteed 404 and every owner who opened
    //    this screen was told "Registre npm inaccessible (HTTP 404)", for ever.
    //    There is no correct public URL to substitute: which feed a deployment
    //    reads, and with what credentials, is a deployment decision.
    //
    //    So it is configuration now. Unset means no feed, which the screen
    //    reports as unconfigured rather than as a registry that let us down.
    const packumentUrl = process.env.ENGINE_RELEASE_PACKUMENT_URL?.trim()
    const registryConfigured = Boolean(packumentUrl)

    if (packumentUrl) {
      try {
        // A private registry (GitHub Packages, a proxy) needs a token. Kept
        // optional: a public or unauthenticated feed needs no header.
        const token = process.env.ENGINE_RELEASE_REGISTRY_TOKEN?.trim()
        const res = await fetch(packumentUrl, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (res.ok) {
          const data = await res.json()
          const releases = maintenanceDefs.parseNpmTimeMap(data.time)
          if (releases.length > 0) {
            await ctx.runMutation(internal.maintenance._upsertReleases, {
              releases,
              source: "npm",
            })
          }
        } else {
          registryError = `Registre indisponible (HTTP ${res.status})`
        }
      } catch (error) {
        registryError = error instanceof Error ? error.message : String(error)
      }
    }

    // 2. Resolve entitlement from the stored catalog + contract
    const { contract, releases }: UpdateGatingData = await ctx.runQuery(
      internal.maintenance._getUpdateGatingData,
      {}
    )
    const entitlement = maintenanceDefs.resolveUpdateEntitlement({
      releases,
      contract,
      currentVersion: args.currentVersion,
      nowMs: Date.now(),
    })

    const result: UpdateCheckResult = {
      currentVersion: args.currentVersion,
      latestVersion: entitlement.latestVersion ?? args.currentVersion,
      hasUpdate: entitlement.hasUpdate,
      // Maintenance gating
      entitledVersion: entitlement.entitledVersion,
      hasEntitledUpdate: entitlement.hasEntitledUpdate,
      lockedVersions: entitlement.lockedVersions,
      maintenanceStatus: entitlement.maintenanceStatus,
      coveredUntil: contract?.coveredUntil ?? null,
      registryError,
      registryConfigured,
    }

    await ctx.runMutation(internal.system._recordAuditEntry, {
      action: "version_check",
      performedBy: user.userId,
      result: registryError ? "failure" : "success",
      details: JSON.stringify({
        currentVersion: result.currentVersion,
        latestVersion: result.latestVersion,
        hasUpdate: result.hasUpdate,
        entitledVersion: result.entitledVersion,
        maintenanceStatus: result.maintenanceStatus,
      }),
      ...(registryError ? { errorMessage: registryError } : {}),
    })

    return result
  },
})

/** Export a full backup as JSON */
// @guarded-inline: getAuthUser + hasPermission on system:backup
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
// @guarded-inline: getAuthUser + hasPermission on system:restore
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
      throw new Error("Données de backup invalides")
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
        message: "Mode aperçu — aucune donnée modifiée. ATTENTION : l'import reel n'est pas atomique — en cas d'échec, certaines tables pourraient être partiellement modifiées.",
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

      // The id map, carried table by table.
      //
      // An insert cannot choose its `_id`, so every restored row comes back
      // under a new one. Without this, `stores` came back with new ids while
      // everything restored after them kept the old `storeId`, and
      // `v.id("stores")` let it through — it validates an id's encoding, not
      // that it resolves. The deployment came up with every catalogue detached
      // from its establishment. `importOrder` is why this works: a reference is
      // only rewritable once its target has been inserted.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idMap: Record<string, string> = {}

      for (const tableName of importOrder) {
        if (!data[tableName] || !Array.isArray(data[tableName])) continue
        // Annotated rather than inferred: `importBackup` reaches these
        // mutations through `internal`, and letting TypeScript infer the shape
        // back out of them makes the action's own return type circular.
        const result: { idMap: Record<string, string> } = await ctx.runMutation(
          internal.systemInternal.importTable,
          { tableName, rows: data[tableName], idMap }
        )
        Object.assign(idMap, result.idMap)
      }

      // `userProfiles` is not in the backup — it holds identities, not
      // restaurant data — so its `storeIds` still name the deployment's stores
      // from before the restore. Left alone, every store-scoped screen refuses
      // the owner who just ran the restore.
      const profiles: { updated: number; dropped: number } =
        await ctx.runMutation(internal.systemInternal.remapProfileStores, {
          idMap,
        })

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
        remappedIds: Object.keys(idMap).length,
        remappedProfiles: profiles.updated,
        droppedProfileStores: profiles.dropped,
        // Said unconditionally, because it is unconditionally true: the backup
        // carries the restaurant's configuration and catalogue, not its trading
        // history. Those tables keep pointing at ids the restore replaced, and
        // no import can repair them.
        message:
          "Import terminé. Commandes, paiements, tickets de cuisine et membres d'équipe ne sont ni exportés ni importés : leurs références aux établissements restaurés ne sont pas rétablies." +
          (profiles.dropped > 0
            ? ` ${profiles.dropped} accès à un établissement absent de la sauvegarde ont été retirés des profils.`
            : ""),
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
// @guarded-inline: getAuthUser + hasPermission on system:migrate
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
