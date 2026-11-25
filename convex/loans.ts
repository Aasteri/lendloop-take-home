import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireActor, requireActorForQuery, ForbiddenError } from "./lib/auth";
import { canMarkLoanReturned, canViewAllLoans, canViewLoan } from "./lib/rbac";
import { daysOverdue, isOverdue, todayUtc } from "./lib/dates";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActorForQuery(ctx);
    const asLender = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .collect();
    const asBorrower = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    const byId = new Map();
    for (const loan of [...asLender, ...asBorrower]) byId.set(loan._id, loan);
    return await enrichLoans(ctx, [...byId.values()]);
  },
});

export const all = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActorForQuery(ctx);
    if (!canViewAllLoans({ id: user._id, role: user.role })) {
      throw new ForbiddenError("Only an admin can view every loan.");
    }
    const loans = await ctx.db.query("loans").collect();
    return await enrichLoans(ctx, loans);
  },
});

export const activity = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireActorForQuery(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return [];
    if (!canViewLoan({ id: user._id, role: user.role }, loan)) {
      throw new ForbiddenError();
    }
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
      .collect();
    return events.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireActor(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found.");
    if (!canMarkLoanReturned(user.actor, loan)) {
      throw new ForbiddenError("You can only mark your own loans as returned.");
    }
    if (loan.returnedAt) return;
    await ctx.db.patch(args.loanId, { returnedAt: Date.now() });
  },
});

export const listOverdue = internalQuery({
  args: { asOf: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const asOf = args.asOf ?? todayUtc();
    const now = Date.parse(`${asOf}T00:00:00.000Z`);
    const loans = await ctx.db.query("loans").collect();
    const overdue = [];
    for (const loan of loans) {
      if (!isOverdue(loan.endDate, loan.returnedAt, now)) continue;
      const tool = await ctx.db.get(loan.toolId);
      const borrower = await ctx.db.get(loan.borrowerId);
      if (!tool || !borrower) continue;
      overdue.push({
        loanId: loan._id,
        toolName: tool.name,
        endDate: loan.endDate,
        daysOverdue: daysOverdue(loan.endDate, now),
        borrowerName: borrower.name,
        borrowerEmail: borrower.email ?? null,
      });
    }
    return overdue;
  },
});

async function enrichLoans(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  loans: Array<import("./_generated/dataModel").Doc<"loans">>,
) {
  const results = [];
  for (const loan of loans) {
    const tool = await ctx.db.get(loan.toolId);
    const borrower = await ctx.db.get(loan.borrowerId);
    const lender = await ctx.db.get(loan.lenderId);
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
      .collect();
    const latestReminder = events
      .filter((event) => event.type === "overdue_reminder")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    results.push({
      ...loan,
      toolName: tool?.name ?? "Unknown tool",
      borrowerName: borrower?.name ?? "Neighbor",
      lenderName: lender?.name ?? "Neighbor",
      overdue: isOverdue(loan.endDate, loan.returnedAt),
      daysOverdue: loan.returnedAt ? 0 : daysOverdue(loan.endDate),
      latestReminder: latestReminder
        ? { message: latestReminder.message, createdAt: latestReminder.createdAt }
        : null,
    });
  }
  results.sort((a, b) => b._creationTime - a._creationTime);
  return results;
}
