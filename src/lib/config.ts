export function hasLiveClerk(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return key.startsWith("pk_") && !key.includes("placeholder");
}

export function hasLiveConvex(): boolean {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  return url.startsWith("https://") && !url.includes("placeholder");
}

export function showPreviewFixtures(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_FIXTURES === "1";
}
