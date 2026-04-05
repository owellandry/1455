import type { ComposerMode } from "./composer";

export function isNotCloudComposerMode(
  mode: ComposerMode,
): mode is "local" | "worktree" {
  return mode !== "cloud";
}
