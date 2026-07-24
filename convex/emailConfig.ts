import * as defs from "@be-in-digital/convex-functions/emailConfig";
import { storeQuery, storeMutation } from "./lib/storeFunctions";

// === Queries (auth-protected — contains fromEmail/replyToEmail) ===

export const get = storeQuery({
  args: defs.get.args,
  handler: (ctx, args) => defs.get.handler(ctx, args),
});

// === Mutations (auth-protected) ===

export const upsert = storeMutation({
  args: defs.upsert.args,
  handler: (ctx, args) => defs.upsert.handler(ctx, args),
});
