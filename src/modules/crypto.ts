const PBKDF_ITER = 200_000;               // OWASP 2025 recommendation
const KEY_LEN    = 256;                   // bits
const IV_LEN     = 12;                    // bytes (GCM standard)

/**
 * Base64 encode an ArrayBuffer.
 * This is used to convert binary data to a string format that can be easily stored or transmitted
 * @param buf 
 * @returns 
 */
function buf2b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Convert a Base64 string to an ArrayBuffer.
 * This is the reverse operation of buf2b64, used to decode Base64 strings back to binary data.
 * @param b64 
 * @returns 
 */
function b642buf(b64: string) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

/**
 * Derive a cryptographic key from a password and optional salt.
 * @param pass The password to derive the key from.
 * @param salt The salt to use for key derivation (randomly generated if not provided).
 * @returns The derived key and salt.
 */
export async function deriveKey(pass: string, salt?: Uint8Array) {
  if (!salt) salt = crypto.getRandomValues(new Uint8Array(16));
  const pbkdfKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF_ITER,
      hash: "SHA-256"
    },
    pbkdfKey,
    { name: "AES-GCM", length: KEY_LEN },
    false,
    ["encrypt", "decrypt"]
  );
  return { aesKey, salt };
}

/**
 * Encrypts a JSON object using AES-GCM encryption.
 * @param pass The password to derive the encryption key.
 * @param data The JSON object to encrypt.
 * @returns A Base64-encoded string containing the encrypted data, salt, and IV.
 */
export async function encryptJSON(pass: string, data: unknown) {
  const { aesKey, salt } = await deriveKey(pass);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext
  );

  return JSON.stringify({
    v: 1,                                   // format version
    salt: buf2b64(salt),
    iv:   buf2b64(iv),
    ct:   buf2b64(cipherBuf)
  });
}

/**
 * Decrypts a Base64-encoded string containing encrypted JSON data.
 * @param pass The password to derive the decryption key.
 * @param blob The Base64-encoded string containing the encrypted data, salt, and IV.
 * @returns The decrypted JSON object.
 */
export async function decryptJSON(pass: string, blob: string) {
  const { salt, iv, ct } = JSON.parse(blob);
  const { aesKey } = await deriveKey(pass, new Uint8Array(b642buf(salt)));
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b642buf(iv)) },
    aesKey,
    b642buf(ct)
  );
  return JSON.parse(new TextDecoder().decode(plainBuf));
}
