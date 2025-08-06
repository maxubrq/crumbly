import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
    from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "./useSetting";

export default function CookieTable() {
    const [cookies, setCookies] = useState<browser.Cookies.Cookie[]>([]);
    const [search, setSearch] = useState("");
    const [settings, , { upsertCookie, removeCookie }] = useSettings();

    /* Load live cookie jar once popup opens */
    useEffect(() => {
        browser.cookies.getAll({}).then(setCookies);
    }, []);

    const isBlocked = (c: browser.Cookies.Cookie) =>
        settings.cookiePolicies.some(p => p.id === `${c.name}@${c.domain}` && p.mode === "block");

    const toggle = (c: browser.Cookies.Cookie) => {
        const id = `${c.name}@${c.domain}`;
        isBlocked(c)
            ? removeCookie(id)
            : upsertCookie({ id, mode: "block" });          // default action = block
    };

    const filtered = cookies.filter(c =>
        (c.domain + c.name).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <div className="flex gap-2 mb-4">
                <Input value={search} placeholder="Filter…" onChange={e => setSearch(e.target.value)} />
                <Button variant="ghost" onClick={() => setSearch("")}>Clear</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sync?</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Domain</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map(c => {
                        const blocked = isBlocked(c);
                        return (
                            <TableRow key={`${c.name}@${c.domain}`}>
                                <TableCell>
                                    <Checkbox checked={!blocked} onCheckedChange={() => toggle(c)} />
                                </TableCell>
                                <TableCell>{c.name}</TableCell>
                                <TableCell className="text-muted-foreground">{c.domain}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </>
    );
}
