import { v } from "convex/values";
import { ActionCtx, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { signPayload, signatureHeaders } from "./lib/hmac";

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [0, 15_000, 60_000, 5 * 60_000, 30 * 60_000];

export const record = internalMutation({
  args: {
    eventId: v.string(),
    kind: v.string(),
    status: v.union(v.literal("pending"), v.literal("ok"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    const fields = {
      kind: args.kind,
      status: args.status,
      attempts: args.attempts,
      lastError: args.lastError,
      lastAttemptAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("webhookDeliveries", { eventId: args.eventId, ...fields });
  },
});

export const retry = internalAction({
  args: {
    eventId: v.string(),
    kind: v.string(),
    url: v.string(),
    body: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
    if (!secret) return;
    await postSignedWebhook({
      ctx,
      eventId: args.eventId,
      kind: args.kind,
      url: args.url,
      secret,
      body: args.body,
      attempt: args.attempt,
    });
  },
});

export async function postSignedWebhook(args: {
  ctx: ActionCtx;
  eventId: string;
  kind: string;
  url: string;
  secret: string;
  body: string;
  attempt: number;
}): Promise<void> {
  const { timestamp, signature } = await signPayload(args.secret, args.body);
  try {
    const response = await fetch(args.url, {
      method: "POST",
      headers: signatureHeaders(timestamp, signature),
      body: args.body,
    });
    if (!response.ok) {
      throw new Error(`Webhook responded ${response.status}`);
    }
    await args.ctx.runMutation(internal.deliveries.record, {
      eventId: args.eventId,
      kind: args.kind,
      status: "ok",
      attempts: args.attempt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const failed = args.attempt >= MAX_ATTEMPTS;
    await args.ctx.runMutation(internal.deliveries.record, {
      eventId: args.eventId,
      kind: args.kind,
      status: failed ? "failed" : "pending",
      attempts: args.attempt,
      lastError: message,
    });
    if (!failed) {
      const wait = BACKOFF_MS[Math.min(args.attempt, BACKOFF_MS.length - 1)];
      await args.ctx.scheduler.runAfter(wait, internal.deliveries.retry, {
        eventId: args.eventId,
        kind: args.kind,
        url: args.url,
        body: args.body,
        attempt: args.attempt + 1,
      });
    }
  }
}
