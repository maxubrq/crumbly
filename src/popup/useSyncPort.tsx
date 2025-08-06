import type { SyncMessage, SyncStage } from "@/modules/syncStates";
import { useCallback, useState } from "react";

export function useSyncPort() {
  const [stage, setStage] = useState<SyncStage>("idle");
  const [error, setError] = useState<string | undefined>();

  const start = useCallback(() => {
    setStage("dumping");           // optimistic until first msg
    const port = chrome.runtime.connect({ name: "sync" });
    port.postMessage({ cmd: "start-sync" });

    const listener = (msg: SyncMessage) => {
      setStage(msg.stage);
      if (msg.stage === "error") setError(msg.error);
      if (msg.stage === "done" || msg.stage === "error") {
        port.disconnect();
      }
    };
    port.onMessage.addListener(listener);
  }, []);

  return { stage, error, start };
}
