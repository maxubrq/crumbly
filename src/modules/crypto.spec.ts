// shared/crypto.test.ts
import { encryptJSON, decryptJSON } from "./crypto";
import { describe, expect, test } from "vitest";

describe("Crypto", () => {
  test("round-trip", async () => {
    const obj = { foo: "bar", n: 42 };
    const pass = "correct horse battery staple";
    const enc  = await encryptJSON(pass, obj);
  expect(enc).toMatch(/"ct":/);

    const dec  = await decryptJSON(pass, enc);
    expect(dec).toEqual(obj);
  });
});
