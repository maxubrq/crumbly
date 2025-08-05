/* ------------------------------------------------------------------ */
/*  Sync Orchestrator – single source-of-truth for all sync logic     */
/* ------------------------------------------------------------------ */

import { dumpCookies, restoreCookies } from "../cookies/cookiesservice";
import {
  getToken,
  createOrGetGist,
  pullBlob,
  pushBlob,
} from "../gist/gistservice";
import type { GistMeta } from "../gist/gistservice";
import { loadPrefs, saveMeta, loadMeta } from "../storage/storageservice";

// 🏷️ cryptoEngine interface – we’ll write real code in Step 1
import { encryptDump, decryptDump, hashDump } from "../crypto/cryptoengine";

let isSyncing = false; // global re-entrancy lock
let timer: number | undefined; // scheduler id kept here

export async function syncNow(
  direction: "auto" | "push" | "pull" = "auto"
): Promise<void> {
  if (isSyncing) return; // debounce
  isSyncing = true;
  try {
    const token = await getToken();
    const gist = await createOrGetGist(token);

    if (direction === "pull") await pullAndRestore(token, gist);
    else if (direction === "push") await dumpEncryptPush(token, gist);
    else {
      // auto
      const pulled = await pullAndRestore(token, gist); // may be null
      await dumpEncryptPush(token, gist, pulled?.etag); // only push if local changed
    }
  } finally {
    isSyncing = false;
  }
}

/* ------------------------------------------------------------------ */
/* Scheduler – background worker calls startScheduler(intervalMin)    */
/* ------------------------------------------------------------------ */

export function startScheduler(intervalMin = 30) {
  stopScheduler();
  timer = setInterval(() => syncNow("auto"), intervalMin * 60 * 1000);
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Internals                                                          */
/* ------------------------------------------------------------------ */

/** pulls remote blob, restores cookies, returns null on 304 */
async function pullAndRestore(token: string, meta: GistMeta) {
  const pulled = await pullBlob(token, meta);
  if (!pulled) return null; // up-to-date

  const plain = await decryptDump(pulled.blob);
  await restoreCookies(plain.dump, plain.filters);

  // persist new etag for next sync
  await saveMeta({ ...meta, etag: pulled.etag });
  return pulled;
}

/** dumps local cookies, encrypts, optionally skips if unchanged */
async function dumpEncryptPush(
  token: string,
  meta: GistMeta,
  skipIfEtag?: string
) {
  const prefs = (await loadPrefs()) ?? { filters: {} };
  const dump = await dumpCookies(prefs.filters);

  // optimisation: if hash identical to last pushed + etag unchanged ⇒ skip
  const last = (await loadMeta())?.lastHash as string | undefined;
  const currH = await hashDump(dump);
  if (last && last === currH && meta.etag === skipIfEtag) return;

  const blob = await encryptDump(dump);
  const newEtag = await pushBlob(token, meta, blob);

  await saveMeta({ ...meta, etag: newEtag, lastHash: currH });
}
