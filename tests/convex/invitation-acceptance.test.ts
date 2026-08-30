// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * The invitation, from the link to the rights it promises.
 *
 * `/invite/<token>` did not exist, so nothing had ever called `acceptInvitation`
 * from outside Convex and nothing tested what the invitee sees on the way. Two
 * halves are covered here:
 *
 * - `getInvitationPreview`, which the page renders. It has to ANSWER rather than
 *   throw — "no such invitation", "expired" and "already accepted" are three
 *   different pieces of copy, and a redacted exception cannot tell them apart.
 * - `acceptInvitation`, which is the only thing that writes `userProfiles` — the
 *   record the authorisation chain actually reads. Until it runs, a roster row
 *   grants nothing at all.
 */

import { convexTest } from "convex-test"
import { afterEach, describe, expect, test } from "vitest"
import { api, internal } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"
import { convexErrorCode } from "../../lib/convex-error"

const modules = import.meta.glob("../../convex/**/*.ts")

/**
 * The refusal code, read the way the UI reads it.
 *
 * `convex-test` hands `ConvexError.data` back as a JSON STRING where the
 * browser client hands back an object. Asserting on the raw shape here would
 * pin the harness's form and prove nothing about the screen, so the tests go
 * through the same reader the pages use.
 */
async function refusalCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise
    return null
  } catch (error) {
    return convexErrorCode(error)
  }
}

const NOW = 1_700_000_000_000
const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000

function newHarness() {
  const t = convexTest(schema, modules)
  harnesses.push(t)
  return t
}

const harnesses: ReturnType<typeof convexTest>[] = []

/**
 * Cancel whatever the test left on the scheduler.
 *
 * Product, menu and store mutations queue work through `ctx.scheduler.runAfter`
 * — `scheduleMenuSync` puts the Uber Eats and Deliveroo syncs at a 5s delay on
 * every catalogue write. A test finishes in milliseconds and leaves them
 * pending; whatever fires them next writes against a transaction that closed,
 * and because nothing awaits it that arrives as an unhandled rejection. The run
 * then reports every test green and still exits 1, blaming whichever file
 * happened to be running rather than the one that queued the work.
 *
 * Cancel rather than run. `syncAllStores` is an `internalAction`, and running
 * one here is the disease, not the cure: convex-test patches its
 * `_scheduled_functions` row on completion, an action has no transaction to
 * patch it in, and the failure comes straight back. Finishing the queue with
 * `finishAllScheduledFunctions` was tried first and made it worse — ten
 * rejections in a run where leaving the jobs alone produced two.
 */
afterEach(async () => {
  for (const t of harnesses) {
    await t.run(async (ctx) => {
      const pending = await ctx.db.system.query("_scheduled_functions").collect()
      for (const job of pending) {
        // Only what is still outstanding: cancelling a job that already
        // finished is not a no-op. Same guard as `cancelScheduled` in
        // campaign-send.test.ts, which reached this from the other direction.
        if (job.state.kind === "pending" || job.state.kind === "inProgress") {
          await ctx.scheduler.cancel(job._id)
        }
      }
    })
  }
  harnesses.length = 0
})


