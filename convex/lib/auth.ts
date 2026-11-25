import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { Actor } from "./rbac";

type Ctx = QueryCtx | MutationCtx;

export class AuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function adminIdSet(): Set<string> {
  const raw = process.env.ADMIN_CLERK_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function getIdentityOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new AuthError();
  return identity;
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function requireUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await getIdentityOrThrow(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  const name =
    identity.name?.trim() ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim() ||
    identity.email ||
    "Neighbor";
  const email = identity.email ?? undefined;
  const shouldBeAdmin = adminIdSet().has(identity.subject);

  if (existing) {
    const patch: Partial<Doc<"users">> = {};
    if (existing.name !== name) patch.name = name;
    if (email && existing.email !== email) patch.email = email;
    if (shouldBeAdmin && existing.role !== "admin") patch.role = "admin";
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
      return { ...existing, ...patch };
    }
    return existing;
  }

  const id = await ctx.db.insert("users", {
    clerkUserId: identity.subject,
    name,
    email,
    role: shouldBeAdmin ? "admin" : "user",
    trustedLender: false,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function requireActor(ctx: MutationCtx): Promise<Doc<"users"> & { actor: Actor }> {
  const user = await requireUser(ctx);
  return { ...user, actor: { id: user._id, role: user.role } };
}

export async function requireActorForQuery(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new AuthError();
  return user;
}

export function toActor(user: Doc<"users">): Actor {
  return { id: user._id, role: user.role };
}
