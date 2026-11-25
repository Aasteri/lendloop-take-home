import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActor, requireActorForQuery, requireUser, ForbiddenError } from "./lib/auth";
import { canMarkTrustedLender } from "./lib/rbac";

export const me = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await requireActorForQuery(ctx);
    } catch {
      return null;
    }
  },
});

/** Call once after sign-in so the users table stays in sync with Clerk. */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    return await requireUser(ctx);
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActorForQuery(ctx);
    if (user.role !== "admin") throw new ForbiddenError("Admin only.");
    const users = await ctx.db.query("users").collect();
    return users
      .map((entry) => ({
        _id: entry._id,
        name: entry.name,
        email: entry.email ?? null,
        role: entry.role,
        trustedLender: entry.trustedLender,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    if (!canMarkTrustedLender(user.actor)) {
      throw new ForbiddenError("Only an admin can mark a trusted lender.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    await ctx.db.patch(args.userId, { trustedLender: args.trusted });
  },
});
