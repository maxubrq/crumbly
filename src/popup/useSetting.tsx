import { useState, useEffect, useCallback } from "react";
import browser from "webextension-polyfill";
import type { Settings, DomainPolicy, CookiePolicy } from "@/modules/types";

/** Default object so you never deal with `undefined` keys */
const DEFAULTS: Settings = {
    policies: [],
    passphrase: undefined,
    githubToken: undefined,
    gistId: undefined,
    cookiePolicies: []
};

/**
 * React hook that:
 *  • Streams `settings` from browser.storage.local
 *  • Exposes atomic mutators so UI stays type-safe
 *  • Guarantees a fully-populated Settings object
 */
export function useSettings(): [
    settings: Settings,
    ready: boolean,
    actions: {
        setToken: (token: string) => Promise<void>;
        setPassphrase: (pass: string) => Promise<void>;
        upsertPolicy: (p: DomainPolicy) => Promise<void>;
        removePolicy: (domain: string) => Promise<void>;
        upsertCookie: (p: CookiePolicy) => Promise<void>;
        removeCookie: (id: string) => Promise<void>;
    }
] {
    const [settings, setSettings] = useState<Settings>(DEFAULTS);
    const [ready, setReady] = useState(false);

    // ← initial load + storage.onChanged listener
    useEffect(() => {
        let ignore = false;

        async function load() {
            const { settings: raw } = (await browser.storage.local.get("settings")) as { settings: Settings };
            if (ignore) return;
            setSettings({ ...DEFAULTS, ...raw });
            setReady(true);
        }
        load();

        const sub = (changes: any, area: string) => {
            if (area === "local" && changes.settings)
                setSettings({ ...DEFAULTS, ...changes.settings.newValue });
        };
        browser.storage.onChanged.addListener(sub);
        return () => {
            ignore = true;
            browser.storage.onChanged.removeListener(sub);
        };
    }, []);

    /** overwrite helper */
    const save = useCallback(async (next: Settings) => {
        await browser.storage.local.set({ settings: next });
    }, []);

    /* ——— mutators ——— */
    const setToken = (githubToken: string) => save({ ...settings, githubToken });
    const setPassphrase = (passphrase: string) => save({ ...settings, passphrase });

    const upsertPolicy = async (pol: DomainPolicy) => {
        const others = settings.policies.filter(p => p.domain !== pol.domain);
        await save({ ...settings, policies: [...others, pol] });
    };

    const removePolicy = async (domain: string) =>
        save({ ...settings, policies: settings.policies.filter(p => p.domain !== domain) });

    const upsertCookie = async (pol: CookiePolicy) => {
        const others = settings.cookiePolicies.filter(p => p.id !== pol.id);
        await save({ ...settings, cookiePolicies: [...others, pol] });
    };

    const removeCookie = async (id: string) =>
        save({ ...settings, cookiePolicies: settings.cookiePolicies.filter(p => p.id !== id) });

    return [settings, ready, { setToken, setPassphrase, upsertPolicy, removePolicy, upsertCookie, removeCookie }];
}
