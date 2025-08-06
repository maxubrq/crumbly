import { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell }
    from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DomainPolicy } from "@/modules/types";

export default function DomainTable() {
    const [policies, setPolicies] = useState<DomainPolicy[]>([]);
    const [newDomain, setNewDomain] = useState("");

    useEffect(() => {
        browser.storage.local.get("settings").then((r: any) => {
            setPolicies((r.settings?.policies as DomainPolicy[]) ?? []);
        });
    }, []);

    const savePolicies = async (next: DomainPolicy[]) => {
        setPolicies(next);
        const prev: any = await browser.storage.local.get("settings");
        await browser.storage.local.set({
            settings: { ...prev.settings, policies: next }
        });
    };

    const toggle = (domain: string) => {
        savePolicies(
            policies.map(p => p.domain === domain ? { ...p, mode: p.mode === "block" ? "allow" : "block" } : p)
        );
    };

    const addDomain = () => {
        if (!newDomain) return;
        const dom = newDomain.startsWith(".") ? newDomain : "." + newDomain;
        savePolicies([...policies, { domain: dom, mode: "block" }]);
        setNewDomain("");
    };

    const remove = (domain: string) => savePolicies(policies.filter(p => p.domain !== domain));

    return (
        <>
            <h2 className="text-lg font-semibold mb-2">Domain Filters</h2>

            <div className="flex gap-2 mb-4">
                <Input value={newDomain} placeholder="example.com" onChange={e => setNewDomain(e.target.value)} />
                <Button onClick={addDomain}>Add</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead className="text-center">Sync?</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {policies.map(p => (
                        <TableRow key={p.domain}>
                            <TableCell>{p.domain}</TableCell>
                            <TableCell className="text-center">
                                <Switch checked={p.mode === "allow"} onCheckedChange={() => toggle(p.domain)} />
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => remove(p.domain)}>✕</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
}
