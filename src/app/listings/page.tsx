"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "../../../convex/_generated/api";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export default function ListingsPage() {
  return (
    <AppFrame action="You can manage your listings">
      <LiveListings />
    </AppFrame>
  );
}

function LiveListings() {
  const ready = hasLiveClerk() && hasLiveConvex();
  const tools = useQuery(api.tools.mine, ready ? {} : "skip");
  const removeOwn = useMutation(api.tools.removeOwn);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">My listings</h1>
          <p className="mt-2 text-ink/70">Tools you are willing to lend.</p>
        </div>
        <Link href="/listings/new" className="rounded-full bg-moss px-4 py-2 text-sm text-paper">
          List a tool
        </Link>
      </div>
      <ul className="mt-8 space-y-4">
        {tools === undefined && <p className="text-ink/60">Loading…</p>}
        {tools?.length === 0 && <p className="text-ink/60">You have not listed any tools yet.</p>}
        {tools?.map((tool) => (
          <li key={tool._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-dark bg-white/80 p-5 shadow-card">
            <div>
              <p className="text-xs uppercase tracking-wider text-moss">{tool.category}</p>
              <h2 className="font-display text-2xl">{tool.name}</h2>
              <p className="text-sm text-ink/70">{tool.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={tool.availability.status} until={tool.availability.until} />
              <Link href={`/listings/${tool._id}/edit`} className="text-sm text-moss underline">
                Edit
              </Link>
              <button
                className="text-sm text-clay underline"
                onClick={() => void removeOwn({ toolId: tool._id })}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
