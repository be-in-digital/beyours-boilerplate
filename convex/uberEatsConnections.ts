import { internalQuery, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/uberEatsConnections";

// === Internal (called from "use node" OAuth actions) ===

/** Full row including encrypted tokens — node actions only. */
export const getConnection = internalQuery(defs.getConnection);

/** Upsert the connection after token exchange/refresh. */
export const upsert = internalMutation(defs.upsert);

// === Client-facing ===
