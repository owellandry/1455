export function escapePromptLinkPath(path: string): string {
  // Our persisted prompt format uses markdown links; escape `)` so paths round-trip.
  return path.replaceAll("\\", "\\\\").replaceAll(")", "\\)");
}

export function unescapePromptLinkPath(raw: string): string {
  // Inverse of `escapePromptLinkPath`; `\\` and `\)` are the only escapes we emit.
  return raw.replaceAll("\\)", ")").replaceAll("\\\\", "\\");
}
