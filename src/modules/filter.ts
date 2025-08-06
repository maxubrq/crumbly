import type { DomainPolicy } from "./types";

export function shouldSyncCookie(
  cookie: browser.cookies.Cookie,
  policies: DomainPolicy[]
) {
  // longest-match wins, default allow
  let matched: DomainPolicy | undefined;
  for (const p of policies) {
    if (cookie.domain.endsWith(p.domain)) {
      if (!matched || p.domain.length > matched.domain.length) matched = p;
    }
  }
  return matched?.mode !== "block";
}
