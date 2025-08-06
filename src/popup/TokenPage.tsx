// src/popup/TokenPage.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import browser from "webextension-polyfill";
import { useSettings } from "./useSetting";

export default function TokenPage() {
    const [token, setToken] = useState<string>("");
    const [, , { setToken: saveToken }] = useSettings();

    useEffect(() => {
        browser.storage.local.get("githubToken").then((r: { githubToken?: string }) => setToken(r.githubToken ?? ""));
    }, []);

    const save = async () => {
        await saveToken(token.trim());
        toast.success("Token saved 🚀");           // (optional) shadcn toast
    };

    return (
        <Card className="w-96 p-4">
            <CardContent className="space-y-3">
                <h1>Crumbly</h1>
                <p>
                    <strong>Crumbly</strong> is a browser extension that helps you sync your cookies and store in GitHub Gists.
                </p>
                <br />
                <hr />
                
                <h2 className="text-lg font-semibold">Step 1: GitHub Token</h2>
                <p className="text-sm text-muted-foreground">
                    Create a PAT with the <code>gist</code> scope and paste it below.
                    <br />
                    <strong>Note:</strong> This token is used to access your GitHub Gists and is required for the extension to function properly.
                    <br />
                    <strong>Warning:</strong> Do not share your token with anyone. It grants access to your GitHub account.
                    <br />
                    <em><a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">Learn more about GitHub tokens and How to create one.</a></em>
                </p>

                <Input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value.trim())}
                    placeholder="ghp_********************************"
                />

                <Button className="w-full" onClick={save}>
                    Save Token
                </Button>
            </CardContent>
        </Card>
    );
}
