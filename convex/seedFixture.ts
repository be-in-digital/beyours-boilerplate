import { internalMutation } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

/**
 * The restaurant the e2e suite administers.
 *
 * `seed-users.mts` created six accounts and nothing else, so the `stores` table
 * stayed empty and every profile carried `storeIds: []`. Authentication then
 * succeeded and every admin screen still rendered nothing — the sidebar has no
 * restaurant to draw. Seventeen navigation tests failed on the same missing
 * locator, all of them describing this one absence.
 *
 * Internal on purpose: `internalMutation` is unreachable from a browser, so
 * this cannot be triggered on a deployment serving a real restaurant. It is
 * invoked by `scripts/seed-users.mts` through `npx convex run`, which
 * authenticates as the deployment itself.
 *
 * Idempotent throughout — seeding has to survive being run twice, which the
 * account step learned the hard way.
 */

const STORE_SLUG = "chez-luigi-test"

const HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: "09:00",
  close: "22:00",
  // Closed on Monday, so the "closed today" paths have something to show.
  isClosed: day === 1,
}))

const CATEGORIES = [
  { name: "Entrées", slug: "entrees", sortOrder: 0 },
  { name: "Plats", slug: "plats", sortOrder: 1 },
  { name: "Desserts", slug: "desserts", sortOrder: 2 },
]

/** Prices in cents, as everywhere else in this codebase. */
const PRODUCTS = [
  { category: "entrees", name: "Salade César", slug: "salade-cesar", price: 850 },
  { category: "entrees", name: "Soupe du jour", slug: "soupe-du-jour", price: 650 },
  { category: "plats", name: "Pizza Margherita", slug: "pizza-margherita", price: 1200 },
  { category: "plats", name: "Burger Classic", slug: "burger-classic", price: 1450 },
  { category: "desserts", name: "Tiramisu", slug: "tiramisu", price: 700 },
]

/** Roles that work in a restaurant, and therefore need it on their profile. */
const STAFF_ROLES = new Set(["client_admin", "manager", "kitchen", "waiter", "delivery"])

/**
 * The team roster shown on the Équipe screen.
 *
 * Mirrors the accounts `seed-users.mts` already creates rather than inventing
 * people: the row a test clicks then belongs to someone who can actually sign
 * in, which is what a real registry looks like. One row is left `pending` — an
 * invitation that has been sent and not yet accepted is a normal state of that
 * screen, and the status column exists to show it.
 */
const TEAM = [
  { name: "Marie Martin", email: "test.manager@beindigital.fr", role: "manager" as const, status: "accepted" as const },
  { name: "Pierre Dupont", email: "test.cuisine@beindigital.fr", role: "kitchen" as const, status: "accepted" as const },
  { name: "Sophie Laurent", email: "test.service@beindigital.fr", role: "waiter" as const, status: "pending" as const },
]

/**
 * A blog category, so the "Nouvel article" dialog has something to offer.
 *
 * Without one it replaces its form with "créez d'abord une catégorie", and four
 * tests about the form were really testing the absence of this row.
 */
const BLOG_CATEGORY = { name: "Actualités", slug: "actualites" }

/**
 * The sender address the email marketing needs before it will do anything.
 *
 * "Nouvelle campagne" stays disabled until `fromEmail` is set, which is correct
 * — and left eleven tests waiting on a button that is right to refuse. The
 * address is deliberately a `.test` domain: it is reserved by RFC 2606 and can
 * never be delivered to, so a run that unexpectedly sends mail fails loudly
 * rather than reaching a real inbox.
 */
const EMAIL_SENDER = {
  senderName: "Chez Luigi (test)",
  fromEmail: "no-reply@chez-luigi.test",
  replyToEmail: "contact@chez-luigi.test",
}

