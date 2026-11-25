"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { ToolForm } from "@/components/ToolForm";
import { api } from "../../../../../convex/_generated/api";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function EditListingPage() {
  return (
    <AppFrame action="You can edit your listing">
      <LiveEdit />
    </AppFrame>
  );
}

function LiveEdit() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ready = hasLiveClerk() && hasLiveConvex();
  const toolId = params.id as Id<"tools">;
  const tool = useQuery(api.tools.get, ready ? { toolId } : "skip");
  const update = useMutation(api.tools.update);

  if (tool === undefined) return <p>Loading…</p>;
  if (tool === null || !("condition" in tool)) return <p>Listing not found.</p>;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl text-ink">Edit listing</h1>
      <div className="mt-8">
        <ToolForm
          submitLabel="Save changes"
          initial={{
            name: tool.name,
            category: tool.category,
            condition: tool.condition,
            description: tool.description,
          }}
          onSubmit={async (values) => {
            await update({ toolId, ...values });
            router.push("/listings");
          }}
        />
      </div>
    </div>
  );
}
