/**
 * @repo/backend
 *
 * Re-exports the Convex `_generated/` artifacts so that workspace
 * apps (apps/web, apps/mobile) consume them through a stable, named
 * entry point rather than relative paths into `../../convex/_generated`.
 *
 * The actual Convex code lives at the repo root (`convex/`). Convex
 * codegen continues to write to `convex/_generated/`. This package
 * is a pure re-export layer — keep it free of business logic.
 */
export * from "./api"
