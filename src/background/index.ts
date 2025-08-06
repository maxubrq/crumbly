import { fetchGist, locateCrumblyGist, upsertGist } from "./gist";
import { decryptJSON, encryptJSON } from "@/modules/crypto";
import { shouldSyncCookie } from "@/modules/filter";
import type { Settings } from "@/modules/types";
import type { SyncMessage } from "@/modules/syncStates";
import { runtime } from '@/lib/runtime';

// async function dumpCookiesFiltered(settings: Settings) {
//   const all = await runtime.cookies.getAll({});
//   const filtered = all.filter(c => shouldSyncCookie(c as any, settings.policies, settings.cookiePolicies));
//   return filtered;
// }

async function restoreCookies(
  cookies: browser.cookies.Cookie[]
) {
  // Crumbly only restores properties allowed by the WebExtension API.
  for (const c of cookies) {
    try {
      await runtime.cookies.set({
        url: (c.secure ? "https://" : "http://") + c.domain.replace(/^\./, "") + (c.path || "/"),
        name: c.name,
        value: c.value ?? "",
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.expirationDate,
        storeId: c.storeId,
      });
    } catch (e) {
      // ignore cookies that violate host-only/path constraints
      console.warn("Failed to restore cookie", c.name, e);
    }
  }
}

export async function ensureCookiePermission() {
  const have = await runtime.permissions.contains({ permissions: ["cookies"] });
  if (!have) await runtime.permissions.request({ permissions: ["cookies"] });
}

// runtime.runtime.onMessage.addListener(async (msg: any) => {
//   if (msg.type === "SYNC_NOW") {
//     const settings: Settings = (await runtime.storage.local.get("settings")).settings as any;
//     if (!settings.passphrase) return console.error("Missing passphrase");

//     const dump = await dumpCookiesFiltered(settings);
//     const enc = await encryptJSON(settings.passphrase, dump);
//     await upsertGist(enc, "crumbly.enc");
//   }
// });

runtime.runtime.onConnect.addListener(port => {
  if (port.name !== "sync") return;

  port.onMessage.addListener(async msg => {
    if (msg.cmd === 'push-sync') { await pushFlow(port); return; }
    if (msg.cmd === 'pull-sync') { await pullFlow(port); return; }
  });
});

runtime.alarms.create("crumbly-auto-pull", { periodInMinutes: 5 });

runtime.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "crumbly-auto-pull") {
    const port = runtime.runtime.connect({ name: "sync" });
    port.postMessage({ cmd: "pull-sync" });
    // No UI listener – silent background update
  }
});


async function pullFlow(port: chrome.runtime.Port) {
  const emit = (stage: SyncMessage["stage"], err?: string) =>
    port.postMessage({ stage, error: err } as SyncMessage);

  try {
    emit("downloading");

    const { settings } = await runtime.storage.local.get("settings") as { settings: Settings };
    if (!settings.githubToken || !settings.passphrase) {
      emit("error", "Missing GitHub token or passphrase");
      return;
    }


    let { gistId, etag: prevEtag } = settings;
    if (!gistId) {
      gistId = await locateCrumblyGist(settings.githubToken);
      if (!gistId)
        throw new Error("No Crumbly gist found for this account. Push first.");

      // cache for future pulls
      await runtime.storage.local.set({ settings: { ...settings, gistId } });
    }

    const { blob, etag } = await fetchGist(settings.githubToken, gistId, prevEtag);
    if (!blob) {
      emit("done");   // nothing changed
      return;
    }

    emit("decrypting");
    const cookies = await decryptJSON(settings.passphrase, blob) as browser.cookies.Cookie[];

    emit("applying");
    await restoreCookies(cookies);

    // persist new etag for next diff check
    await runtime.storage.local.set({ settings: { ...settings, etag } });

    emit("done");
  } catch (e: any) {
    emit("error", e.message ?? String(e));
  } finally {
    port.disconnect();
  }
}

async function pushFlow(port: browser.runtime.Port) {

  const emit = (stage: SyncMessage["stage"], err?: string) =>
    port.postMessage({ stage, error: err } as SyncMessage);

  let prevState: SyncMessage["stage"] | undefined;
  try {
    emit("dumping");
    // await ensureCookiePermission();
    // Ensure we have the cookies permission before proceeding
    let cookies = await runtime.cookies.getAll({});

    prevState = "dumping";
    emit("filtering");
    const { settings } = await runtime.storage.local.get("settings") as { settings: Settings };
    cookies = cookies.filter(c =>
      shouldSyncCookie(c as any, settings.policies, settings.cookiePolicies)
    );

    if (settings.githubToken === undefined || settings.passphrase === undefined) {
      emit("error", "Missing GitHub token or passphrase");
      return;
    }

    prevState = "filtering";

    emit("encrypting");
    const enc = await encryptJSON(settings.passphrase, cookies);
    prevState = "encrypting";

    emit("uploading");
    await upsertGist(enc, "crumbly.enc");
    prevState = "uploading";

    emit("done");
  } catch (e: any) {
    console.error("Sync error:", e);
    if (prevState === undefined) prevState = "idle";
    emit("error", `Failed after ${prevState}: ${e.message ?? String(e)}`);
  } finally {
    port.disconnect();         // allow SW to shut down
  }
}