import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import DomainTable from "./DomainTable";

export default function Dashboard({ settings }: { settings?: any }) {
    const syncNow = () => chrome.runtime.sendMessage({ type: "SYNC_NOW" });

    return (
        <Card className="w-80 p-4 space-y-3">
            <CardContent>
                <Button className="w-full" onClick={syncNow}>Sync Now</Button>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full mt-2">Manage Domains</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DomainTable />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
