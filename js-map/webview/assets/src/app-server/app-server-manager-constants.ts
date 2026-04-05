import type * as AppServer from "app-server-types";

export const OWNER_WINDOW_ERROR =
  "Please continue this conversation on the window where it was started.";

// Use a timeout that tolerates slower MCP setup.
export const DEFAULT_TIMEOUT_MS = 30_000;
export const TITLE_INPUT_CHAR_LIMIT = 2_000;
export const THREAD_TITLE_MAX_ENTRIES = 200;
export const MANUAL_THREAD_TITLE_MAX_CHARS = 60;
export const RECENT_CONVERSATIONS_PAGE_SIZE = 50;
export const OUTPUT_DELTA_FLUSH_INTERVAL_MS = 50;
export const WINDOWS_SANDBOX_SETUP_TIMEOUT_MS = 1_200_000;
export const WINDOWS_SANDBOX_SETUP_TIMEOUT_TOMBSTONE_MS = 300_000;
export const DEFAULT_MODE: AppServer.ModeKind = "default";
