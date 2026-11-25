/**
 * Request signing for the Convex <-> n8n boundary.
 *
 * Canonical string: `${timestamp}.${body}`
 * Timestamp is Unix seconds.
 * Signature header: `X-LendLoop-Signature: v1=<hex>`
 * Timestamp header: `X-LendLoop-Timestamp: <seconds>`
 *
 * Verification rejects missing/malformed signatures, body mismatches,
 * and timestamps older or newer than maxSkewSeconds (replay window).
 * Comparison is length-checked and constant-time on matching lengths.
 */

const encoder = new TextEncoder();

export const SIGNATURE_HEADER = "x-lendloop-signature";
export const TIMESTAMP_HEADER = "x-lendloop-timestamp";
export const DEFAULT_MAX_SKEW_SECONDS = 5 * 60;

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(new Uint8Array(digest));
}

export function canonicalMessage(timestamp: string, body: string): string {
  return `${timestamp}.${body}`;
}

export async function signPayload(
  secret: string,
  body: string,
  timestamp: string = String(Math.floor(Date.now() / 1000)),
): Promise<{ timestamp: string; signature: string }> {
  const hex = await hmacSha256Hex(secret, canonicalMessage(timestamp, body));
  return { timestamp, signature: `v1=${hex}` };
}

export function parseSignatureHeader(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  const match = /^v1=([0-9a-f]{64})$/i.exec(trimmed);
  return match ? match[1].toLowerCase() : null;
}

export async function verifySignedRequest(args: {
  secret: string;
  body: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  nowSeconds?: number;
  maxSkewSeconds?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = args.secret;
  if (!secret) return { ok: false, reason: "missing_secret" };

  const timestamp = args.timestampHeader?.trim() ?? "";
  if (!/^[0-9]{1,12}$/.test(timestamp)) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skew = args.maxSkewSeconds ?? DEFAULT_MAX_SKEW_SECONDS;
  const ts = Number(timestamp);
  if (Math.abs(now - ts) > skew) {
    return { ok: false, reason: "expired_timestamp" };
  }

  const provided = parseSignatureHeader(args.signatureHeader);
  if (!provided) return { ok: false, reason: "invalid_signature_header" };

  const expected = await hmacSha256Hex(secret, canonicalMessage(timestamp, args.body));
  if (!safeEqualHex(provided, expected)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}

export function signatureHeaders(timestamp: string, signature: string): Record<string, string> {
  return {
    "X-LendLoop-Timestamp": timestamp,
    "X-LendLoop-Signature": signature,
    "Content-Type": "application/json",
  };
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
