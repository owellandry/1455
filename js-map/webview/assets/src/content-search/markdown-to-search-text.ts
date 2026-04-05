import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";

export function markdownToSearchText(markdown: string): string {
  const trimmed = markdown.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return toString(fromMarkdown(trimmed)).trim();
}
