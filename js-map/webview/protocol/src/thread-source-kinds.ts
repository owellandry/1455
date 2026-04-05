import type { ThreadSourceKind } from "app-server-types/v2";

/**
 * Passing an empty array tells the app server to apply its default interactive
 * source filter. This avoids hardcoding the interactive list in the client.
 */
export const INTERACTIVE_THREAD_SOURCE_KINDS: Array<ThreadSourceKind> = [];

export const SPAWNED_SUBAGENT_THREAD_SOURCE_KINDS: Array<ThreadSourceKind> = [
  "subAgentThreadSpawn",
];
