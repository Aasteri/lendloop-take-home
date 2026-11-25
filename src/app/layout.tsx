import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { SetupBanner } from "@/components/SetupBanner";
import { hasLiveClerk, hasLiveConvex } from "@/lib/config";
import { EnsureUser } from "@/components/EnsureUser";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don’t.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const live = hasLiveClerk() && hasLiveConvex();
  return (
    <html lang="en" className={`${fraunces.variable} ${sora.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders>
          {live && <EnsureUser />}
          <SetupBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
