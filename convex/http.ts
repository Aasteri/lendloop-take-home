import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifySignedRequest, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "./lib/hmac";
import { reminderIdempotencyKey, todayUtc } from "./lib/dates";

const http = httpRouter();

function header(request: Request, name: string): string | null {
  return request.headers.get(name);
}

async function authorize(request: Request, body: string) {
  const secret = process.env.LENDLOOP_WEBHOOK_SECRET ?? "";
  return await verifySignedRequest({
    secret,
    body,
    signatureHeader: header(request, SIGNATURE_HEADER),
    timestampHeader: header(request, TIMESTAMP_HEADER),
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * n8n overdue-reminders workflow calls this daily.
 * Authenticated with the same HMAC used for outbound webhooks.
 * Body may be `{}` or `{ "asOf": "YYYY-MM-DD" }` for replay/testing.
 */
http.route({
  path: "/overdue-loans",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const auth = await authorize(request, body);
    if (!auth.ok) return json({ error: auth.reason }, 401);

    let asOf: string | undefined;
    if (body.trim()) {
      try {
        const parsed = JSON.parse(body) as { asOf?: string };
        if (parsed.asOf) asOf = parsed.asOf;
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
    }

    const loans = await ctx.runQuery(internal.loans.listOverdue, { asOf });
    return json({ asOf: asOf ?? todayUtc(), loans });
  }),
});

/**
 * n8n writes reminder delivery status back here.
 * Retries with the same idempotencyKey do not create a second event.
 */
http.route({
  path: "/automation/reminder",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const auth = await authorize(request, body);
    if (!auth.ok) return json({ error: auth.reason }, 401);

    let parsed: {
      loanId?: string;
      idempotencyKey?: string;
      channel?: string;
      message?: string;
    };
    try {
      parsed = JSON.parse(body) as typeof parsed;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (!parsed.loanId) return json({ error: "loanId_required" }, 400);

    const key =
      parsed.idempotencyKey || reminderIdempotencyKey(parsed.loanId, todayUtc());

    // Look up through the mutation so the unique index is the lock.
    const result = await ctx.runMutation(internal.requests.recordAutomationEvent, {
      loanId: parsed.loanId as never,
      type: "overdue_reminder",
      channel: parsed.channel ?? "log",
      message: parsed.message ?? "Overdue reminder sent",
      idempotencyKey: key,
      createdAt: Date.now(),
    });

    return json({ ok: true, created: result.created, id: result.id, idempotencyKey: key });
  }),
});

export default http;
