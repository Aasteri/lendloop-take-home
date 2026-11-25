"use client";

import { FormEvent, useState } from "react";
import { CATEGORIES, CONDITIONS } from "../../convex/lib/categories";

export type ToolFormValues = {
  name: string;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number];
  description: string;
};

export function ToolForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<ToolFormValues>;
  submitLabel: string;
  onSubmit: (values: ToolFormValues) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values: ToolFormValues = {
      name: String(data.get("name") ?? ""),
      category: String(data.get("category") ?? "other") as ToolFormValues["category"],
      condition: String(data.get("condition") ?? "good") as ToolFormValues["condition"],
      description: String(data.get("description") ?? ""),
    };
    setPending(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={initial?.name ?? ""}
          className="mt-1 w-full rounded-xl border border-sand-dark bg-white px-3 py-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select
            name="category"
            defaultValue={initial?.category ?? "home"}
            className="mt-1 w-full rounded-xl border border-sand-dark bg-white px-3 py-2"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Condition</span>
          <select
            name="condition"
            defaultValue={initial?.condition ?? "good"}
            className="mt-1 w-full rounded-xl border border-sand-dark bg-white px-3 py-2"
          >
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Short description</span>
        <textarea
          name="description"
          required
          minLength={4}
          maxLength={500}
          rows={4}
          defaultValue={initial?.description ?? ""}
          className="mt-1 w-full rounded-xl border border-sand-dark bg-white px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-clay">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-moss px-5 py-2 text-sm font-medium text-paper hover:bg-moss-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
