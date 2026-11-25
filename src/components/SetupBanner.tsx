import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export function SetupBanner() {
  const missing: string[] = [];
  if (!hasLiveClerk()) missing.push("Clerk");
  if (!hasLiveConvex()) missing.push("Convex");
  if (missing.length === 0) return null;
  return (
    <div className="border-b border-sand-dark bg-sand px-4 py-3 text-sm text-ink">
      <p>
        Running in setup mode — {missing.join(" and ")} keys are not configured yet.
        Copy <code className="rounded bg-paper px-1">.env.example</code> to{" "}
        <code className="rounded bg-paper px-1">.env.local</code>, add your keys, and restart.
        The README covers the full walkthrough.
      </p>
    </div>
  );
}
