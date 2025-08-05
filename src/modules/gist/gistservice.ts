/*  Gist Service  – handles auth, gist discovery/creation, pull & push   */

import { saveMeta, loadMeta } from "../storage/storageservice";

/* --------------------------------------------------------------------- */
/* 1.  Auth – token acquisition & caching                                */
/* --------------------------------------------------------------------- */

const GIST_SCOPE = "gist";
const CLIENT_ID = import.meta.env.VITE_GH_CLIENT_ID; // ← set in .env
const REDIRECT = chrome.identity.getRedirectURL("oauth2");

/** Pop-up GitHub OAuth window → returns token, or throws on cancel. */
export async function acquireTokenInteractive(): Promise<string> {
  const url =
    `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}` +
    `&scope=${encodeURIComponent(GIST_SCOPE)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}`;
  const redirect = (await chrome.identity.launchWebAuthFlow({
    url,
    interactive: true,
  })) as string;

  const code = new URL(redirect).searchParams.get("code");
  if (!code) throw new Error("OAuth flow cancelled or failed.");

  // Exchange code → access_token via GitHub’s “device-less” endpoint
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, code }),
  });
  const { access_token } = await res.json();
  if (!access_token) throw new Error("No access_token in OAuth response");

  await chrome.storage.local.set({ ghToken: access_token });
  return access_token;
}

/** Load token from storage or run interactive flow. */
export async function getToken(): Promise<string> {
  const { ghToken } = await chrome.storage.local.get("ghToken");
  return ghToken ?? acquireTokenInteractive();
}

/* --------------------------------------------------------------------- */
/* 2.  Gist discovery / creation                                         */
/* --------------------------------------------------------------------- */

const GIST_DESC = "Crumbly Sync — Encrypted cookie backup";
const FILE_NAME = "crumbly.enc"; // single-file gist
const API = "https://api.github.com";

export interface GistMeta {
  id: string;
  etag: string | null;
}

export async function createOrGetGist(token: string): Promise<GistMeta> {
  // cached?
  const meta = await loadMeta();
  if (meta?.id) return meta as GistMeta;

  // try to find existing one
  const list = (await gh(token, "/gists?per_page=100")) as any[];
  const found = list.find((g) => g.description === GIST_DESC);

  if (found) {
    const etag = found.files[FILE_NAME]?.sha ?? null;
    const m: GistMeta = { id: found.id, etag };
    await saveMeta(m);
    return m;
  }

  // else create
  const body = {
    description: GIST_DESC,
    public: false,
    files: { [FILE_NAME]: { content: "initialized-by-crumbly" } },
  };
  const res = await gh(token, "/gists", "POST", body);
  const m: GistMeta = { id: res.id, etag: res.files[FILE_NAME].sha };
  await saveMeta(m);
  return m;
}

/* --------------------------------------------------------------------- */
/* 3.  Pull & push with optimistic concurrency (ETag / If-Match)         */
/* --------------------------------------------------------------------- */

/** Download encrypted blob. Returns null if 304 (not modified). */
export async function pullBlob(
  token: string,
  { id, etag }: GistMeta
): Promise<{ blob: string; etag: string } | null> {
  const headers: any = { Accept: "application/vnd.github+json" };
  if (etag) headers["If-None-Match"] = `"${etag}"`;

  const res = await gh(token, `/gists/${id}`, "GET", undefined, headers, true);
  if (res.status === 304) return null; // up-to-date
  const j = await res.json();
  const newEtag = res.headers.get("ETag")?.replace(/"/g, "") ?? null;

  const blob = j.files[FILE_NAME].content as string;
  return { blob, etag: newEtag! };
}

/** Upload new encrypted blob. Throws if server has newer version. */
export async function pushBlob(
  token: string,
  { id, etag }: GistMeta,
  blob: string
): Promise<string> {
  const headers: any = { Accept: "application/vnd.github+json" };
  if (etag) headers["If-Match"] = `"${etag}"`;

  const body = { files: { [FILE_NAME]: { content: blob } } };
  const res = await gh(token, `/gists/${id}`, "PATCH", body, headers, true);

  const newEtag = res.headers.get("ETag")?.replace(/"/g, "");
  if (!newEtag) throw new Error("No ETag returned after push");
  return newEtag;
}

/* --------------------------------------------------------------------- */
/* 4.  Lightweight fetch helper with rate-limit back-off                 */
/* --------------------------------------------------------------------- */

async function gh(
  token: string,
  path: string,
  meth: string = "GET",
  body?: any,
  hdrs?: Record<string, string>,
  raw: boolean = false
): Promise<any> {
  const r = await fetch(API + path, {
    method: meth,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...hdrs,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (Number(r.headers.get("x-ratelimit-remaining")) < 5) {
    const reset = Number(r.headers.get("x-ratelimit-reset")) * 1000;
    const wait = reset - Date.now();
    console.warn(
      `GitHub rate-limit near exhaustion; pausing ${(wait / 1000) | 0}s`
    );
    await new Promise((res) => setTimeout(res, Math.max(wait, 0)));
  }

  if (raw) return r; // caller handles status/json
  if (!r.ok) throw new Error(`GitHub API ${r.status} ${r.statusText}`);
  return await r.json();
}
