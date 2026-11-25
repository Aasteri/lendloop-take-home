import { describe, expect, it } from "vitest";
import {
  canCreateListing,
  canEditListing,
  canDeleteOwnListing,
  canRemoveListing,
  canRequestToBorrow,
  canActOnIncomingRequest,
  canCancelOwnRequest,
  canMarkLoanReturned,
  canViewAllLoans,
  canMarkTrustedLender,
  canViewLoan,
  publicToolView,
} from "../convex/lib/rbac";

const owner = { id: "user_owner", role: "user" as const };
const borrower = { id: "user_borrower", role: "user" as const };
const stranger = { id: "user_other", role: "user" as const };
const admin = { id: "user_admin", role: "admin" as const };

describe("listing rules", () => {
  it("lets any signed-in user create a listing", () => {
    expect(canCreateListing(owner)).toBe(true);
    expect(canCreateListing(null)).toBe(false);
  });

  it("lets a user edit or delete only their own listing", () => {
    expect(canEditListing(owner, owner.id)).toBe(true);
    expect(canEditListing(stranger, owner.id)).toBe(false);
    expect(canEditListing(admin, owner.id)).toBe(false);
    expect(canDeleteOwnListing(owner, owner.id)).toBe(true);
    expect(canDeleteOwnListing(admin, owner.id)).toBe(false);
  });

  it("lets only an admin remove any listing", () => {
    expect(canRemoveListing(admin)).toBe(true);
    expect(canRemoveListing(owner)).toBe(false);
    expect(canRemoveListing(null)).toBe(false);
  });
});

describe("request and loan rules", () => {
  it("blocks borrowing your own tool", () => {
    expect(canRequestToBorrow(borrower, owner.id)).toBe(true);
    expect(canRequestToBorrow(owner, owner.id)).toBe(false);
    expect(canRequestToBorrow(null, owner.id)).toBe(false);
  });

  it("lets only the tool owner approve or decline", () => {
    expect(canActOnIncomingRequest(owner, owner.id)).toBe(true);
    expect(canActOnIncomingRequest(borrower, owner.id)).toBe(false);
    expect(canActOnIncomingRequest(admin, owner.id)).toBe(false);
  });

  it("lets a borrower cancel only a pending request", () => {
    expect(canCancelOwnRequest(borrower, borrower.id, "pending")).toBe(true);
    expect(canCancelOwnRequest(borrower, borrower.id, "approved")).toBe(false);
    expect(canCancelOwnRequest(owner, borrower.id, "pending")).toBe(false);
  });

  it("lets the lender or borrower mark a loan returned", () => {
    const loan = { lenderId: owner.id, borrowerId: borrower.id };
    expect(canMarkLoanReturned(owner, loan)).toBe(true);
    expect(canMarkLoanReturned(borrower, loan)).toBe(true);
    expect(canMarkLoanReturned(stranger, loan)).toBe(false);
    expect(canMarkLoanReturned(admin, loan)).toBe(false);
  });

  it("lets an admin view every loan and mark a trusted lender", () => {
    expect(canViewAllLoans(admin)).toBe(true);
    expect(canViewAllLoans(owner)).toBe(false);
    expect(canMarkTrustedLender(admin)).toBe(true);
    expect(canMarkTrustedLender(owner)).toBe(false);
    const loan = { lenderId: owner.id, borrowerId: borrower.id };
    expect(canViewLoan(admin, loan)).toBe(true);
    expect(canViewLoan(owner, loan)).toBe(true);
    expect(canViewLoan(stranger, loan)).toBe(false);
  });
});

describe("public tool projection", () => {
  it("exposes only name and category", () => {
    expect(
      publicToolView({
        name: "Hammer",
        category: "home",
        ownerId: "secret",
        description: "secret",
        condition: "good",
      }),
    ).toEqual({ name: "Hammer", category: "home" });
  });
});
