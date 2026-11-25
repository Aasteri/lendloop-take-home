import { describe, expect, it } from "vitest";
import {
  signPayload,
  verifySignedRequest,
  parseSignatureHeader,
  canonicalMessage,
  hmacSha256Hex,
} from "../convex/lib/hmac";

const secret = "test-secret-do-not-use-in-production";

describe("hmac signing", () => {
  it("produces a v1 hex signature and verifies a matching payload", async () => {
    const body = JSON.stringify({ event: "borrow_request.changed", requestId: "abc" });
    const signed = await signPayload(secret, body, "1700000000");
    expect(signed.signature).toMatch(/^v1=[0-9a-f]{64}$/);
    const result = await verifySignedRequest({
      secret,
      body,
      signatureHeader: signed.signature,
      timestampHeader: signed.timestamp,
      nowSeconds: 1_700_000_000,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects a tampered body", async () => {
    const signed = await signPayload(secret, "{\"ok\":true}", "1700000000");
    const result = await verifySignedRequest({
      secret,
      body: "{\"ok\":false}",
      signatureHeader: signed.signature,
      timestampHeader: signed.timestamp,
      nowSeconds: 1_700_000_000,
    });
    expect(result).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects a signature produced with a different secret", async () => {
    const body = "{}";
    const signed = await signPayload("other-secret", body, "1700000000");
    const result = await verifySignedRequest({
      secret,
      body,
      signatureHeader: signed.signature,
      timestampHeader: signed.timestamp,
      nowSeconds: 1_700_000_000,
    });
    expect(result).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects timestamps outside the replay window", async () => {
    const body = "{}";
    const signed = await signPayload(secret, body, "1700000000");
    const stale = await verifySignedRequest({
      secret,
      body,
      signatureHeader: signed.signature,
      timestampHeader: signed.timestamp,
      nowSeconds: 1_700_000_000 + 301,
    });
    expect(stale).toEqual({ ok: false, reason: "expired_timestamp" });
  });

  it("rejects malformed headers", async () => {
    const missing = await verifySignedRequest({
      secret,
      body: "{}",
      signatureHeader: null,
      timestampHeader: "1700000000",
      nowSeconds: 1_700_000_000,
    });
    expect(missing.ok).toBe(false);
    const badTs = await verifySignedRequest({
      secret,
      body: "{}",
      signatureHeader: "v1=" + "ab".repeat(32),
      timestampHeader: "yesterday",
      nowSeconds: 1_700_000_000,
    });
    expect(badTs).toEqual({ ok: false, reason: "invalid_timestamp" });
  });

  it("parses only v1 hex signatures", () => {
    expect(parseSignatureHeader("v1=" + "ab".repeat(32))).toHaveLength(64);
    expect(parseSignatureHeader("sha256=abcd")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("canonical message is timestamp + body", async () => {
    expect(canonicalMessage("1", "{}")).toBe("1.{}");
    const hex = await hmacSha256Hex(secret, "1.{}");
    expect(hex).toHaveLength(64);
  });
});
