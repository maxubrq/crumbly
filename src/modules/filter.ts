import type { CookiePolicy, DomainPolicy } from "./types";

export function shouldSyncCookie(
  cookie: browser.cookies.Cookie,
  domainPol: DomainPolicy[],
  cookiePol: CookiePolicy[]
) {
  const id = `${cookie.name}@${cookie.domain}`;

  const cp = cookiePol.find(p => p.id === id);
  if (cp) return cp.mode !== "block";          // cookie rule wins

  // fall back to domain logic from Phase 3
  let matched: DomainPolicy | undefined;
  for (const p of domainPol) if (cookie.domain.endsWith(p.domain)) {
    if (!matched || p.domain.length > matched.domain.length) matched = p;
  }
  return matched?.mode !== "block";
}