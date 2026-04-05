const TRAILING_MARKDOWN_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\n]+)$/;
const LEADING_WHITESPACE_PATTERN = /^\s/;

export function optimisticallyCloseMarkdown(markdown: string): string {
  if (
    markdown.length === 0 ||
    hasUnclosedCodeFence(markdown) ||
    hasUnclosedInlineCode(markdown)
  ) {
    return markdown;
  }

  let next = closeTrailingMarkdownLink(markdown);
  next = closeTrailingMarkdownEmphasis(next, "**");
  next = closeTrailingMarkdownEmphasis(next, "*");
  return next;
}

function closeTrailingMarkdownLink(markdown: string): string {
  const match = markdown.match(TRAILING_MARKDOWN_LINK_PATTERN);
  if (!match) {
    return markdown;
  }
  return `${markdown})`;
}

function closeTrailingMarkdownEmphasis(
  markdown: string,
  delimiter: "**" | "__" | "*" | "_",
): string {
  const count = countDelimiterOccurrences(markdown, delimiter);
  if (count % 2 === 0) {
    return markdown;
  }

  const lastIndex = findLastDelimiterIndex(markdown, delimiter);
  if (lastIndex < 0) {
    return markdown;
  }

  const content = markdown.slice(lastIndex + delimiter.length);
  if (
    content.length === 0 ||
    LEADING_WHITESPACE_PATTERN.test(content) ||
    content.includes("\n") ||
    hasUnclosedInlineCode(content)
  ) {
    return markdown;
  }

  return `${markdown}${delimiter}`;
}

function countDelimiterOccurrences(
  markdown: string,
  delimiter: "**" | "__" | "*" | "_",
): number {
  let count = 0;
  for (let index = 0; index <= markdown.length - delimiter.length; ) {
    if (
      markdown.startsWith(delimiter, index) &&
      !isEscapedMarkdownDelimiter(markdown, index) &&
      !isAdjacentSingleDelimiter(markdown, index, delimiter)
    ) {
      count += 1;
      index += delimiter.length;
      continue;
    }
    index += 1;
  }
  return count;
}

function findLastDelimiterIndex(
  markdown: string,
  delimiter: "**" | "__" | "*" | "_",
): number {
  for (let index = markdown.length - delimiter.length; index >= 0; index -= 1) {
    if (
      markdown.startsWith(delimiter, index) &&
      !isEscapedMarkdownDelimiter(markdown, index) &&
      !isAdjacentSingleDelimiter(markdown, index, delimiter)
    ) {
      return index;
    }
  }
  return -1;
}

function isEscapedMarkdownDelimiter(markdown: string, index: number): boolean {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (markdown[cursor] !== "\\") {
      break;
    }
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function isAdjacentSingleDelimiter(
  markdown: string,
  index: number,
  delimiter: "**" | "__" | "*" | "_",
): boolean {
  if (delimiter.length !== 1) {
    return false;
  }

  const marker = delimiter;
  return markdown[index - 1] === marker || markdown[index + 1] === marker;
}

function hasUnclosedCodeFence(markdown: string): boolean {
  return countUnescapedToken(markdown, "```") % 2 === 1;
}

function hasUnclosedInlineCode(markdown: string): boolean {
  let stripped = "";
  for (let index = 0; index < markdown.length; ) {
    if (markdown.startsWith("```", index)) {
      index += 3;
      while (index < markdown.length && !markdown.startsWith("```", index)) {
        index += 1;
      }
      if (index < markdown.length) {
        index += 3;
      }
      continue;
    }
    stripped += markdown[index] ?? "";
    index += 1;
  }
  return countUnescapedToken(stripped, "`") % 2 === 1;
}

function countUnescapedToken(markdown: string, token: string): number {
  let count = 0;
  for (let index = 0; index <= markdown.length - token.length; ) {
    if (
      markdown.startsWith(token, index) &&
      !isEscapedMarkdownDelimiter(markdown, index)
    ) {
      count += 1;
      index += token.length;
      continue;
    }
    index += 1;
  }
  return count;
}
