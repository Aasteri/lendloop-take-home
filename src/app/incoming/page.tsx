"use client";

import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "../../../convex/_generated/api";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export default function IncomingPage() {
  return (
    <AppFrame action="You can review incoming requests">
      <LiveIncoming />
    </AppFrame>
  );
}

function LiveIncoming() {
  const ready = hasLiveClerk() && hasLiveConvex();
  const requests = useQuery(api.requests.incoming, ready ? {} : "skip");
  const approve = useMutation(api.requests.approve);
  const decline = useMutation(api.requests.decline);

  return (
    <div>
      <h1 className="font-display text-4xl text-ink">Incoming requests</h1>
      <p className="mt-2 text-ink/70">People who would like to borrow your tools.</p>
      <ul className="mt-8 space-y-4">
        {requests === undefined && <p className="text-ink/60">Loading…</p>}
        {requests?.length === 0 && <p className="text-ink/60">No incoming requests.</p>}
        {requests?.map((request) => (
          <li key={request._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-dark bg-white/80 p-5 shadow-card">
            <div>
              <h2 className="font-display text-2xl">{request.toolName}</h2>
              <p className="text-sm text-ink/70">
                {request.borrowerName} · {request.startDate} – {request.endDate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={request.status} />
              {request.status === "pending" && (
                <>
                  <button
                    className="rounded-full bg-moss px-3 py-1.5 text-sm text-paper"
                    onClick={() => void approve({ requestId: request._id })}
                  >
                    Approve
                  </button>
                  <button
                    className="text-sm text-clay underline"
                    onClick={() => void decline({ requestId: request._id })}
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
