import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  isValidRange,
  rangesOverlap,
  daysOverdue,
  isOverdue,
  reminderIdempotencyKey,
  todayUtc,
} from "../convex/lib/dates";

describe("date validation", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-11-25")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("25-11-2026")).toBe(false);
  });

  it("requires start <= end", () => {
    expect(isValidRange("2026-01-01", "2026-01-03")).toBe(true);
    expect(isValidRange("2026-01-03", "2026-01-03")).toBe(true);
    expect(isValidRange("2026-01-04", "2026-01-03")).toBe(false);
  });

  it("detects inclusive overlaps", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-05", "2026-01-05", "2026-01-08")).toBe(true);
    expect(rangesOverlap("2026-01-01", "2026-01-04", "2026-01-05", "2026-01-08")).toBe(false);
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-01-03", "2026-01-04")).toBe(true);
  });
});

describe("overdue calculation", () => {
  const noonOn = (iso: string) => Date.parse(`${iso}T12:00:00.000Z`);

  it("counts whole days after the end date", () => {
    expect(daysOverdue("2026-11-20", noonOn("2026-11-25"))).toBe(5);
    expect(daysOverdue("2026-11-25", noonOn("2026-11-25"))).toBe(0);
    expect(daysOverdue("2026-11-26", noonOn("2026-11-25"))).toBe(0);
  });

  it("treats a returned loan as not overdue", () => {
    expect(isOverdue("2026-11-01", undefined, noonOn("2026-11-25"))).toBe(true);
    expect(isOverdue("2026-11-01", noonOn("2026-11-02"), noonOn("2026-11-25"))).toBe(false);
  });

  it("builds a stable daily reminder key", () => {
    expect(reminderIdempotencyKey("loan_1", "2026-11-25")).toBe("reminder:loan_1:2026-11-25");
    expect(todayUtc(noonOn("2026-11-25"))).toBe("2026-11-25");
  });
});
