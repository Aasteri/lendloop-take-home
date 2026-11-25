import { describe, expect, it } from "vitest";
import { resolveIdempotent } from "../convex/lib/idempotency";
import { reminderIdempotencyKey } from "../convex/lib/dates";

describe("idempotent reminder write-back", () => {
  it("creates a record the first time a key is seen", () => {
    const result = resolveIdempotent(null, () => ({
      key: reminderIdempotencyKey("loan_1", "2026-11-25"),
      message: "Reminder sent",
    }));
    expect(result.created).toBe(true);
    expect(result.record.message).toBe("Reminder sent");
  });

  it("returns the original record on a retry with the same key", () => {
    const existing = { key: "reminder:loan_1:2026-11-25", message: "Reminder sent" };
    let createdExtra = false;
    const result = resolveIdempotent(existing, () => {
      createdExtra = true;
      return { key: existing.key, message: "duplicate" };
    });
    expect(result.created).toBe(false);
    expect(result.record).toBe(existing);
    expect(createdExtra).toBe(false);
  });

  it("uses a different key per day so a later reminder can still be stored", () => {
    const first = reminderIdempotencyKey("loan_1", "2026-11-25");
    const second = reminderIdempotencyKey("loan_1", "2026-11-26");
    expect(first).not.toBe(second);
  });
});
