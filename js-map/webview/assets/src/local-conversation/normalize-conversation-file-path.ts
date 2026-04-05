export function normalizeConversationFilePath(path: string): string {
  return path
    .trim()
    .replace(/^\.\/+/, "")
    .replaceAll(/\\/g, "/");
}
