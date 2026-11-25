"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";

export function AppProviders({ children }: { children: ReactNode }) {
  const clerkReady = hasLiveClerk();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const convexReady = hasLiveConvex();

  const client = useMemo(() => {
    if (!convexReady) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexReady, convexUrl]);

  if (clerkReady && client) {
    return (
      <ClerkProvider>
        <ConvexProviderWithClerk client={client} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  if (clerkReady) {
    return <ClerkProvider>{children}</ClerkProvider>;
  }

  return <>{children}</>;
}
