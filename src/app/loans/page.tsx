"use client";

import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "../../../convex/_generated/api";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export default function LoansPage() {
  return (
    <AppFrame action="You can view your loans">
      <LiveLoans />
    </AppFrame>
  );
}

function LiveLoans() {
  const ready = hasLiveClerk() && hasLiveConvex();
  const loans = useQuery(api.loans.mine, ready ? {} : "skip");
  const markReturned = useMutation(api.loans.markReturned);

  return (
    <div>
      <h1 className="font-display text-4xl text-ink">Loans</h1>
      <p className="mt-2 text-ink/70">Items you are borrowing or have lent out.</p>
      <ul className="mt-8 space-y-4">
        {loans === undefined && <p className="text-ink/60">Loading…</p>}
        {loans?.length === 0 && <p className="text-ink/60">No loans yet.</p>}
        {loans?.map((loan) => (
          <li key={loan._id} className="rounded-2xl border border-sand-dark bg-white/80 p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">{loan.toolName}</h2>
                <p className="text-sm text-ink/70">
                  {loan.lenderName} → {loan.borrowerName} · {loan.startDate} – {loan.endDate}
                </p>
                {loan.latestReminder && (
                  <p className="mt-2 text-xs text-clay">
                    Reminder sent {new Date(loan.latestReminder.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {loan.returnedAt ? (
                  <StatusBadge status="approved" />
                ) : loan.overdue ? (
                  <StatusBadge status="overdue" />
                ) : (
                  <StatusBadge status="on_loan" until={loan.endDate} />
                )}
                {!loan.returnedAt && (
                  <button
                    className="rounded-full bg-moss px-3 py-1.5 text-sm text-paper"
                    onClick={() => void markReturned({ loanId: loan._id })}
                  >
                    Mark returned
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
