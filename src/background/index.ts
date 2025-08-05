import { syncNow } from "../modules/sync/syncorchestrator";

/* --- track live popup ports so we can broadcast --- */
const ports = new Set<chrome.runtime.Port>();
chrome.runtime.onConnect.addListener((port) => {
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
});

function broadcast(evt: string) {
  for (const p of ports) p.postMessage({ evt });
}

chrome.runtime.onMessage.addListener((msg, _src, send) => {
  if (msg.cmd === "syncNow") {
    broadcast("sync:begin");

    syncNow(msg.dir ?? "auto")
      .then(() => send({ ok: true }))
      .catch((err) => send({ ok: false, message: err.message }))
      .finally(() => broadcast("sync:end"));

    return true; // ✅ we really are replying asynchronously
  }
  // for every other cmd, return false (or omit return)
});
