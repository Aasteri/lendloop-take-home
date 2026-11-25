import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { category, condition } from "./schema";
import { requireActor, requireActorForQuery, getCurrentUser, ForbiddenError } from "./lib/auth";
import {
  canCreateListing,
  canEditListing,
  canDeleteOwnListing,
  canRemoveListing,
  publicToolView,
} from "./lib/rbac";
import { rangesOverlap } from "./lib/dates";

export const publicAvailable = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").collect();
    const visible = [];
    for (const tool of tools) {
      if (tool.removedAt) continue;
      const onLoan = await hasActiveLoan(ctx, tool._id);
      if (onLoan) continue;
      visible.push(publicToolView(tool));
    }
    visible.sort((a, b) => a.name.localeCompare(b.name));
    return visible;
  },
});

export const listAuthenticated = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    await requireActorForQuery(ctx);
    const tools = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect()
      : await ctx.db.query("tools").collect();

    const results = [];
    for (const tool of tools) {
      if (tool.removedAt) continue;
      const owner = await ctx.db.get(tool.ownerId);
      const availability = await availabilityFor(ctx, tool._id);
      results.push({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        ownerId: tool.ownerId,
        ownerName: owner?.name ?? "Neighbor",
        trustedLender: owner?.trustedLender ?? false,
        availability,
      });
    }
    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActorForQuery(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const results = [];
    for (const tool of tools) {
      if (tool.removedAt) continue;
      const availability = await availabilityFor(ctx, tool._id);
      results.push({ ...tool, availability });
    }
    return results;
  },
});

export const get = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removedAt) return null;
    if (!user) return publicToolView(tool);
    const owner = await ctx.db.get(tool.ownerId);
    const availability = await availabilityFor(ctx, tool._id);
    return {
      ...tool,
      ownerName: owner?.name ?? "Neighbor",
      trustedLender: owner?.trustedLender ?? false,
      availability,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category,
    condition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    if (!canCreateListing(user.actor)) throw new ForbiddenError();
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Name must be 2–80 characters.");
    if (description.length < 4 || description.length > 500) {
      throw new Error("Description must be 4–500 characters.");
    }
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name,
      category: args.category,
      condition: args.condition,
      description,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removedAt) throw new Error("Listing not found.");
    if (!canEditListing(user.actor, tool.ownerId)) {
      throw new ForbiddenError("You can only edit your own listings.");
    }
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Name must be 2–80 characters.");
    if (description.length < 4 || description.length > 500) {
      throw new Error("Description must be 4–500 characters.");
    }
    await ctx.db.patch(args.toolId, {
      name,
      category: args.category,
      condition: args.condition,
      description,
    });
  },
});

export const removeOwn = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removedAt) throw new Error("Listing not found.");
    if (!canDeleteOwnListing(user.actor, tool.ownerId)) {
      throw new ForbiddenError("You can only delete your own listings.");
    }
    await ctx.db.patch(args.toolId, { removedAt: Date.now(), removedBy: user._id });
  },
});

export const adminRemove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    if (!canRemoveListing(user.actor)) {
      throw new ForbiddenError("Only an admin can remove any listing.");
    }
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removedAt) throw new Error("Listing not found.");
    await ctx.db.patch(args.toolId, { removedAt: Date.now(), removedBy: user._id });
  },
});

export async function hasActiveLoan(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  toolId: import("./_generated/dataModel").Id<"tools">,
  startDate?: string,
  endDate?: string,
): Promise<boolean> {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
  for (const loan of loans) {
    if (loan.returnedAt) continue;
    if (!startDate || !endDate) return true;
    if (rangesOverlap(loan.startDate, loan.endDate, startDate, endDate)) return true;
  }
  return false;
}

async function availabilityFor(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  toolId: import("./_generated/dataModel").Id<"tools">,
) {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
  const active = loans.filter((loan) => !loan.returnedAt);
  if (active.length === 0) return { status: "available" as const, until: null as string | null };
  const until = active.reduce((max, loan) => (loan.endDate > max ? loan.endDate : max), active[0].endDate);
  return { status: "on_loan" as const, until };
}
