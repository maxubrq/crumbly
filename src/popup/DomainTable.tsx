import { useState, useEffect } from "react";
import browser from "webextension-polyfill";

import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DomainPolicy } from "@/modules/types";

/* ---------- helpers ---------- */

/** normalise to ".example.com" */
const canonical = (d: string) => (d.startsWith(".") ? d : "." + d.toLowerCase());

/** find the best-matching rule for a domain */
const ruleFor = (domain: string, policies: DomainPolicy[]) => {
    let hit: DomainPolicy | undefined;
    for (const p of policies)
        if (domain.endsWith(p.domain) && (!hit || p.domain.length > hit.domain.length))
            hit = p;
    return hit;
};

export default function DomainTable() {
    /* storage-backed rules */
    const [policies, setPolicies] = useState<DomainPolicy[]>([]);

    /* discovered cookie domains */
    const [cookieDomains, setCookieDomains] = useState<string[]>([]);

    /* new-domain input */
    const [newDomain, setNewDomain] = useState("");

    /* ──────────────────────────────────────────────── */
    /* load rules & cookie domains on mount            */
    /* ──────────────────────────────────────────────── */
    useEffect(() => {
        (async () => {
            const { settings } = await browser.storage.local.get("settings") as { settings: { policies: DomainPolicy[] } };
            setPolicies(settings?.policies ?? []);

            const cookies = await browser.cookies.getAll({});
            const uniq = new Set(cookies.map(c => canonical(c.domain)));
            setCookieDomains([...uniq].sort());
        })();
    }, []);

    /* save helper */
    const savePolicies = async (next: DomainPolicy[]) => {
        setPolicies(next);
        const prev = await browser.storage.local.get("settings") as { settings: { policies: DomainPolicy[] } };
        await browser.storage.local.set({ settings: { ...prev.settings, policies: next } });
    };

    /* toggle allow/block */
    const toggle = (domain: string) => {
        const hit = policies.find(p => p.domain === domain);
        if (hit) {
            /* flip existing rule */
            savePolicies(
                policies.map(p =>
                    p.domain === domain ? { ...p, mode: p.mode === "block" ? "allow" : "block" } : p,
                ),
            );
        } else {
            /* add new explicit block → becomes allow after toggle */
            savePolicies([...policies, { domain, mode: "block" }]);
        }
    };

    /* add new explicit rule (blocked by default) */
    const addDomain = () => {
        if (!newDomain.trim()) return;
        const dom = canonical(newDomain.trim());
        if (!cookieDomains.includes(dom)) setCookieDomains([...cookieDomains, dom].sort());
        savePolicies([...policies, { domain: dom, mode: "block" }]);
        setNewDomain("");
    };

    /* remove explicit rule only (domain still listed if cookies exist) */
    const remove = (domain: string) =>
        savePolicies(policies.filter(p => p.domain !== domain));

    /* recompute merged rows every render */
    const rows = Array.from(new Set([...cookieDomains, ...policies.map(p => p.domain)]))
        .sort()
        .map(d => {
            const rule = ruleFor(d, policies);
            const mode: "allow" | "block" = rule ? rule.mode : "allow";
            return { domain: d, mode, explicit: !!rule && rule.domain === d };
        });

    /* ──────────────────────────────────────────────── */
    /* UI                                              */
    /* ──────────────────────────────────────────────── */
    return (
        <>
            <h2 className="text-lg font-semibold mb-2">Domain Filters</h2>

            <div className="flex gap-2 mb-4">
                <Input
                    value={newDomain}
                    placeholder="example.com"
                    onChange={e => setNewDomain(e.target.value)}
                />
                <Button onClick={addDomain}>Add</Button>
                <Button
                    variant="ghost"
                    onClick={async () => {
                        const cookies = await browser.cookies.getAll({});
                        const uniq = new Set(cookies.map(c => canonical(c.domain)));
                        setCookieDomains([...uniq].sort());
                    }}
                >
                    Refresh
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead className="text-center">Toggle</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ domain, mode, explicit }) => (
                        <TableRow key={domain}>
                            <TableCell>{mode === "allow" ? "✔️" : "❌"}</TableCell>
                            <TableCell>{domain}</TableCell>
                            <TableCell className="text-center">
                                <Switch checked={mode === "allow"} onCheckedChange={() => toggle(domain)} />
                            </TableCell>
                            <TableCell>
                                {explicit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(domain)}
                                        title="Remove explicit rule"
                                    >
                                        ✕
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
}
