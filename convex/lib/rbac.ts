/**
 * Pure access-control rules. Convex mutations call these after loading
 * the actor and the target records. The UI may hide controls, but a
 * rejected mutation is the source of truth.
 */

export type Role = "user" | "admin";

export type Actor = {
  id: string;
  role: Role;
};

export function canCreateListing(actor: Actor | null): boolean {
  return actor !== null;
}

export function canEditListing(actor: Actor | null, ownerId: string): boolean {
  return actor !== null && actor.id === ownerId;
}

/** Owners may delete their own listing. Admins use `canRemoveListing`. */
export function canDeleteOwnListing(actor: Actor | null, ownerId: string): boolean {
  return actor !== null && actor.id === ownerId;
}

export function canRemoveListing(actor: Actor | null): boolean {
  return actor?.role === "admin";
}

export function canRequestToBorrow(
  actor: Actor | null,
  ownerId: string,
): boolean {
  return actor !== null && actor.id !== ownerId;
}

export function canActOnIncomingRequest(
  actor: Actor | null,
  toolOwnerId: string,
): boolean {
  return actor !== null && actor.id === toolOwnerId;
}

export function canCancelOwnRequest(
  actor: Actor | null,
  borrowerId: string,
  status: string,
): boolean {
  return actor !== null && actor.id === borrowerId && status === "pending";
}

export function canMarkLoanReturned(
  actor: Actor | null,
  loan: { lenderId: string; borrowerId: string },
): boolean {
  if (actor === null) return false;
  return actor.id === loan.lenderId || actor.id === loan.borrowerId;
}

export function canViewAllLoans(actor: Actor | null): boolean {
  return actor?.role === "admin";
}

export function canMarkTrustedLender(actor: Actor | null): boolean {
  return actor?.role === "admin";
}

export function canViewLoan(
  actor: Actor | null,
  loan: { lenderId: string; borrowerId: string },
): boolean {
  if (actor === null) return false;
  if (actor.role === "admin") return true;
  return actor.id === loan.lenderId || actor.id === loan.borrowerId;
}

export function publicToolView<T extends { name: string; category: string }>(
  tool: T,
): { name: string; category: string } {
  return { name: tool.name, category: tool.category };
}
