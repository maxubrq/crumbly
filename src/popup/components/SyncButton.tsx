export default function SyncButton({ disabled }: { disabled?: boolean }) {
  const handle = () =>
    chrome.runtime.sendMessage({ cmd: "syncNow", dir: "auto" });
  return (
    <button
      disabled={disabled}
      onClick={handle}
      className="w-full mt-3 py-1.5 rounded bg-blue-600 text-white
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Sync now
    </button>
  );
}
