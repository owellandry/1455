export const RECOMMENDED_SKILL_NAME_ORDER = [
  "Imagegen",
  "Sora",
  "PDF",
  "Doc",
  "Spreadsheet",
  "Playwright",
] as const;

export const RECOMMENDED_SKILL_NAMES = new Set(
  RECOMMENDED_SKILL_NAME_ORDER.map((name) => name.toLowerCase()),
);

export const RECOMMENDED_SKILL_NAME_ORDER_INDEX = new Map(
  RECOMMENDED_SKILL_NAME_ORDER.map((name, index) => [
    name.toLowerCase(),
    index,
  ]),
);
