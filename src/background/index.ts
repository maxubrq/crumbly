import { upsertGist } from "./gist";
import { encryptJSON } from "@/modules/crypto";
import { shouldSyncCookie } from "@/modules/filter";
import type { Settings } from "@/modules/types";
import browser from "webextension-polyfill";

async function dumpCookiesFiltered(settings: Settings) {
  const all = await browser.cookies.getAll({});
  const filtered = all.filter(c => shouldSyncCookie(c, settings.policies));
  return filtered;
}


browser.runtime.onMessage.addListener(async (msg: any) => {
 if (msg.type === "SYNC_NOW") {
    const settings: Settings = (await browser.storage.local.get("settings")).settings as any;
    if (!settings.passphrase) return console.error("Missing passphrase");

    const dump = await dumpCookiesFiltered(settings);
    const enc  = await encryptJSON(settings.passphrase, dump);
    await upsertGist(enc, "crumbly.enc");
  }
});
