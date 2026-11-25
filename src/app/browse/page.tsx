"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES, type Category } from "../../../convex/lib/categories";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";
import type { Id } from "../../../convex/_generated/dataModel";

export default function BrowsePage() {
  return (
    <AppFrame action="You can browse tools and request a loan">
      <LiveBrowse />
    </AppFrame>
  );
}

function LiveBrowse() {
  const ready = hasLiveClerk() && hasLiveConvex();
  const [category, setCategory] = useState<Category | "">("");
  const tools = useQuery(api.tools.listAuthenticated, ready ? { category: category || undefined } : "skip");
  const me = useQuery(api.users.me, ready ? {} : "skip");
  const request = useMutation(api.requests.create);
  const [message, setMessage] = useState<string | null>(null);

  async function onRequest(event: FormEvent<HTMLFormElement>, toolId: Id<"tools">) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage(null);
    try {
      await request({
        toolId,
        startDate: String(data.get("startDate")),
        endDate: String(data.get("endDate")),
      });
      setMessage("Request sent.");
      event.currentTarget.reset();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send that request.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">Browse tools</h1>
          <p className="mt-2 text-ink/70">Filter by category and request a date range.</p>
        </div>
        <label className="text-sm">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as Category | "")}
            className="ml-2 rounded-xl border border-sand-dark bg-white px-3 py-2"
          >
            <option value="">All</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <p className="mt-4 text-sm text-moss">{message}</p>}
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {tools === undefined && <p className="text-ink/60">Loading…</p>}
        {tools?.map((tool) => (
          <li key={tool._id} className="rounded-2xl border border-sand-dark bg-white/80 p-5 shadow-card">
            <p className="text-xs uppercase tracking-wider text-moss">{tool.category}</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl text-ink">{tool.name}</h2>
              <StatusBadge status={tool.availability.status} until={tool.availability.until} />
            </div>
            <p className="mt-2 text-sm text-ink/70">{tool.description}</p>
            <p className="mt-3 text-sm">
              {tool.ownerName}
              {tool.trustedLender && (
                <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs text-moss">
                  Trusted lender
                </span>
              )}
              <span className="text-ink/50"> · {tool.condition}</span>
            </p>
            {me && me._id !== tool.ownerId && (
              <form
                className="mt-4 flex flex-wrap items-end gap-3"
                onSubmit={(event) => onRequest(event, tool._id)}
              >
                <label className="text-xs">
                  From
                  <input
                    type="date"
                    name="startDate"
                    required
                    className="mt-1 block rounded-lg border border-sand-dark px-2 py-1"
                  />
                </label>
                <label className="text-xs">
                  To
                  <input
                    type="date"
                    name="endDate"
                    required
                    className="mt-1 block rounded-lg border border-sand-dark px-2 py-1"
                  />
                </label>
                <button className="rounded-full bg-moss px-3 py-1.5 text-sm text-paper">
                  Request
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
