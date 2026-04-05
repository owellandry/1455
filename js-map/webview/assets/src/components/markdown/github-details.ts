const DETAILS_BLOCK_PATTERN = /<details(\s+open)?>([\s\S]*?)<\/details>/gi;
const FENCED_CODE_BLOCK_PATTERN =
  /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const SUMMARY_PATTERN = /^\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*)$/i;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const FENCED_CODE_PLACEHOLDER_PREFIX = "@@CODEX_FENCED_CODE_BLOCK_";

export function prepareGitHubMarkdown(markdown: string): string {
  const fencedCodeBlocks: Array<string> = [];
  const markdownWithPlaceholders = markdown.replace(
    FENCED_CODE_BLOCK_PATTERN,
    (match) => {
      const placeholder = `${FENCED_CODE_PLACEHOLDER_PREFIX}${fencedCodeBlocks.length}@@`;
      fencedCodeBlocks.push(match);
      return placeholder;
    },
  );

  return restoreFencedCodeBlocks(
    transformGitHubMarkdownSegment(markdownWithPlaceholders),
    fencedCodeBlocks,
  );
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getGitHubDetailsSummaryText(value: string): string {
  return collapseWhitespace(value.replace(HTML_TAG_PATTERN, " "));
}

function transformGitHubMarkdownSegment(segment: string): string {
  return segment
    .replace(HTML_COMMENT_PATTERN, "")
    .replace(
      DETAILS_BLOCK_PATTERN,
      (match, openAttribute: string | undefined, innerContent: string) => {
        const summaryMatch = innerContent.match(SUMMARY_PATTERN);
        if (summaryMatch == null) {
          return match;
        }

        const summary = getGitHubDetailsSummaryText(summaryMatch[1] ?? "");
        if (summary.length === 0) {
          return match;
        }

        const body = (summaryMatch[2] ?? "").trim();
        const attributes = [`summary=${JSON.stringify(summary)}`];

        if (openAttribute != null) {
          attributes.push('open="true"');
        }

        return `:::github-details{${attributes.join(" ")}}\n${body}\n:::`;
      },
    )
    .replace(/\n{3,}/g, "\n\n");
}

function restoreFencedCodeBlocks(
  markdown: string,
  fencedCodeBlocks: Array<string>,
): string {
  return markdown.replace(
    /@@CODEX_FENCED_CODE_BLOCK_(\d+)@@/g,
    (placeholder, indexText: string) => {
      const index = Number(indexText);
      return fencedCodeBlocks[index] ?? placeholder;
    },
  );
}
