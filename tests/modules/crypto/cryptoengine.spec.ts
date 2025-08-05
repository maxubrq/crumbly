import { describe, it, expect, beforeAll } from "vitest";
import {
  setPassphrase,
  encryptDump,
  decryptDump,
} from "../../../src/modules/crypto/cryptoengine";

globalThis.crypto ??= (await import("node:crypto")).webcrypto as any; // for Node

describe("cryptoEngine", () => {
  const dump = { v: 1, created: 0, cookies: [], filters: {} };

  beforeAll(() => setPassphrase("correct-horse-battery-staple"));

  it("round-trips dump", async () => {
    const blob = await encryptDump(dump as any);
    const plain = await decryptDump(blob);
    expect(plain.dump).toEqual(dump);
  });
});
