"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { AppFrame } from "@/components/AppFrame";
import { ToolForm } from "@/components/ToolForm";
import { api } from "../../../../convex/_generated/api";

export default function NewListingPage() {
  return (
    <AppFrame action="You can list a tool">
      <LiveNewListing />
    </AppFrame>
  );
}

function LiveNewListing() {
  const router = useRouter();
  const create = useMutation(api.tools.create);
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl text-ink">List a tool</h1>
      <p className="mt-2 mb-8 text-ink/70">Neighbors will see this on the board once you save it.</p>
      <ToolForm
        submitLabel="Publish listing"
        onSubmit={async (values) => {
          await create(values);
          router.push("/listings");
        }}
      />
    </div>
  );
}
