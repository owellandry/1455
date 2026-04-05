import { join, normalize } from "path";

const DEFAULT_CODEX_HOME_SEGMENT = "/.codex";

/**
 * Returns the Codex home path, honoring CODEX_HOME when set, otherwise
 * falling back to $HOME/.codex when HOME is available.
 */
export function resolveCodexHomePath(env?: NodeJS.ProcessEnv): string {
  const resolvedEnv =
    env ??
    (typeof process !== "undefined"
      ? (process.env as NodeJS.ProcessEnv | undefined)
      : undefined);

  if (resolvedEnv?.CODEX_HOME && resolvedEnv.CODEX_HOME.length > 0) {
    return normalize(resolvedEnv.CODEX_HOME);
  }
  if (resolvedEnv?.HOME && resolvedEnv.HOME.length > 0) {
    return normalize(join(resolvedEnv.HOME, ".codex"));
  }
  return DEFAULT_CODEX_HOME_SEGMENT;
}

/** Returns the worktrees segment, honoring CODEX_HOME when set. */
export function getWorktreesSegment(codexHome?: string): string {
  const resolvedCodexHome = codexHome ?? resolveCodexHomePath();
  return normalize(join(resolvedCodexHome, "worktrees"));
}

export function isCodexWorktree(
  input: string | null | undefined,
  codexHome?: string,
): boolean {
  if (!input) {
    return false;
  }
  const segment = normalizeWorktreeComparisonPath(
    getWorktreesSegment(codexHome),
  );
  return normalizeWorktreeComparisonPath(input).includes(segment);
}

function normalizeWorktreeComparisonPath(path: string): string {
  const normalizedPath = normalize(path).replaceAll("\\", "/");
  return isWindowsStylePath(normalizedPath)
    ? normalizedPath.toLowerCase()
    : normalizedPath;
}

function isWindowsStylePath(path: string): boolean {
  return /^[a-zA-Z]:\//.test(path) || path.startsWith("//");
}
