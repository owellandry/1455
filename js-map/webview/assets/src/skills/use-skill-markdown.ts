import { formatSkillTitle } from "@/skills/format-skill-title";
import { stripFrontmatter } from "@/skills/strip-frontmatter";
import { normalizePath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

export function useSkillMarkdown({
  path,
  expectedTitle,
  enabled = true,
}: {
  path: string | null;
  expectedTitle?: string | null;
  enabled?: boolean;
}): {
  markdown: string;
  isFetching: boolean;
  error: string | null;
} {
  const shouldFetch = enabled && path != null;
  const { data, error, isFetching } = useFetchFromVSCode("read-file", {
    params: { path: path ?? "" },
    queryConfig: { enabled: shouldFetch },
  });
  const fileContents = data?.contents ?? "";
  const normalizedContents = fileContents.replace(/\r\n/g, "\n");
  const markdown = stripLeadingSkillTitle(
    stripFrontmatter(normalizedContents),
    {
      path,
      expectedTitle,
    },
  );
  const errorMessage = error ? String(error.message ?? error) : null;

  return { markdown, isFetching, error: errorMessage };
}

function stripLeadingSkillTitle(
  markdown: string,
  {
    path,
    expectedTitle,
  }: {
    path: string | null;
    expectedTitle?: string | null;
  },
): string {
  const expectedTitles = getExpectedHeadingTitles({ path, expectedTitle });
  if (expectedTitles.length === 0) {
    return markdown;
  }
  const lines = markdown.split("\n");
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  if (index >= lines.length) {
    return markdown;
  }
  const trimmedLine = lines[index].trim();
  if (!/^#\s+/.test(trimmedLine)) {
    return markdown;
  }
  index += 1;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  return lines.slice(index).join("\n");
}

function getExpectedHeadingTitles({
  path,
  expectedTitle,
}: {
  path: string | null;
  expectedTitle?: string | null;
}): Array<string> {
  const titles = new Set<string>();
  if (expectedTitle) {
    titles.add(normalizeHeadingText(expectedTitle));
  }
  const pathTitle = getSkillTitleFromPath(path);
  if (pathTitle) {
    titles.add(normalizeHeadingText(pathTitle));
  }
  return Array.from(titles);
}

function getSkillTitleFromPath(path: string | null): string | null {
  if (!path) {
    return null;
  }
  const normalizedPath = normalizePath(path).replace(/\/+$/, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    return null;
  }
  if (lastSegment.toLowerCase() === "skill.md" && segments.length > 1) {
    return formatSkillTitle(segments[segments.length - 2]);
  }
  const baseName = lastSegment.replace(/\.[^/.]+$/, "");
  return baseName ? formatSkillTitle(baseName) : null;
}

function normalizeHeadingText(value: string): string {
  return value
    .replace(/^#+\s*/, "")
    .replace(/\s*#+\s*$/, "")
    .replace(/[\\`*_~]/g, "")
    .replace(/^\$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
