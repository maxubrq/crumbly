import { useState } from "react";
import { setPassphrase } from "../../modules/crypto/cryptoengine";

type Props = { onUnlock: () => void };

export default function PassphraseGate({ onUnlock }: Props) {
  const [pass, setPass] = useState("");
  const unlock = () => {
    setPassphrase(pass);
    onUnlock();
  };
  return (
    <div className="flex flex-col items-stretch">
      <input
        autoFocus
        type="password"
        placeholder="Enter pass-phrase"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        className="border rounded px-2 py-1"
      />
      <button
        onClick={unlock}
        disabled={!pass}
        className="mt-2 py-1 rounded bg-green-600 text-white
                   disabled:opacity-40"
      >
        Unlock
      </button>
    </div>
  );
}
