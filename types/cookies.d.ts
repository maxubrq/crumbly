export interface CookieEntry {
  domain: string; // ".example.com"
  path: string; // "/"
  name: string; // "sid"
  value: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: chrome.cookies.SameSiteStatus;
  expirationDate?: number; // seconds since epoch
}

export interface CookieDumpV1 {
  v: 1;
  created: number; // epoch ms
  cookies: CookieEntry[];
  filters: DomainFilters;
}

export interface DomainFilters {
  allow?: string[]; // literal domains  e.g. "github.com"
  block?: string[]; // literal domains
}
