const SKILL_TITLE_ACRONYMS = new Set([
  "GH",
  "MCP",
  "API",
  "CI",
  "CLI",
  "LLM",
  "PDF",
  "PR",
  "UI",
  "URL",
  "SQL",
  "TW",
  "GPU",
  "CPU",
]);

const SKILL_TITLE_PROPER = new Map([
  ["openai", "OpenAI"],
  ["openapi", "OpenAPI"],
  ["github", "GitHub"],
  ["pagerduty", "PagerDuty"],
  ["datadog", "DataDog"],
  ["sqlite", "SQLite"],
  ["fastapi", "FastAPI"],
]);

const SKILL_TITLE_LOWERCASE = new Set(["and", "or", "to", "up", "with"]);

/**
 * Normalize skill names into display titles:
 * - hyphens become spaces
 * - known acronyms stay uppercase (e.g. "API")
 * - known brands keep preferred casing (e.g. "GitHub")
 * - small words stay lowercase when not leading
 */
export function formatSkillTitle(name: string): string {
  return name
    .replaceAll("-", " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment, index) => {
      const upper = segment.toUpperCase();
      if (SKILL_TITLE_ACRONYMS.has(upper)) {
        return upper;
      }
      const lower = segment.toLowerCase();
      const proper = SKILL_TITLE_PROPER.get(lower);
      if (proper) {
        return proper;
      }
      if (index > 0 && SKILL_TITLE_LOWERCASE.has(lower)) {
        return lower;
      }
      return lower[0].toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