async function seedStore(t: ReturnType<typeof convexTest>, name: string) {
  return t.run((ctx) =>
    ctx.db.insert("stores", {
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      address: {
        street: "1 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
        country: "France",
      },
      hours: [],
      status: "open" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

/** A roster row exactly as `invite` writes it. */
async function seedInvitation(
  t: ReturnType<typeof convexTest>,
  overrides: {
    storeId?: Id<"stores">
    allStores?: boolean
    token?: string
    status?: "pending" | "accepted" | "expired"
    invitedAt?: number
    role?: "manager" | "kitchen" | "waiter" | "delivery"
    permissions?: string[]
  } = {}
) {
  return t.run((ctx) =>
    ctx.db.insert("teamMembers", {
      storeId: overrides.storeId,
      allStores: overrides.allStores ?? false,
      name: "Yanis Moreau",
      email: "yanis@resto.example",
      role: overrides.role ?? "manager",
      permissions: overrides.permissions ?? ["dashboard", "orders"],
      invitationStatus: overrides.status ?? "pending",
      invitationToken: overrides.token ?? "tok-1",
      invitedAt: overrides.invitedAt ?? Date.now(),
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

// ============================================================================
// What the page renders before anyone is signed in
// ============================================================================

describe("getInvitationPreview", () => {
  test("names the restaurant and the role, so the invitee knows what they accept", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-preview", role: "manager" })

    const preview = await t.query(api.teamMembers.getInvitationPreview, {
      token: "tok-preview",
    })

    expect(preview.status).toBe("pending")
    expect(preview).toMatchObject({
      role: "manager",
      allStores: false,
      storeName: "Chez Luigi",
      email: "yanis@resto.example",
    })
  })

  test("answers not_found for an unknown token instead of throwing", async () => {
    const t = newHarness()

    // The route used to 404. Answering is what lets the page say something
    // useful about a link that was already used.
    await expect(
      t.query(api.teamMembers.getInvitationPreview, { token: "nope" })
    ).resolves.toEqual({ status: "not_found" })
  })

  test("reports an invitation past its lifetime as expired", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    // Still `pending` in the table: expiry is stamped on the acceptance
    // attempt, not by a sweeper, so the preview has to apply the rule itself.
    await seedInvitation(t, {
      storeId,
      token: "tok-old",
      invitedAt: Date.now() - EIGHT_DAYS_MS,
    })

    const preview = await t.query(api.teamMembers.getInvitationPreview, {
      token: "tok-old",
    })

    expect(preview.status).toBe("invitation_expired")
  })

  test("reports an already-accepted invitation distinctly from an expired one", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-used", status: "accepted" })

    const preview = await t.query(api.teamMembers.getInvitationPreview, {
      token: "tok-used",
    })

    expect(preview.status).toBe("invitation_not_pending")
  })

  test("says 'all establishments' for a chain-wide invitation, which has no store", async () => {
    const t = newHarness()
    await seedInvitation(t, { allStores: true, token: "tok-chain" })

    const preview = await t.query(api.teamMembers.getInvitationPreview, {
      token: "tok-chain",
    })

    expect(preview).toMatchObject({ status: "pending", allStores: true, storeName: null })
  })
})

// ============================================================================
// Acceptance, and the profile it must write
// ============================================================================

describe("acceptInvitation", () => {
  test("provisions the userProfiles record the authorisation chain reads", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-accept", role: "manager" })

    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-accept" })

    const profile = await t.run((ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", "user-yanis"))
        .first()
    )

    // Without this row the roster grants nothing: `getAuthUser` never reads
    // `teamMembers`.
    expect(profile).toMatchObject({ role: "manager", storeIds: [storeId] })
  })

  test("consumes the token, so the link cannot be replayed", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-once" })

    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-once" })

    await expect(
      t.query(api.teamMembers.getInvitationPreview, { token: "tok-once" })
    ).resolves.toEqual({ status: "not_found" })
  })

  test("marks the roster row accepted and binds it to the caller", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, { storeId, token: "tok-bind" })

    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-bind" })

    const member = await t.run((ctx) => ctx.db.get(memberId))
    expect(member).toMatchObject({
      invitationStatus: "accepted",
      userId: "user-yanis",
    })
  })

  test("refuses an anonymous caller, with a reason the page can read", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-anon" })

    // ConvexError `data`, not a message: Convex redacts a thrown message in
    // production and the invite page would show "Server Error" for all four
    // refusals.
    expect(
      await refusalCode(
        t.mutation(api.teamMembers.acceptInvitation, { token: "tok-anon" })
      )
    ).toBe("not_authenticated")
  })

  test("refuses an unknown token by code", async () => {
    const t = newHarness()

    expect(
      await refusalCode(
        t
          .withIdentity({ subject: "user-yanis" })
          .mutation(api.teamMembers.acceptInvitation, { token: "ghost" })
      )
    ).toBe("not_found")
  })

  test("refuses an expired invitation by code", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, {
      storeId,
      token: "tok-stale",
      invitedAt: Date.now() - EIGHT_DAYS_MS,
    })

    expect(
      await refusalCode(
        t
          .withIdentity({ subject: "user-yanis" })
          .mutation(api.teamMembers.acceptInvitation, { token: "tok-stale" })
      )
    ).toBe("invitation_expired")

    // The row is still `pending`, and that is correct rather than a leak: a
    // mutation is a transaction, so a write on the refusal path is rolled back
    // by the refusal itself. The code used to attempt exactly that. Expiry is
    // a rule about `invitedAt`, applied on read.
    const member = await t.run((ctx) => ctx.db.get(memberId))
    expect(member?.invitationStatus).toBe("pending")
    await expect(
      t.query(api.teamMembers.getInvitationPreview, { token: "tok-stale" })
    ).resolves.toEqual({ status: "invitation_expired" })
  })

  test("refuses a second acceptance by code", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-twice", status: "accepted" })

    expect(
      await refusalCode(
        t
          .withIdentity({ subject: "user-yanis" })
          .mutation(api.teamMembers.acceptInvitation, { token: "tok-twice" })
      )
    ).toBe("invitation_not_pending")
  })

  test("adds a second restaurant rather than replacing the first", async () => {
    const t = newHarness()
    const luigi = await seedStore(t, "Chez Luigi")
    const marco = await seedStore(t, "Chez Marco")

    await t.run((ctx) =>
      ctx.db.insert("userProfiles", {
        userId: "user-yanis",
        role: "manager",
        storeIds: [luigi],
        permissions: [],
        language: "fr",
        twoFactorEnabled: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )
    await seedInvitation(t, { storeId: marco, token: "tok-second", role: "waiter" })

    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-second" })

    const profile = await t.run((ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", "user-yanis"))
        .first()
    )

    // An invitation adds a workplace; it does not demote the person or make
    // them lose the restaurant they already worked in.
    expect(profile?.role).toBe("manager")
    expect(profile?.storeIds).toEqual([luigi, marco])
  })
})

// ============================================================================
// The module checkboxes, from the dialog to the refusal
// ============================================================================

describe("module permissions", () => {
  test("an accepted invitation writes the modules it was created with", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, {
      storeId,
      token: "tok-modules",
      role: "manager",
      permissions: ["orders", "kitchen"],
    })

    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-modules" })

    const profile = await t.run((ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", "user-yanis"))
        .first()
    )

    // Acceptance used to write `existingProfile?.permissions ?? []` — i.e.
    // nothing — and the dialog's eight checkboxes died here.
    expect(profile?.permissions?.sort()).toEqual(["kitchen", "orders"])
  })

  test("a module the owner unticked is refused, not merely hidden", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, {
      storeId,
      token: "tok-narrow",
      role: "manager",
      permissions: ["orders", "kitchen"],
    })

    const asMember = t.withIdentity({ subject: "user-yanis" })
    await asMember.mutation(api.teamMembers.acceptInvitation, { token: "tok-narrow" })

    // A manager's ROLE carries products:write. The owner did not tick
    // "Produits / Menu", and until now that changed nothing at all.
    await expect(
      asMember.mutation(api.categories.create, {
        storeId,
        name: "Entrées",
        slug: "entrees",
        sortOrder: 1,
        isActive: true,
      })
    ).rejects.toThrow(/module_denied/)
  })

  test("a module the owner did tick still works", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, {
      storeId,
      token: "tok-wide",
      role: "manager",
      permissions: ["orders", "kitchen", "products"],
    })

    const asMember = t.withIdentity({ subject: "user-yanis" })
    await asMember.mutation(api.teamMembers.acceptInvitation, { token: "tok-wide" })

    await expect(
      asMember.mutation(api.categories.create, {
        storeId,
        name: "Entrées",
        slug: "entrees",
        sortOrder: 1,
        isActive: true,
      })
    ).resolves.toBeDefined()
  })

  test("a member invited with no restriction keeps their whole role", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, {
      storeId,
      token: "tok-open",
      role: "manager",
      permissions: [],
    })

    const asMember = t.withIdentity({ subject: "user-yanis" })
    await asMember.mutation(api.teamMembers.acceptInvitation, { token: "tok-open" })

    await expect(
      asMember.mutation(api.categories.create, {
        storeId,
        name: "Entrées",
        slug: "entrees",
        sortOrder: 1,
        isActive: true,
      })
    ).resolves.toBeDefined()
  })
})

