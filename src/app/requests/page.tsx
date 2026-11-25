"use client";

import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "../../../convex/_generated/api";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export default function RequestsPage() {
  return (
    <AppFrame action="You can view your borrow requests">
      <LiveRequests />
    </AppFrame>
  );
}

function LiveRequests() {
  const ready = hasLiveClerk() && hasLiveConvex();
  const requests = useQuery(api.requests.mine, ready ? {} : "skip");
  const cancel = useMutation(api.requests.cancel);

  return (
    <div>
      <h1 className="font-display text-4xl text-ink">My requests</h1>
      <p className="mt-2 text-ink/70">Borrow requests you have sent.</p>
      <ul className="mt-8 space-y-4">
        {requests === undefined && <p className="text-ink/60">Loading…</p>}
        {requests?.length === 0 && <p className="text-ink/60">No requests yet.</p>}
        {requests?.map((request) => (
          <li key={request._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-dark bg-white/80 p-5 shadow-card">
            <div>
              <h2 className="font-display text-2xl">{request.toolName}</h2>
              <p className="text-sm text-ink/70">
                {request.startDate} – {request.endDate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={request.status} />
              {request.status === "pending" && (
                <button
                  className="text-sm text-clay underline"
                  onClick={() => void cancel({ requestId: request._id })}
                >
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