export const internalSeedFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // --- The restaurant -----------------------------------------------------
    const existing = await ctx.db
      .query("stores")
      .filter((q) => q.eq(q.field("slug"), STORE_SLUG))
      .first()

    const storeId: Id<"stores"> =
      existing?._id ??
      (await ctx.db.insert("stores", {
        name: "Chez Luigi (test)",
        slug: STORE_SLUG,
        address: {
          street: "12 rue de la Paix",
          city: "Paris",
          postalCode: "75002",
          country: "FR",
          latitude: 48.8698,
          longitude: 2.3312,
        },
        hours: HOURS,
        status: "open" as const,
        createdAt: now,
        updatedAt: now,
      }))

    // --- Its catalogue ------------------------------------------------------
    const categoryIds = new Map<string, Id<"categories">>()

    for (const category of CATEGORIES) {
      const found = await ctx.db
        .query("categories")
        .filter((q) =>
          q.and(
            q.eq(q.field("storeId"), storeId),
            q.eq(q.field("slug"), category.slug)
          )
        )
        .first()

      categoryIds.set(
        category.slug,
        found?._id ??
          (await ctx.db.insert("categories", {
            storeId,
            name: category.name,
            slug: category.slug,
            sortOrder: category.sortOrder,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          }))
      )
    }

    let productsCreated = 0

    for (const product of PRODUCTS) {
      const found = await ctx.db
        .query("products")
        .filter((q) =>
          q.and(
            q.eq(q.field("storeId"), storeId),
            q.eq(q.field("slug"), product.slug)
          )
        )
        .first()
      if (found) continue

      await ctx.db.insert("products", {
        storeId,
        categoryId: categoryIds.get(product.category)!,
        name: product.name,
        slug: product.slug,
        price: product.price,
        taxRate: 10,
        images: [],
        options: [],
        allergens: [],
        tags: [],
        isActive: true,
        isFeatured: false,
        sortOrder: 0,
        source: "manual",
        createdAt: now,
        updatedAt: now,
      })
      productsCreated += 1
    }

    // --- Give the staff somewhere to work -----------------------------------
    //
    // A profile with `storeIds: []` passes every role check and then fails the
    // tenant check on the first screen it opens. Customers keep an empty list:
    // that is what a customer is.
    const profiles = await ctx.db.query("userProfiles").collect()
    let profilesAttached = 0

    for (const profile of profiles) {
      if (!STAFF_ROLES.has(profile.role)) continue
      if (profile.storeIds.includes(storeId)) continue

      await ctx.db.patch(profile._id, {
        storeIds: [...profile.storeIds, storeId],
        updatedAt: now,
      })
      profilesAttached += 1
    }

    // --- One product that tracks its stock ----------------------------------
    //
    // The inventory editor only exists for a tracked product; with none, the
    // quantity column is a row of dashes and the test for its +/- buttons had
    // nothing to look at.
    const firstProduct = await ctx.db
      .query("products")
      .filter((q) =>
        q.and(
          q.eq(q.field("storeId"), storeId),
          q.eq(q.field("slug"), PRODUCTS[0]!.slug)
        )
      )
      .first()

    let stockTracked = false
    if (firstProduct && !firstProduct.stock?.tracked) {
      await ctx.db.patch(firstProduct._id, {
        stock: {
          tracked: true,
          quantity: 12,
          lowStockThreshold: 3,
          autoDisableWhenEmpty: false,
        },
        updatedAt: now,
      })
      stockTracked = true
    }

    // --- A blog category ----------------------------------------------------
    const existingBlogCategory = await ctx.db
      .query("blogCategories")
      .filter((q) =>
        q.and(
          q.eq(q.field("storeId"), storeId),
          q.eq(q.field("slug"), BLOG_CATEGORY.slug)
        )
      )
      .first()

    if (!existingBlogCategory) {
      await ctx.db.insert("blogCategories", {
        storeId,
        name: BLOG_CATEGORY.name,
        slug: BLOG_CATEGORY.slug,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
    }

    // --- The sender address -------------------------------------------------
    const existingEmailConfig = await ctx.db
      .query("emailConfig")
      .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
      .first()

    if (!existingEmailConfig) {
      await ctx.db.insert("emailConfig", {
        storeId,
        senderName: EMAIL_SENDER.senderName,
        fromEmail: EMAIL_SENDER.fromEmail,
        replyToEmail: EMAIL_SENDER.replyToEmail,
        branding: {
          primaryColor: "#0D5C3F",
          secondaryColor: "#F97316",
          footerText: "Chez Luigi — établissement de test",
        },
        unsubscribeText: "Se désinscrire",
        maxEmailsPerWeek: 3,
        automationSettings: {
          welcomeEnabled: false,
          postOrderEnabled: false,
          birthdayEnabled: false,
          inactiveEnabled: false,
          abandonedCartEnabled: false,
        },
        createdAt: now,
        updatedAt: now,
      })
    }

    // --- Auto Blog on the owner accounts ------------------------------------
    //
    // Entitlements hang off the Better Auth user id, which is what
    // `getAccessStatus` reads from the session. Owners only: this grants a paid
    // feature, and a test deployment is the only place that is acceptable.
    let ownersEntitled = 0

    for (const profile of profiles) {
      if (profile.role !== "client_admin") continue

      const existingEntitlement = await ctx.db
        .query("ownerEntitlements")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", profile.userId))
        .first()

      const autoBlog = {
        enabled: true,
        plan: "pro" as const,
        monthlyQuota: 30,
        allowMultiLanguage: true,
        allowAutoPublish: true,
        monthlyImageQuota: 100,
      }

      if (existingEntitlement) {
        if (existingEntitlement.autoBlog.enabled) continue
        await ctx.db.patch(existingEntitlement._id, { autoBlog, updatedAt: now })
      } else {
        await ctx.db.insert("ownerEntitlements", {
          ownerId: profile.userId,
          autoBlog,
          imageToProduct: { enabled: true, monthlyAnalysisQuota: 50 },
          createdAt: now,
          updatedAt: now,
        })
      }
      ownersEntitled += 1
    }

    // --- A template and one draft campaign ----------------------------------
    //
    // The campaign row actions — preview, send a test, duplicate — live in a
    // dropdown on a table row, so with an empty table seven tests skipped
    // themselves with "No campaigns in table to test". A campaign needs a
    // template, so both are seeded.
    //
    // Draft on purpose: a draft has never been sent and never will be by
    // sitting here, so nothing in this fixture can put mail on the wire.
    const existingTemplate = await ctx.db
      .query("emailTemplates")
      .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
      .first()

    const templateId =
      existingTemplate?._id ??
      (await ctx.db.insert("emailTemplates", {
        storeId,
        name: "Modèle de test",
        subject: "Des nouvelles de Chez Luigi",
        previewText: "Nos plats de la semaine",
        category: "marketing" as const,
        blocks: [
          {
            type: "heading" as const,
            id: "heading-1",
            content: "Des nouvelles de Chez Luigi",
            level: "h1" as const,
            alignment: "center" as const,
          },
          {
            type: "text" as const,
            id: "text-1",
            content: "Découvrez nos plats de la semaine.",
            alignment: "left" as const,
          },
        ],
        createdAt: now,
        updatedAt: now,
      }))

    const existingCampaign = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
      .first()

    if (!existingCampaign) {
      await ctx.db.insert("emailCampaigns", {
        storeId,
        name: "Campagne de test",
        subject: "Des nouvelles de Chez Luigi",
        previewText: "Nos plats de la semaine",
        templateId,
        status: "draft" as const,
        abTestEnabled: false,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          converted: 0,
          revenue: 0,
        },
        createdAt: now,
        updatedAt: now,
      })
    }

    // --- The team registry --------------------------------------------------
    //
    // Five tests skipped themselves on "this store has no table to inspect":
    // the Équipe screen answers "Aucun membre" with an empty registry, so the
    // columns, the row dropdown and the edit and delete dialogs had nothing to
    // open.
    //
    // `userId` is stamped on the accepted rows from the matching profile, which
    // is what accepting an invitation produces — a row with an email and no
    // account behind it would look accepted while being unreachable.
    const profilesByUserId = new Map(profiles.map((p) => [p.userId, p]))
    let teamMembersCreated = 0

    for (const member of TEAM) {
      const found = await ctx.db
        .query("teamMembers")
        .withIndex("by_email", (q) => q.eq("email", member.email))
        .first()
      if (found) continue

      // The seeded profiles carry no email, so the role is what ties a row to
      // an account here; each seeded role is held by exactly one account.
      const profile = [...profilesByUserId.values()].find(
        (p) => p.role === member.role && p.storeIds.includes(storeId)
      )

      await ctx.db.insert("teamMembers", {
        storeId,
        allStores: false,
        userId: member.status === "accepted" ? profile?.userId : undefined,
        name: member.name,
        email: member.email,
        role: member.role,
        permissions: [],
        invitationStatus: member.status,
        invitedAt: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      teamMembersCreated += 1
    }

    return {
      storeId,
      storeCreated: !existing,
      teamMembersCreated,
      templateCreated: !existingTemplate,
      campaignCreated: !existingCampaign,
      categories: categoryIds.size,
      productsCreated,
      profilesAttached,
      stockTracked,
      blogCategoryCreated: !existingBlogCategory,
      emailConfigured: !existingEmailConfig,
      ownersEntitled,
    }
  },
})
