import type { ModelUpgradeInfo } from "app-server-types/v2";

const MIGRATION_MARKDOWN_URL_PATTERN =
  /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/;
const TRAILING_URL_PUNCTUATION_PATTERN = /[.,!?;:]+$/;

export function getModelUpgradeLinkUrl(
  modelUpgradeInfo: ModelUpgradeInfo,
): string | null {
  const directLink = modelUpgradeInfo.modelLink?.trim();
  if (directLink) {
    return directLink;
  }

  const migrationMarkdown = modelUpgradeInfo.migrationMarkdown;
  if (migrationMarkdown == null) {
    return null;
  }

  const firstMigrationMarkdownLink = migrationMarkdown.match(
    MIGRATION_MARKDOWN_URL_PATTERN,
  );
  const linkUrl =
    firstMigrationMarkdownLink?.[1] ?? firstMigrationMarkdownLink?.[2] ?? null;

  if (linkUrl == null) {
    return null;
  }

  return linkUrl.replace(TRAILING_URL_PUNCTUATION_PATTERN, "");
}
