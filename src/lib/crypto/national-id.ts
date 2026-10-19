import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Layout: [12-byte IV][16-byte auth tag][ciphertext] — one column, no separate IV/tag storage.
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.NATIONAL_ID_ENCRYPTION_KEY;
  if (!key) throw new Error("NATIONAL_ID_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) throw new Error("NATIONAL_ID_ENCRYPTION_KEY must decode to 32 bytes");
  return buf;
}

// Deterministic — this is the one piece ever used for exact-match lookups (uniqueness,
// Eligibility Check) so those queries never need to decrypt. Per docs/planning/05-data-
// architecture.md §2, a national ID maps to exactly one hash, forever (no key rotation
// story yet — rotating would orphan every existing hash).
export function hashNationalId(nationalId: string): string {
  return createHash("sha256").update(nationalId.trim()).digest("hex");
}

export function encryptNationalId(nationalId: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(nationalId.trim(), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptNationalId(blob: Buffer): string {
  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// PostgREST serializes bytea as Postgres's default hex format ("\xDEADBEEF") over JSON in
// both directions — these two just cross that boundary.
export function bufferToByteaHex(buf: Buffer): string {
  return `\\x${buf.toString("hex")}`;
}

export function byteaHexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace(/^\\x/, ""), "hex");
}

export function maskNationalId(nationalId: string): string {
  const digits = nationalId.trim();
  return digits.length <= 4 ? "****" : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}
