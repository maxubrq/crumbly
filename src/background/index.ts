import { upsertGist } from "./gist";
import { encryptJSON } from "@/modules/crypto";
import { shouldSyncCookie } from "@/modules/filter";
import type { Settings } from "@/modules/types";
import type { SyncMessage } from "@/modules/syncStates";
import browser from "webextension-polyfill";

async function dumpCookiesFiltered(settings: Settings) {
  const all = await browser.cookies.getAll({});
  const filtered = all.filter(c => shouldSyncCookie(c, settings.policies, settings.cookiePolicies));
  return filtered;
}


browser.runtime.onMessage.addListener(async (msg: any) => {
  if (msg.type === "SYNC_NOW") {
    const settings: Settings = (await browser.storage.local.get("settings")).settings as any;
    if (!settings.passphrase) return console.error("Missing passphrase");

    const dump = await dumpCookiesFiltered(settings);
    const enc = await encryptJSON(settings.passphrase, dump);
    await upsertGist(enc, "crumbly.enc");
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "sync") return;

  port.onMessage.addListener(async msg => {
    if (msg.cmd !== "start-sync") return;

    const emit = (stage: SyncMessage["stage"], err?: string) =>
      port.postMessage({ stage, error: err } as SyncMessage);

    let prevState: SyncMessage["stage"] | undefined;
    try {
      emit("dumping");
      let cookies = await browser.cookies.getAll({});

      prevState = "dumping";
      emit("filtering");
      const { settings } = await browser.storage.local.get("settings") as { settings: Settings };
      cookies = cookies.filter(c =>
        shouldSyncCookie(c, settings.policies, settings.cookiePolicies)
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
  });
});