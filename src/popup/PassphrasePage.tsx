// src/popup/TokenPage.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import browser from "webextension-polyfill";
import { useSettings } from "./useSetting";

export default function PassphrasePage() {
    const [passphrase, setPassphrase] = useState<string>("");
    const [, , { setPassphrase: savePassphrase }] = useSettings();

    useEffect(() => {
        browser.storage.local.get("passphrase").then((r: { passphrase?: string }) => setPassphrase(r.passphrase ?? ""));
    }, []);

    const save = async () => {
        await savePassphrase(passphrase.trim());
        toast.success("Passphrase saved 🚀");           // (optional) shadcn toast
    };

    return (
        <Card className="w-80 p-4">
            <CardContent className="space-y-3">
                <h1 className="text-lg font-semibold">GitHub Token</h1>
                <p className="text-sm text-muted-foreground">
                    Create a PAT with the <code>gist</code> scope and paste it below.
                </p>

                <Input
                    type="password"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    placeholder="ghp_********************************"
                />

                <Button className="w-full" onClick={save}>
                    Save
                </Button>
            </CardContent>
        </Card>
    );
}
