"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Header } from "@/components/Header";
import { hasLiveConvex, showPreviewFixtures } from "@/lib/config";
import { PREVIEW_TOOLS } from "@/lib/preview";
import { api } from "../../convex/_generated/api";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-moss">Neighborhood lending</p>
        <h1 className="mt-3 font-display text-5xl leading-tight text-ink md:text-6xl">
          LendLoop
        </h1>
        <p className="mt-4 max-w-xl text-xl text-ink/75">
          Borrow what you need. Lend what you don’t.
        </p>
        <PublicTools />
      </main>
    </>
  );
}

function PublicTools() {
  if (!hasLiveConvex()) {
    const tools = showPreviewFixtures() ? PREVIEW_TOOLS : [];
    return <ToolBoard tools={[...tools]} preview={showPreviewFixtures()} />;
  }
  return <LivePublicTools />;
}

function LivePublicTools() {
  const tools = useQuery(api.tools.publicAvailable);
  return <ToolBoard tools={tools} preview={false} />;
}

function ToolBoard({
  tools,
  preview,
}: {
  tools: Array<{ name: string; category: string }> | undefined;
  preview: boolean;
}) {
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink">Available now</h2>
          <p className="mt-1 text-sm text-ink/60">
            Names and categories only — sign in to see owners, condition, and dates.
            {preview ? " Sample preview data is shown because Convex is not connected." : ""}
          </p>
        </div>
        <Link
          href="/sign-in"
          className="hidden rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper hover:bg-moss-dark sm:inline-block"
        >
          Sign in to lend or borrow
        </Link>
      </div>
      {tools === undefined ? (
        <p className="mt-8 text-ink/60">Loading the noticeboard…</p>
      ) : tools.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-sand-dark bg-white/50 px-6 py-12 text-ink/60">
          No tools are available to borrow right now. Sign in to list one of your own.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li
              key={`${tool.category}-${tool.name}`}
              className="rounded-2xl border border-sand-dark bg-white/80 p-5 shadow-card"
            >
              <p className="text-xs uppercase tracking-wider text-moss">{tool.category}</p>
              <p className="mt-2 font-display text-2xl text-ink">{tool.name}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
