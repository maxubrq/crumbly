// tests/storageService.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  saveMeta,
  loadMeta,
} from "../../../src/modules/storage/storageservice";

vi.stubGlobal("browser", {
  storage: {
    local: {
      _data: {} as any,
      set(o: any) {
        Object.assign(this._data, o);
        return Promise.resolve();
      },
      get(k: string) {
        return Promise.resolve({ [k]: this._data[k] });
      },
    },
  },
} as any);

describe("storageService", () => {
  it("round-trips gist meta", async () => {
    const sample = { id: "abc", etag: "123" };
    await saveMeta(sample);
    const got = await loadMeta();
    expect(got).toEqual(sample);
  });
});
