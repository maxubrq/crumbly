/* src/modules/utils/base64.ts
   -------------------------------------------------------------- */

/** Base64-encodes a Uint8Array. */
export const b64encode = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))

/** Decodes Base64 → Uint8Array. */
export const b64decode = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), c => c.charCodeAt(0))
