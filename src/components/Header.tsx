"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { hasLiveClerk } from "@/lib/config";

const nav = [
  { href: "/browse", label: "Browse" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
  { href: "/loans", label: "Loans" },
];

export function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const clerk = hasLiveClerk();
  return (
    <header className="border-b border-sand-dark bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="font-display text-2xl tracking-tight text-moss">
          LendLoop
        </Link>
        {clerk ? (
          <>
            <SignedIn>
              <nav className="hidden items-center gap-5 text-sm text-ink/80 md:flex">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-moss">
                    {item.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link href="/admin" className="hover:text-moss">
                    Admin
                  </Link>
                )}
              </nav>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="redirect">
                <button className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper hover:bg-moss-dark">
                  Sign in to lend or borrow
                </button>
              </SignInButton>
            </SignedOut>
          </>
        ) : (
          <Link
            href="/sign-in"
            className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper"
          >
            Sign in to lend or borrow
          </Link>
        )}
      </div>
    </header>
  );
}
