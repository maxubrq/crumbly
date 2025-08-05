// import { useEffect, useState } from "react";
// import PassphraseGate from "./components/PassphraseGate";
// import SettingsModal from "./components/SettingsModal";
// import StatusBar from "./components/StatusBar";
// import SyncButton from "./components/SyncButton";
// import { useStorage } from "./hooks/useStorage";
// import './App.css';

import { Button } from "@/components/ui/button";

// export default function App() {
//   const [syncing, setSyncing] = useState(false);
//   const [lastSync, setLastSync] = useStorage<number>("crumbly:lastSync", 0);
//   const [settingsOpen, setSettingsOpen] = useState(false);
//   const [unlocked, setUnlocked] = useState(false);

//   // Listen for background-worker events (optional ping message)
//   useEffect(() => {
//     const port = chrome.runtime.connect();
//     port.onMessage.addListener((msg) => {
//       if (msg.evt === "sync:begin") setSyncing(true);
//       if (msg.evt === "sync:end") {
//         setSyncing(false);
//         setLastSync(Date.now());
//       }
//     });
//     return () => port.disconnect();
//   }, []);

//   return (
//     <div className="w-64 p-4 text-sm">
//       <div className="flex justify-between items-center mb-3">
//         <h1 className="font-bold text-lg">Crumbly</h1>
//         <button onClick={() => setSettingsOpen(true)} aria-label="settings">
//           ⚙️
//         </button>
//       </div>

//       <StatusBar syncing={syncing} lastSync={lastSync} />

//       {unlocked ? (
//         <>
//           <SyncButton disabled={syncing} />
//         </>
//       ) : (
//         <PassphraseGate onUnlock={() => setUnlocked(true)} />
//       )}

//       <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
//     </div>
//   );
// }

export default function App() {
  return (
    <div className="w-64 p-4 text-sm">
      <h1 className="font-bold text-lg">Crumbly</h1>
      <p className="mt-4">This is a placeholder for the Crumbly extension.</p>
      <p>More features coming soon!</p>
      <Button>This is shadbutton</Button>
    </div>
  );
}