import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { postSignedWebhook } from "./deliveries";

export const dispatchRequestEvent = internalAction({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args): Promise<{ skipped: boolean; reason?: string; eventId?: string }> => {
    const url = process.env.N8N_REQUEST_WEBHOOK_URL;
    const secret = process.env.LENDLOOP_WEBHOOK_SECRET;
    if (!url || !secret) {
      console.warn(
        "Skipping request webhook: N8N_REQUEST_WEBHOOK_URL or LENDLOOP_WEBHOOK_SECRET is not set.",
      );
      return { skipped: true };
    }

    const payload = await ctx.runQuery(internal.requests.getEventPayload, {
      requestId: args.requestId,
    });
    if (!payload) return { skipped: true, reason: "missing_request" };

    const eventId = `request:${payload.requestId}:${payload.status}`;
    const body = JSON.stringify({
      event: "borrow_request.changed",
      eventId,
      requestId: payload.requestId,
      status: payload.status,
      startDate: payload.startDate,
      endDate: payload.endDate,
      toolName: payload.toolName,
      category: payload.category,
      notify:
        payload.status === "pending"
          ? { name: payload.ownerName, email: payload.ownerEmail, reason: "incoming_request" }
          : { name: payload.borrowerName, email: payload.borrowerEmail, reason: "status_update" },
    });

    await postSignedWebhook({
      ctx,
      eventId,
      kind: "borrow_request.changed",
      url,
      secret,
      body,
      attempt: 1,
    });
    return { skipped: false, eventId };
  },
});
