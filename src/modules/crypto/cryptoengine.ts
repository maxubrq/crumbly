/*  Crypto Engine – pure WebCrypto  (no external libs)  */

import { b64encode, b64decode } from "../utils/base64";
import type { CookieDumpV1, DomainFilters } from "../../../types/cookies";

/* ---------- Tunables ---------- */

const ITERATIONS = 600_000; // OWASP-recommended ≥310k (2025)
const SALT_LEN = 16; // 128-bit salt
const IV_LEN = 12; // 96-bit IV for AES-GCM
const ENC_VERSION = 1; // bump if algo/format changes

/* ---------- In-memory vault ---------- */

let masterPassphrase: string | null = null;

/** Call once during onboarding / unlock. Never persist the passphrase. */
export function setPassphrase(pass: string) {
  masterPassphrase = pass;
}

/* ---------- Key derivation ---------- */

async function deriveKey(pass: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/* ---------- Public helpers ---------- */

/** Deterministic SHA-256 hash of a dump – used for “changed?” fast-check */
export async function hashDump(dump: CookieDumpV1): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(dump));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return b64encode(new Uint8Array(digest));
}

/** Encrypts the dump → JSON string suitable for Gist storage */
export async function encryptDump(dump: CookieDumpV1): Promise<string> {
  if (!masterPassphrase) throw new Error("Passphrase not set");

  const plain = new TextEncoder().encode(JSON.stringify(dump));
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

  const key = await deriveKey(masterPassphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain
  );

  return JSON.stringify({
    v: ENC_VERSION,
    salt: b64encode(salt),
    iv: b64encode(iv),
    cipher: b64encode(new Uint8Array(cipher)),
  });
}

/** Decrypts JSON blob → `{ dump, filters }` expected by Sync Orchestrator */
export async function decryptDump(blobStr: string): Promise<{
  dump: CookieDumpV1;
  filters: DomainFilters;
}> {
  if (!masterPassphrase) throw new Error("Passphrase not set");

  const blob = JSON.parse(blobStr);
  if (blob.v !== ENC_VERSION) throw new Error("Unsupported blob version");

  const salt = b64decode(blob.salt);
  const iv = b64decode(blob.iv);
  const cipher = b64decode(blob.cipher);

  const key = await deriveKey(masterPassphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );

  const dump: CookieDumpV1 = JSON.parse(
    new TextDecoder().decode(new Uint8Array(plain))
  );
  return { dump, filters: dump.filters ?? {} };
}
