import type {
  CookieDumpV1,
  CookieEntry,
  DomainFilters,
} from "../../../types/cookies";

/** ----- Public API  ----- */

/**
 * Dump cookies that pass the provided domain filters.  Deterministically sorted
 * so the same logical set → same JSON → same ciphertext → nicer Git diffs.
 */
export async function dumpCookies(
  filters: DomainFilters = {}
): Promise<CookieDumpV1> {
  const raw = await chrome.cookies.getAll({});
  const accepted = raw.filter((c) => domainAllowed(c.domain, filters));

  // Convert to lean POJOs; omit defaults to keep size tiny
  const entries: CookieEntry[] = accepted.map(toEntry);

  // Deterministic sort: domain → path → name
  entries.sort(
    (a, b) =>
      a.domain.localeCompare(b.domain) ||
      a.path.localeCompare(b.path) ||
      a.name.localeCompare(b.name)
  );

  return {
    v: 1,
    created: Date.now(),
    cookies: entries,
    filters,
  };
}

/**
 * Restore cookies from a dump.  Returns a tuple [okCount, failCount].
 * Automatically skips expired cookies and ones rejected by the current filter set.
 */
export async function restoreCookies(
  dump: CookieDumpV1,
  filtersOverride?: DomainFilters
): Promise<[number, number]> {
  const filters = filtersOverride ?? dump.filters ?? {};
  const nowSec = Date.now() / 1000;

  const work = dump.cookies
    .filter((c) => (c.expirationDate ? c.expirationDate > nowSec : true))
    .filter((c) => domainAllowed(c.domain, filters))
    .map(fromEntry)
    // A modest concurrency cap prevents API flood
    .map((details) =>
      chrome.cookies.set(details).then(
        () => ({ ok: true }) as const,
        () => ({ ok: false }) as const
      )
    );

  const results = await Promise.allSettled(work);

  const okCount = results.filter(
    (r) => r.status === "fulfilled" && (r.value as any).ok
  ).length;
  const failCount = results.length - okCount;
  return [okCount, failCount];
}

/** ----- Helpers  ----- */

function toEntry(c: chrome.cookies.Cookie): CookieEntry {
  return {
    domain: c.domain,
    path: c.path,
    name: c.name,
    value: c.value,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite === "no_restriction" ? undefined : c.sameSite,
    expirationDate: c.session ? undefined : c.expirationDate,
  };
}

function fromEntry(e: CookieEntry): chrome.cookies.SetDetails {
  const url = `${e.secure ? "https" : "http"}://${trimDot(e.domain)}${e.path}`;
  return {
    url,
    domain: e.domain,
    path: e.path,
    name: e.name,
    value: e.value,
    secure: e.secure,
    httpOnly: e.httpOnly,
    sameSite: e.sameSite ?? "no_restriction",
    expirationDate: e.expirationDate,
  };
}

function domainAllowed(domain: string, f: DomainFilters): boolean {
  // Strip leading dot for matching convenience
  const d = trimDot(domain);
  if (f.block?.some((b) => d === b)) return false;
  if (!f.allow || f.allow.length === 0) return true;
  return f.allow.some((a) => d === a);
}

const trimDot = (d: string) => (d.startsWith(".") ? d.slice(1) : d);
