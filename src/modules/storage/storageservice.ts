/* src/modules/storage/storageService.ts
   -------------------------------------------------------------- */

export interface GistMeta {
  id: string;
  etag: string | null;
  lastHash?: string;
}

export interface UserPrefs {
  filters: DomainFilters;
  scheduleMin?: number; // auto-sync interval
}

export interface DomainFilters {
  allow?: string[];
  block?: string[];
}

type Bucket =
  | { kind: "gist"; value: GistMeta }
  | { kind: "prefs"; value: UserPrefs }
  | { kind: "meta"; value: Record<string, unknown> }; // misc runtime

/* ----------------------------------  helpers  ---------------------------------- */

/** internal storage key → eg. "crumbly:gist" */
const key = (k: Bucket["kind"]) => `crumbly:${k}`;

/** Generic save helper; merges instead of clobbering */
export async function save<T extends Bucket["kind"]>(
  kind: T,
  value: Extract<Bucket, { kind: T }>["value"]
) {
  await browser.storage.local.set({ [key(kind)]: value });
}

/** Generic load helper; returns undefined if missing */
export async function load<T extends Bucket["kind"]>(
  kind: T
): Promise<Extract<Bucket, { kind: T }>["value"] | undefined> {
  const o = await browser.storage.local.get(key(kind));
  return o[key(kind)];
}

/* ---------- convenience wrappers so calling code stays tiny ---------- */

export const saveMeta = (value: GistMeta) => save("gist", value);
export const loadMeta = () => load("gist");

export const savePrefs = (value: UserPrefs) => save("prefs", value);
export const loadPrefs = () => load("prefs");
