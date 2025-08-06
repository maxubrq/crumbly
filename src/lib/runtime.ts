// src/lib/runtime.ts
import browser from "webextension-polyfill";

/** A single, typed handle that works in every browser. */
export const runtime = browser as typeof chrome & typeof browser;
