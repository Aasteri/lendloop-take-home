import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireActor, requireActorForQuery, ForbiddenError } from "./lib/auth";
import {
  canRequestToBorrow,
  canActOnIncomingRequest,
  canCancelOwnRequest,
} from "./lib/rbac";
import { isValidRange } from "./lib/dates";
import { hasActiveLoan } from "./tools";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActorForQuery(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    return await enrichRequests(ctx, requests);
  },
});

export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActorForQuery(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const toolIds = new Set(tools.map((tool) => tool._id));
    const all = await ctx.db.query("borrowRequests").collect();
    const mineIncoming = all.filter((request) => toolIds.has(request.toolId));
    return await enrichRequests(ctx, mineIncoming);
  },
});

export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.removedAt) throw new Error("Listing not found.");
    if (!canRequestToBorrow(user.actor, tool.ownerId)) {
      throw new ForbiddenError("You cannot request to borrow your own tool.");
    }
    if (!isValidRange(args.startDate, args.endDate)) {
      throw new Error("Please choose a valid date range.");
    }
    if (await hasActiveLoan(ctx, tool._id, args.startDate, args.endDate)) {
      throw new Error("That tool is already booked for those dates.");
    }
    const existing = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
      .collect();
    if (existing.some((request) => request.borrowerId === user._id)) {
      throw new Error("You already have a pending request for this tool.");
    }
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      borrowerId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.dispatchRequestEvent, {
      requestId,
    });
    return requestId;
  },
});

export const approve = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found.");
    const tool = await ctx.db.get(request.toolId);
    if (!tool || tool.removedAt) throw new Error("Listing not found.");
    if (!canActOnIncomingRequest(user.actor, tool.ownerId)) {
      throw new ForbiddenError("You can only approve requests for your own tools.");
    }
    if (request.status !== "pending") throw new Error("Only pending requests can be approved.");
    if (await hasActiveLoan(ctx, tool._id, request.startDate, request.endDate)) {
      throw new Error("That tool is already booked for those dates.");
    }
    await ctx.db.patch(args.requestId, { status: "approved" });
    const loanId = await ctx.db.insert("loans", {
      requestId: request._id,
      toolId: tool._id,
      lenderId: tool.ownerId,
      borrowerId: request.borrowerId,
      startDate: request.startDate,
      endDate: request.endDate,
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.dispatchRequestEvent, {
      requestId: args.requestId,
    });
    return loanId;
  },
});

export const decline = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found.");
    const tool = await ctx.db.get(request.toolId);
    if (!tool) throw new Error("Listing not found.");
    if (!canActOnIncomingRequest(user.actor, tool.ownerId)) {
      throw new ForbiddenError("You can only decline requests for your own tools.");
    }
    if (request.status !== "pending") throw new Error("Only pending requests can be declined.");
    await ctx.db.patch(args.requestId, { status: "declined" });
    await ctx.scheduler.runAfter(0, internal.webhooks.dispatchRequestEvent, {
      requestId: args.requestId,
    });
  },
});

export const cancel = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found.");
    if (!canCancelOwnRequest(user.actor, request.borrowerId, request.status)) {
      throw new ForbiddenError("You can only cancel your own pending requests.");
    }
    await ctx.db.patch(args.requestId, { status: "cancelled" });
    await ctx.scheduler.runAfter(0, internal.webhooks.dispatchRequestEvent, {
      requestId: args.requestId,
    });
  },
});

export const getEventPayload = internalQuery({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;
    const tool = await ctx.db.get(request.toolId);
    const borrower = await ctx.db.get(request.borrowerId);
    const owner = tool ? await ctx.db.get(tool.ownerId) : null;
    if (!tool || !borrower || !owner) return null;
    // Data minimization: n8n only receives what it needs to notify the
    // relevant person and describe the event. No street addresses, no
    // Clerk IDs, no extra profile fields.
    return {
      requestId: request._id,
      status: request.status,
      startDate: request.startDate,
      endDate: request.endDate,
      toolName: tool.name,
      category: tool.category,
      borrowerName: borrower.name,
      borrowerEmail: borrower.email ?? null,
      ownerName: owner.name,
      ownerEmail: owner.email ?? null,
    };
  },
});

export const recordAutomationEvent = internalMutation({
  args: {
    requestId: v.optional(v.id("borrowRequests")),
    loanId: v.optional(v.id("loans")),
    type: v.string(),
    channel: v.string(),
    message: v.string(),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) return { created: false, id: existing._id };
    const id = await ctx.db.insert("automationEvents", args);
    return { created: true, id };
  },
});

async function enrichRequests(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  requests: Array<import("./_generated/dataModel").Doc<"borrowRequests">>,
) {
  const enriched = [];
  for (const request of requests) {
    const tool = await ctx.db.get(request.toolId);
    const borrower = await ctx.db.get(request.borrowerId);
    enriched.push({
      ...request,
      toolName: tool?.name ?? "Unknown tool",
      category: tool?.category,
      borrowerName: borrower?.name ?? "Neighbor",
    });
  }
  enriched.sort((a, b) => b._creationTime - a._creationTime);
  return enriched;
}
