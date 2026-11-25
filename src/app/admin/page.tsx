"use client";

import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "../../../convex/_generated/api";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export default function AdminPage() {
  return (
    <AppFrame action="Admins can review loans and listings" isAdmin>
      <LiveAdmin />
    </AppFrame>
  );
}

function LiveAdmin() {
  const ready = hasLiveClerk() && hasLiveConvex();
  const me = useQuery(api.users.me, ready ? {} : "skip");
  const loans = useQuery(api.loans.all, ready && me?.role === "admin" ? {} : "skip");
  const users = useQuery(api.users.listForAdmin, ready && me?.role === "admin" ? {} : "skip");
  const tools = useQuery(api.tools.listAuthenticated, ready && me?.role === "admin" ? {} : "skip");
  const setTrusted = useMutation(api.users.setTrustedLender);
  const remove = useMutation(api.tools.adminRemove);

  if (me && me.role !== "admin") {
    return <p className="text-ink/70">This page is limited to admins.</p>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-4xl text-ink">Admin</h1>
        <p className="mt-2 text-ink/70">
          Remove any listing, view every loan, and mark a neighbor as a trusted lender.
        </p>
      </div>

      <section>
        <h2 className="font-display text-2xl">Lenders</h2>
        <ul className="mt-4 divide-y divide-sand-dark rounded-2xl border border-sand-dark bg-white/80">
          {users?.map((user) => (
            <li key={user._id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-ink/60">{user.email ?? "No email on file"}</p>
              </div>
              <button
                className="text-sm text-moss underline"
                onClick={() => void setTrusted({ userId: user._id, trusted: !user.trustedLender })}
              >
                {user.trustedLender ? "Remove trusted mark" : "Mark trusted lender"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Listings</h2>
        <ul className="mt-4 space-y-3">
          {tools?.map((tool) => (
            <li key={tool._id} className="flex items-center justify-between rounded-2xl border border-sand-dark bg-white/80 px-5 py-3">
              <div>
                <p className="font-medium">{tool.name}</p>
                <p className="text-xs text-ink/60">{tool.ownerName} · {tool.category}</p>
              </div>
              <button
                className="text-sm text-clay underline"
                onClick={() => void remove({ toolId: tool._id })}
              >
                Remove listing
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">All loans</h2>
        <ul className="mt-4 space-y-3">
          {loans?.map((loan) => (
            <li key={loan._id} className="rounded-2xl border border-sand-dark bg-white/80 px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p>
                  <span className="font-medium">{loan.toolName}</span>
                  <span className="text-sm text-ink/60">
                    {" "}
                    · {loan.lenderName} → {loan.borrowerName} · {loan.startDate} – {loan.endDate}
                  </span>
                </p>
                <StatusBadge
                  status={loan.returnedAt ? "approved" : loan.overdue ? "overdue" : "on_loan"}
                  until={loan.returnedAt ? null : loan.endDate}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
