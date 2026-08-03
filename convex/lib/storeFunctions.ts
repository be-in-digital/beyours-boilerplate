/**
 * Deep auth seam for admin-facing Convex functions.
 *
 * Every store-scoped wrapper used to hand-roll the same prelude — identity
 * check, store lookup, access check — ~192 times across 56 files. These
 * builders absorb that policy behind one narrow interface:
 *
 *   export const create = storeMutation({
 *     args: defs.create.args,
 *     handler: (ctx, args) => defs.create.handler(ctx, args),
 *   })
 *
 *   export const update = storeMutation({
 *     args: defs.update.args,
 *     storeIdFrom: storeIdFromDocument("Menu not found"),
 *     handler: async (ctx, args) => { ... },
 *   })
 *
 * - `storeIdFrom` defaults to `args.storeId`; use `storeIdFromDocument`
 *   when the store is reached through a document id.
 * - `permission` upgrades the check to RBAC (`requireStorePermission`).
 * - `authedQuery`/`authedMutation` only require authentication and hand
 *   the identity to the handler.
 */

import { mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id, TableNames } from "../_generated/dataModel";
import type { ObjectType, PropertyValidators } from "convex/values";
import type {
  RegisteredMutation,
  RegisteredQuery,
  UserIdentity,
} from "convex/server";
import {
  requireStoreAccess,
  requireStorePermission,
} from "@be-in-digital/convex-functions/auth";
import type { Permission } from "@be-in-digital/core";

type StoreIdResolver<Ctx, Args> = (ctx: Ctx, args: Args) => Promise<Id<"stores">>;

interface StoreFunctionSpec<Ctx, Args extends PropertyValidators, Output> {
  args: Args;
  /** Defaults to `args.storeId`. */
  storeIdFrom?: StoreIdResolver<Ctx, ObjectType<Args>>;
  /** When set, checks RBAC on top of store membership. */
  permission?: Permission;
  handler: (
    ctx: Ctx,
    args: ObjectType<Args>,
    identity: UserIdentity
  ) => Promise<Output>;
}

async function authorize<Ctx extends QueryCtx>(
  ctx: Ctx,
  args: Record<string, unknown>,
  spec: {
    storeIdFrom?: StoreIdResolver<Ctx, never>;
    permission?: Permission;
  }
): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const storeId = spec.storeIdFrom
    ? await spec.storeIdFrom(ctx, args as never)
    : (args as { storeId: Id<"stores"> }).storeId;

  if (spec.permission) {
    await requireStorePermission(ctx, storeId, spec.permission);
  } else {
    await requireStoreAccess(ctx, storeId);
  }
  return identity;
}

// The generic registration types of `query`/`mutation` reject structurally
// identical generics (TS2719). The seam owns the ONE cast — callers get the
// exact public type back — instead of 192 scattered casts in the wrappers.

/** Query gated on store access (membership, or RBAC via `permission`). */
export function storeQuery<Args extends PropertyValidators, Output>(
  spec: StoreFunctionSpec<QueryCtx, Args, Output>
): RegisteredQuery<"public", ObjectType<Args>, Promise<Output>> {
  return query({
    args: spec.args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (ctx: any, args: any) => {
      const identity = await authorize(ctx, args, spec);
      return spec.handler(ctx, args, identity);
    },
  }) as RegisteredQuery<"public", ObjectType<Args>, Promise<Output>>;
}

/** Mutation gated on store access (membership, or RBAC via `permission`). */
export function storeMutation<Args extends PropertyValidators, Output>(
  spec: StoreFunctionSpec<MutationCtx, Args, Output>
): RegisteredMutation<"public", ObjectType<Args>, Promise<Output>> {
  return mutation({
    args: spec.args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (ctx: any, args: any) => {
      const identity = await authorize(ctx, args, spec);
      return spec.handler(ctx, args, identity);
    },
  }) as RegisteredMutation<"public", ObjectType<Args>, Promise<Output>>;
}

/**
 * Resolve the store through a document referenced by `args.id`.
 * Throws `notFoundMessage` when the document (or its storeId) is missing.
 */
export function storeIdFromDocument(notFoundMessage: string) {
  return async (
    ctx: QueryCtx,
    args: { id: Id<TableNames> }
  ): Promise<Id<"stores">> => {
    const doc = await ctx.db.get(args.id);
    const storeId = (doc as { storeId?: Id<"stores"> } | null)?.storeId;
    if (!storeId) throw new Error(notFoundMessage);
    return storeId;
  };
}

interface AuthedFunctionSpec<Ctx, Args extends PropertyValidators, Output> {
  args: Args;
  handler: (
    ctx: Ctx,
    args: ObjectType<Args>,
    identity: UserIdentity
  ) => Promise<Output>;
}

/** Query that only requires an authenticated caller. */
export function authedQuery<Args extends PropertyValidators, Output>(
  spec: AuthedFunctionSpec<QueryCtx, Args, Output>
): RegisteredQuery<"public", ObjectType<Args>, Promise<Output>> {
  return query({
    args: spec.args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (ctx: any, args: any) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      return spec.handler(ctx, args, identity);
    },
  }) as RegisteredQuery<"public", ObjectType<Args>, Promise<Output>>;
}

/** Mutation that only requires an authenticated caller. */
export function authedMutation<Args extends PropertyValidators, Output>(
  spec: AuthedFunctionSpec<MutationCtx, Args, Output>
): RegisteredMutation<"public", ObjectType<Args>, Promise<Output>> {
  return mutation({
    args: spec.args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (ctx: any, args: any) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      return spec.handler(ctx, args, identity);
    },
  }) as RegisteredMutation<"public", ObjectType<Args>, Promise<Output>>;
}
