import Link from "next/link";

export function KeysNeeded({ action }: { action: string }) {
  return (
    <div className="rounded-2xl border border-sand-dark bg-white/70 p-8 shadow-card">
      <h1 className="font-display text-3xl text-ink">Almost ready</h1>
      <p className="mt-3 max-w-xl text-ink/80">
        {action} once Clerk and Convex keys are in{" "}
        <code className="rounded bg-sand px-1">.env.local</code>. Until then the
        app still builds, and unit tests cover signing, access control, and
        reminder idempotency. See the README for the setup steps.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-moss underline">
        Back to the noticeboard
      </Link>
    </div>
  );
}
