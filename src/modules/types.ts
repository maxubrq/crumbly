// shared/types.ts
export interface DomainPolicy {
  /** e.g. ".twitter.com"  (always start with dot for sub-domain match) */
  domain: string;
  mode: "allow" | "block";
}

export interface CookiePolicy {
  /** canonical combination "<name>@<domain>" – ex: "SID@.google.com" */
  id: string;
  mode: "allow" | "block";
}

export interface Settings {
  policies: DomainPolicy[];      // default: empty = allow-all
  cookiePolicies: CookiePolicy[]; // default: empty = allow-all
  passphrase?: string;
  githubToken?: string;
  gistId?: string;
}
