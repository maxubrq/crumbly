import { useEffect, useState } from "react";

export function useStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(initial);

  useEffect(() => {
    browser.storage.local.get(key).then((r) => {
      if (r[key] !== undefined) setVal(r[key]);
    });
    const l = (changes: any, area: string) => {
      if (area === "local" && changes[key]) setVal(changes[key].newValue);
    };
    browser.storage.onChanged.addListener(l);
    return () => browser.storage.onChanged.removeListener(l);
  }, [key]);

  const save = (v: T) => browser.storage.local.set({ [key]: v });
  return [val, save];
}
