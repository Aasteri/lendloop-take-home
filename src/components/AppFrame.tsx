import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";
import { KeysNeeded } from "@/components/KeysNeeded";

export function AppFrame({
  children,
  isAdmin,
  action,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  action: string;
}) {
  const ready = hasLiveClerk() && hasLiveConvex();
  return (
    <>
      <Header isAdmin={isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        {ready ? children : <KeysNeeded action={action} />}
      </main>
    </>
  );
}
