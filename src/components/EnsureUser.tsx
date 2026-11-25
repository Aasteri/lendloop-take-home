"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

/** Mount only inside ConvexProviderWithClerk after a successful sign-in path. */
export function EnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);

  useEffect(() => {
    if (!isAuthenticated) return;
    void ensure({});
  }, [isAuthenticated, ensure]);

  return null;
}
