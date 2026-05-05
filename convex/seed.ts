/**
 * Seed data for the storefront demo.
 *
 * Creates 1 store + 3 categories + 6 products if the database is empty.
 * Idempotent: re-running does nothing once the seed store exists.
 *
 * Usage:
 *   pnpx convex run seed:runSeed
 */
import { internalMutation } from "./_generated/server"

export const runSeed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("stores")
      .filter((q) => q.eq(q.field("slug"), "demo-store"))
      .first()

    if (existing) {
      return {
        message: "Seed already applied. Demo store exists.",
        storeId: existing._id,
      }
    }

    const now = Date.now()

    const storeId = await ctx.db.insert("stores", {
      name: "Pizzeria Demo",
      slug: "demo-store",
      description: "Demo restaurant for the BeInDigital boilerplate.",
      address: {
        street: "12 rue de la Republique",
        city: "Bobigny",
        postalCode: "93000",
        country: "FR",
        latitude: 48.9070,
        longitude: 2.4495,
      },
      phone: "+33 1 48 00 00 00",
      email: "contact@pizzeria-demo.fr",
      useGlobalHours: true,
      hours: [
        { day: 0, open: "00:00", close: "00:00", isClosed: true },
        { day: 1, open: "11:30", close: "22:30", isClosed: false },
        { day: 2, open: "11:30", close: "22:30", isClosed: false },
        { day: 3, open: "11:30", close: "22:30", isClosed: false },
        { day: 4, open: "11:30", close: "22:30", isClosed: false },
        { day: 5, open: "11:30", close: "23:30", isClosed: false },
        { day: 6, open: "11:30", close: "23:30", isClosed: false },
      ],
      overrides: undefined,
      status: "active",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    const categories = [
      {
        name: "Pizzas",
        slug: "pizzas",
        description: "Pates fines, ingredients frais, four a bois.",
        sortOrder: 1,
      },
      {
        name: "Salades",
        slug: "salades",
        description: "Fraicheur et croquant, composees du jour.",
        sortOrder: 2,
      },
      {
        name: "Boissons",
        slug: "boissons",
        description: "Sodas, eaux, biere artisanale locale.",
        sortOrder: 3,
      },
    ]

    const categoryIds: Record<string, string> = {}
    for (const cat of categories) {
      const id = await ctx.db.insert("categories", {
        storeId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: undefined,
        sortOrder: cat.sortOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      categoryIds[cat.slug] = id
    }

    const products = [
      {
        category: "pizzas",
        name: "Margherita",
        slug: "pizza-margherita",
        description: "Sauce tomate, mozzarella di bufala, basilic frais.",
        price: 11.5,
        taxRate: 10,
        preparationTime: 12,
      },
      {
        category: "pizzas",
        name: "Quatre Fromages",
        slug: "pizza-4-fromages",
        description: "Mozzarella, gorgonzola, parmesan, chevre.",
        price: 14.0,
        taxRate: 10,
        preparationTime: 14,
      },
      {
        category: "pizzas",
        name: "Diavola",
        slug: "pizza-diavola",
        description: "Sauce tomate, mozzarella, salami piquant.",
        price: 13.5,
        taxRate: 10,
        preparationTime: 13,
      },
      {
        category: "salades",
        name: "Cesar",
        slug: "salade-cesar",
        description: "Salade romaine, poulet grille, parmesan, croutons.",
        price: 10.5,
        taxRate: 10,
        preparationTime: 5,
      },
      {
        category: "salades",
        name: "Italienne",
        slug: "salade-italienne",
        description: "Tomates, mozzarella, basilic, huile d'olive.",
        price: 9.5,
        taxRate: 10,
        preparationTime: 5,
      },
      {
        category: "boissons",
        name: "Coca-Cola 33cl",
        slug: "coca-cola-33",
        description: "Bouteille en verre.",
        price: 3.0,
        taxRate: 20,
        preparationTime: 1,
      },
      {
        category: "boissons",
        name: "Eau plate 50cl",
        slug: "eau-plate-50",
        description: "Bouteille recyclable.",
        price: 2.5,
        taxRate: 20,
        preparationTime: 1,
      },
    ]

    let productCount = 0
    for (const p of products) {
      await ctx.db.insert("products", {
        storeId,
        categoryId: categoryIds[p.category] as never,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: undefined,
        taxRate: p.taxRate,
        preparationTime: p.preparationTime,
        sku: undefined,
        images: [],
        options: [],
        isActive: true,
        scheduling: undefined,
        stock: {
          trackStock: false,
          quantity: 0,
          autoDisableOnZero: false,
          lowStockThreshold: 5,
        },
        externalIds: undefined,
        nutritionalInfo: undefined,
        allergens: [],
        sortOrder: productCount + 1,
        createdAt: now,
        updatedAt: now,
      })
      productCount++
    }

    return {
      message: "Seed applied",
      storeId,
      categoriesCreated: categories.length,
      productsCreated: productCount,
    }
  },
})
