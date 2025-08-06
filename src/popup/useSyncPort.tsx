import type { SyncMessage, SyncStage } from "@/modules/syncStates";
import { useCallback, useState } from "react";

export function useSyncPort() {
  const [stage, setStage] = useState<SyncStage>("idle");
  const [error, setError] = useState<string | undefined>();

  const start = useCallback((direction: "push" | "pull") => {
    setStage(direction === "push" ? "dumping" : "downloading");
    const port = chrome.runtime.connect({ name: "sync" });
    port.postMessage({ cmd: direction === "push" ? "push-sync" : "pull-sync" });

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
