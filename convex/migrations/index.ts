import type { ActionCtx } from "../_generated/server"

export interface Migration {
  id: string
  name: string
  run: (ctx: ActionCtx) => Promise<void>
}

/**
 * Migration registry.
 * Add new migrations at the end of this array.
 * Each migration must have a unique `id` (use format: "YYYY-MM-DD_description").
 * Migrations are executed in order and recorded in globalSettings.appliedMigrations.
 */
export const migrations: Migration[] = [
  // Example:
  // {
  //   id: "2026-03-23_add_default_store_currency",
  //   name: "Add default currency to stores without one",
  //   run: async (ctx) => {
  //     await ctx.runMutation(internal.stores.addDefaultCurrency, {})
  //   },
  // },
]
