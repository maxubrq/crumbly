export type SyncStage =
  | "idle"
  | "dumping"
  | "downloading" // new
  | "decrypting"  // replaces "encrypting" on pull path
  | "applying"    // new
  | "filtering"
  | "encrypting"
  | "uploading"
  | "done"
  | "error";

export interface SyncMessage {
  stage: SyncStage;
  error?: string;           // present only if stage === "error"
}
