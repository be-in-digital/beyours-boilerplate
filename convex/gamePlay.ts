import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/gamePlay";

/**
 * Public player-facing gamification endpoints.
 * Players are anonymous (QR scan at the table) — no auth on purpose.
 * All outcomes are resolved server-side in the shared defs.
 */

export const getSession = query(defs.getSession);

export const recordScan = mutation(defs.recordScan);

export const play = mutation(defs.play);

export const ensureReferralCode = mutation(defs.ensureReferralCode);

export const claim = mutation({
  args: defs.claim.args,
  handler: async (ctx, args) => {
    const result = await defs.claim.handler(ctx, args);

    // Send the prize email (best effort, never blocks the claim)
    if (!result.alreadyClaimed) {
      const play = await ctx.db.get(args.playId);
      const prize = play?.prizeId ? await ctx.db.get(play.prizeId) : null;
      const store = play ? await ctx.db.get(play.storeId) : null;
      if (play && prize && store) {
        await ctx.scheduler.runAfter(0, internal.gameEmail.sendPrizeEmail, {
          toEmail: args.email,
          firstName: args.firstName,
          storeName: store.name,
          prizeName: prize.name,
          prizeDescription: prize.description,
          code: result.code,
          expiresAt: result.expiresAt,
        });
      }
    }

    return result;
  },
});

export const getRedemptionByCode = query(defs.getRedemptionByCode);
