import { Dialog } from "@headlessui/react";
import { acquireTokenInteractive } from "../../modules/gist/gistservice";
import { useStorage } from "../hooks/useStorage";

export default function SettingsModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [prefs, savePrefs] = useStorage<{
    filters: { allow?: string[]; block?: string[] };
  }>("crumbly:prefs", { filters: {} });
  const connect = () => acquireTokenInteractive().catch(alert);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-10"
    >
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-white rounded shadow p-4 w-72">
          <Dialog.Title className="font-semibold mb-2">Settings</Dialog.Title>

          <button
            onClick={connect}
            className="mb-4 w-full py-1 rounded bg-gray-800 text-white"
          >
            Connect GitHub
          </button>

          <label className="block text-sm mb-1">Allowed domains (CSV)</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={(prefs.filters.allow ?? []).join(",")}
            onChange={(e) =>
              savePrefs({
                ...prefs,
                filters: {
                  ...prefs.filters,
                  allow: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
          />
          <label className="block text-sm mt-3 mb-1">
            Blocked domains (CSV)
          </label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={(prefs.filters.block ?? []).join(",")}
            onChange={(e) =>
              savePrefs({
                ...prefs,
                filters: {
                  ...prefs.filters,
                  block: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
          />

          <button
            onClick={() => setOpen(false)}
            className="mt-4 w-full py-1 rounded bg-blue-600 text-white"
          >
            Close
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