/** A profile with `role` over `storeIds`, and a client bound to it. */
async function seedProfile(
  t: ReturnType<typeof convexTest>,
  subject: string,
  role: string,
  storeIds: Id<"stores">[]
) {
  await t.run((ctx) =>
    ctx.db.insert("userProfiles", {
      userId: subject,
      role,
      storeIds,
      permissions: [],
      language: "fr",
      twoFactorEnabled: false,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
  return t.withIdentity({ subject })
}

// ============================================================================
// The audit trail, and the sweep
// ============================================================================

/** Every access entry in the log, newest last. */
async function accessEntries(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const rows = await ctx.db.query("systemAuditLog").collect()
    return rows
      .filter((r) => String(r.action).startsWith("access_"))
      .map((r) => ({
        action: r.action,
        performedBy: r.performedBy,
        targetUserId: r.targetUserId,
        details: JSON.parse(String(r.details)),
      }))
  })
}

describe("access audit", () => {
  test("accepting an invitation is recorded, with who and what", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-audit", role: "manager" })

    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-audit" })

    const entries = await accessEntries(t)

    // `userProfiles` is where every guard resolves rights from, and nothing
    // recorded a change to it until now.
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      action: "access_granted",
      performedBy: "user-yanis",
      targetUserId: "user-yanis",
    })
    expect(entries[0]?.details).toMatchObject({
      operation: "invitation_accepted",
      resulting: { role: "manager", storeCount: 1 },
    })
  })

  test("a dismissal is recorded as a revocation, not a change", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, { storeId, token: "tok-rev", role: "manager" })
    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-rev" })

    // An owner who administers this store takes the position away.
    await t.run((ctx) =>
      ctx.db.insert("userProfiles", {
        userId: "user-owner",
        role: "client_admin",
        storeIds: [storeId],
        permissions: [],
        language: "fr",
        twoFactorEnabled: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )
    await t
      .withIdentity({ subject: "user-owner" })
      .mutation(api.teamMembers.remove, { id: memberId })

    const entries = await accessEntries(t)
    const revocation = entries.at(-1)

    // The entry an owner comes looking for months later.
    expect(revocation).toMatchObject({
      action: "access_revoked",
      performedBy: "user-owner",
      targetUserId: "user-yanis",
    })
    expect(revocation?.details).toMatchObject({ operation: "membership_revoked" })
  })

  test("claiming the first administrator seat is recorded", async () => {
    const t = newHarness()
    const previous = process.env.ADMIN_BOOTSTRAP_TOKEN
    process.env.ADMIN_BOOTSTRAP_TOKEN = "s3cr3t-bootstrap"
    try {
      await t
        .withIdentity({ subject: "user-founder" })
        .mutation(api.userProfiles.claimFirstAdmin, {
          bootstrapToken: "s3cr3t-bootstrap",
        })
    } finally {
      if (previous === undefined) delete process.env.ADMIN_BOOTSTRAP_TOKEN
      else process.env.ADMIN_BOOTSTRAP_TOKEN = previous
    }

    const entries = await accessEntries(t)

    // The most consequential change a deployment ever sees, and the one nobody
    // is around to witness.
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      action: "access_granted",
      targetUserId: "user-founder",
    })
    expect(entries[0]?.details).toMatchObject({
      operation: "bootstrap",
      resulting: { role: "super_admin" },
    })
  })

  test("the rights history of an account is super-admin only", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, { storeId, token: "tok-read", role: "manager" })
    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-read" })

    const asAdmin = await seedProfile(t, "user-owner", "client_admin", [storeId])
    const asSuper = await seedProfile(t, "user-root", "super_admin", [])

    // An access entry names a PERSON, so there is no store to scope it by. The
    // journal's "no target means everyone" rule would otherwise have handed a
    // client admin the rights history of every account on the deployment.
    const seenByAdmin = await asAdmin.query(api.system.getAuditLog, {
      paginationOpts: { cursor: null, numItems: 10 },
    })
    expect(seenByAdmin.page.filter((e) => e.targetUserId)).toHaveLength(0)

    const seenBySuper = await asSuper.query(api.system.getAuditLog, {
      paginationOpts: { cursor: null, numItems: 10 },
    })
    expect(seenBySuper.page.filter((e) => e.targetUserId)).toHaveLength(1)
  })
})

