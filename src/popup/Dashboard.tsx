/* src/popup/Dashboard.tsx */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useSyncPort } from "./useSyncPort";

import CookieTable from "./CookieTable";
import DomainTable from "./DomainTable";

import type { Settings } from "@/modules/types";
import type { SyncStage } from "@/modules/syncStates";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard({ settings }: { settings: Settings }) {
    const {
        githubToken,
        passphrase,
        gistId,
        policies = [],
        cookiePolicies = [],
    } = settings;

    /* --------- helpers -------- */
    const credsMissing = !githubToken || !passphrase;

    /* quick stats */
    const blockedDomainCount = policies.filter(p => p.mode === "block").length;
    const blockedCookieCount = cookiePolicies.filter(c => c.mode === "block").length;

    const { stage, error, start } = useSyncPort();
    const syncing = stage !== "idle" && stage !== "done" && stage !== "error";
    const stageMap: Record<SyncStage, number> = {
        idle: 0, dumping: 10, decrypting: 60, filtering: 30, encrypting: 60, applying: 80, downloading: 20,
        uploading: 90, done: 100, error: 100,
    };

    /* --------- UI -------- */
    return (
        <Card className="w-96 p-4 space-y-4">
            <CardContent className="space-y-4">

                {/* ── status bar ─────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <span className="font-medium">GitHub Gist</span>

                    {gistId ? (
                        <a
                            href={`https://gist.github.com/${gistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline"
                        >
                            {gistId.slice(0, 8)}…
                        </a>
                    ) : (
                        <Badge variant="destructive">not created</Badge>
                    )}
                </div>

                {/* ── quick stats ────────────────────────────── */}
                <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">{blockedDomainCount} blocked domains</Badge>
                    <Badge variant="secondary">{blockedCookieCount} blocked cookies</Badge>
                </div>

                {/* ── primary action ─────────────────────────── */}
                {syncing && (
                    <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span>{stage.charAt(0).toUpperCase() + stage.slice(1)}…</span>
                    </div>
                )}

                {
                    stage === "dumping" && (
                        <div className="text-sm text-muted-foreground">
                            Dumping cookies from browser storage...👽
                        </div>
                    )
                }

                {
                    stage === "filtering" && (
                        <div className="text-sm text-muted-foreground">
                            Filtering cookies based on your settings...🔍
                        </div>
                    )
                }

                {
                    stage === "encrypting" && (
                        <div className="text-sm text-muted-foreground">
                            Encrypting cookie data with your passphrase...🔒
                        </div>
                    )
                }

                {
                    stage === "downloading" && (
                        <div className="text-sm text-muted-foreground">
                            Downloading latest Gist data...📥
                        </div>
                    )
                }

                {
                    stage === "decrypting" && (
                        <div className="text-sm text-muted-foreground">
                            Decrypting Gist data with your passphrase...🔓
                        </div>
                    )
                }

                {
                    stage === "applying" && (
                        <div className="text-sm text-muted-foreground">
                            Applying cookies to browser storage...🍪
                        </div>
                    )
                }

                {
                    stage === "uploading" && (
                        <div className="text-sm text-muted-foreground">
                            Uploading to GitHub Gist...☁️
                        </div>
                    )
                }

                {stage === "error" && (
                    <div className="text-sm text-destructive">{error}</div>
                )}

                <Button onClick={() => start("push")} disabled={credsMissing || syncing}>
                    {syncing ? "Syncing…" : "Push → Gist"}
                </Button>

                <Button
                    variant="secondary"
                    onClick={() => start("pull")}
                    disabled={credsMissing || syncing}
                    className="w-full mt-2"
                >
                    Pull from Gist
                </Button>

                {syncing && <Progress value={stageMap[stage]} />}

                {/* ── domain manager ─────────────────────────── */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full mt-2">
                            Manage Domains
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                Domain Filters
                            </DialogTitle>
                            <DialogDescription>
                                Manage domains to block or allow cookies. Domains not listed here will be allowed by default.
                                <br />
                                <strong>Note:</strong> This does not affect cookies already synced, only future ones.
                            </DialogDescription>
                        </DialogHeader>
                        <DomainTable />
                    </DialogContent>
                </Dialog>

                {/* ── cookie manager ─────────────────────────── */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full mt-2">
                            Manage Cookies
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                Cookie Filters
                            </DialogTitle>
                            <DialogDescription>
                                Manage cookies to block or allow syncing. Cookies not listed here will be allowed by default.
                                <br />
                                <strong>Note:</strong> This does not affect cookies already synced, only future ones.
                            </DialogDescription>
                        </DialogHeader>
                        <CookieTable />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
