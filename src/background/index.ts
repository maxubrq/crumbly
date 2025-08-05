import { dumpCookies, restoreCookies } from "../modules/cookies/cookiesservice";

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg.cmd === "dumpCookies") dumpCookies(msg.filters).then(send);
  if (msg.cmd === "restoreCookies")
    restoreCookies(msg.dump, msg.filters).then(send);
  return true; // keep port open for async reply
});
