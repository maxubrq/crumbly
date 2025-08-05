import { vi } from "vitest";

/* ---------- Minimal chrome API surface our code touches ---------- */
// 🔑 identity
const mockIdentity = {
  getRedirectURL: vi.fn((path = "") => `https://mock.ext/${path}`),
  launchWebAuthFlow: vi.fn(() =>
    Promise.resolve("https://mock.ext/?code=TEST_CODE")
  ),
};

// 📦 storage.local
const store: Record<string, any> = {};
const mockStorage = {
  local: {
    get: (k: any) =>
      Promise.resolve(typeof k === "string" ? { [k]: store[k] } : store),
    set: (o: any) => {
      Object.assign(store, o);
      return Promise.resolve();
    },
    clear: () => {
      for (const k in store) delete store[k];
      return Promise.resolve();
    },
  },
};

// 🛠️ runtime (only what tests currently need)
const mockRuntime = {
  sendMessage: vi.fn(() => Promise.resolve()),
};

/* Attach to globalThis so every import sees it */
// @ts-ignore – we deliberately create the global
globalThis.chrome = {
  identity: mockIdentity,
  storage: mockStorage,
  runtime: mockRuntime,
} as any;
