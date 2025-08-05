type Props = { syncing: boolean; lastSync?: number };

export default function StatusBar({ syncing, lastSync }: Props) {
  return (
    <div
      className={`text-xs px-2 py-1 rounded
        ${
          syncing
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800"
        }`}
    >
      {syncing
        ? "Syncing…"
        : lastSync
          ? `Last sync: ${new Date(lastSync).toLocaleTimeString()}`
          : "Idle"}
    </div>
  );
}
