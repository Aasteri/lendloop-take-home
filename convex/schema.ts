import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const category = v.union(
  v.literal("power tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("automotive"),
  v.literal("home"),
  v.literal("electronics"),
  v.literal("other"),
);

export const condition = v.union(
  v.literal("new"),
  v.literal("excellent"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("well used"),
);

export const requestStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
    trustedLender: v.boolean(),
  })
    .index("by_clerkUserId", ["clerkUserId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
    removedAt: v.optional(v.number()),
    removedBy: v.optional(v.id("users")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  borrowRequests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: requestStatus,
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_tool_status", ["toolId", "status"]),

  loans: defineTable({
    requestId: v.id("borrowRequests"),
    toolId: v.id("tools"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_request", ["requestId"]),

  automationEvents: defineTable({
    loanId: v.optional(v.id("loans")),
    requestId: v.optional(v.id("borrowRequests")),
    type: v.string(),
    channel: v.string(),
    message: v.string(),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_loan", ["loanId"])
    .index("by_request", ["requestId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  webhookDeliveries: defineTable({
    eventId: v.string(),
    kind: v.string(),
    status: v.union(v.literal("pending"), v.literal("ok"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    lastAttemptAt: v.optional(v.number()),
  }).index("by_eventId", ["eventId"]),
});