describe("sweepInvitations", () => {
  test("expires a stale invitation and takes its token with it", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, {
      storeId,
      token: "tok-stale-sweep",
      invitedAt: Date.now() - EIGHT_DAYS_MS,
    })

    await t.mutation(internal.teamMembers.sweepInvitations, {})

    const member = await t.run((ctx) => ctx.db.get(memberId))
    expect(member?.invitationStatus).toBe("expired")
    // The point of the sweep: a dead link stops resolving at all.
    expect(member?.invitationToken).toBeUndefined()
    await expect(
      t.query(api.teamMembers.getInvitationPreview, { token: "tok-stale-sweep" })
    ).resolves.toEqual({ status: "not_found" })
  })

  test("leaves a live invitation alone", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, { storeId, token: "tok-live" })

    await t.mutation(internal.teamMembers.sweepInvitations, {})

    const member = await t.run((ctx) => ctx.db.get(memberId))
    expect(member?.invitationStatus).toBe("pending")
    expect(member?.invitationToken).toBe("tok-live")
  })

  test("never removes somebody who accepted, however old the invitation", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, { storeId, token: "tok-member" })
    await t
      .withIdentity({ subject: "user-yanis" })
      .mutation(api.teamMembers.acceptInvitation, { token: "tok-member" })
    // Accepted while live, then aged well past every window: this is the row
    // the sweep must not touch.
    await t.run((ctx) =>
      ctx.db.patch(memberId, { invitedAt: Date.now() - 120 * 24 * 60 * 60 * 1000 })
    )

    await t.mutation(internal.teamMembers.sweepInvitations, {})

    // A row carrying a userId is a member of the team, not an invitation.
    const member = await t.run((ctx) => ctx.db.get(memberId))
    expect(member).not.toBeNull()
    expect(member?.invitationStatus).toBe("accepted")
  })

  test("purges an invitation nobody ever accepted, long after it died", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    const memberId = await seedInvitation(t, {
      storeId,
      token: "tok-ancient",
      status: "expired",
      invitedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    })

    await t.mutation(internal.teamMembers.sweepInvitations, {})

    // The table stops accumulating the name and email of people who never came.
    expect(await t.run((ctx) => ctx.db.get(memberId))).toBeNull()
  })

  test("reports what it did, so a silent sweep is distinguishable from an idle one", async () => {
    const t = newHarness()
    const storeId = await seedStore(t, "Chez Luigi")
    await seedInvitation(t, {
      storeId,
      token: "tok-a",
      invitedAt: Date.now() - EIGHT_DAYS_MS,
    })
    await seedInvitation(t, { storeId, token: "tok-b" })

    await expect(
      t.mutation(internal.teamMembers.sweepInvitations, {})
    ).resolves.toEqual({ expired: 1, purged: 0 })
  })
})
