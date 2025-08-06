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
        <Card className="w-96 p-4">
            <CardContent className="space-y-3">
                <h1 className="text-lg font-semibold">Step 2: Pass Phrase</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your <strong>Pass phrase</strong> to encrypt your tokens. This is used to secure your GitHub tokens and is required for the extension to function properly.
                    <br />
                    <strong>Note:</strong> This passphrase is not stored on our servers and is only used locally in your browser.
                </p>

                <Input
                    type="password"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    placeholder="Enter your passphrase"
                />

                <Button className="w-full" onClick={save}>
                    Save Pass Phrase
                </Button>
            </CardContent>
        </Card>
    );
}
