import * as defs from "@be-in-digital/convex-functions/orphanProducts";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

const orphanStoreId = storeIdFromDocument("Orphan product not found");

export const match = storeMutation({
  permission: "products:write",
  args: defs.match.args,
  storeIdFrom: orphanStoreId,
  handler: (ctx, args) => defs.match.handler(ctx, args),
});
