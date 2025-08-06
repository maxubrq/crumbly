export type SyncStage =
  | "idle"
  | "dumping"
  | "filtering"
  | "encrypting"
  | "uploading"
  | "done"
  | "error";

export interface SyncMessage {
  stage: SyncStage;
  error?: string;           // present only if stage === "error"
}
