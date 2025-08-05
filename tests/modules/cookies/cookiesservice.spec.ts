import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  dumpCookies,
  restoreCookies,
} from "../../../src/modules/cookies/cookiesservice";

const mockCookies: Partial<chrome.cookies.Cookie>[] = [
  {
    domain: ".foo.com",
    path: "/",
    name: "a",
    value: "1",
    secure: false,
    httpOnly: false,
    sameSite: "no_restriction",
    session: true,
  },
  {
    domain: ".bar.com",
    path: "/",
    name: "b",
    value: "2",
    secure: true,
    httpOnly: false,
    sameSite: "lax",
    session: true,
  },
];

vi.stubGlobal("chrome", {
  cookies: {
    getAll: vi.fn(() => Promise.resolve(mockCookies)),
    set: vi.fn(() => Promise.resolve({})),
  },
} as any);

describe("Cookie Service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dumps deterministically", async () => {
    const dump1 = await dumpCookies();
    const dump2 = await dumpCookies();
    expect(JSON.stringify(dump1)).toBe(JSON.stringify(dump2));
  });

  it("applies allow filter", async () => {
    const dump = await dumpCookies({ allow: ["foo.com"] });
    expect(dump.cookies.length).toBe(1);
    expect(dump.cookies[0].domain).toBe(".foo.com");
  });

  it("restore respects filters and counts results", async () => {
    const dump = await dumpCookies();
    const [ok] = await restoreCookies(dump, { allow: ["bar.com"] });
    expect(ok).toBe(1);
  });
});
