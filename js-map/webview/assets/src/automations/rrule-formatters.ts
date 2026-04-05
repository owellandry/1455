import type { IntlShape } from "react-intl";

export const WEEKDAY_ORDER = [
  "SU",
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
] as const;
export type RruleWeekday = (typeof WEEKDAY_ORDER)[number];

export function sortWeekdays(
  weekdays: Array<RruleWeekday>,
): Array<RruleWeekday> {
  const order = new Map(
    WEEKDAY_ORDER.map((day, index): [RruleWeekday, number] => [day, index]),
  );
  return [...new Set(weekdays)].sort((a, b): number => {
    return (order.get(a) ?? 0) - (order.get(b) ?? 0);
  });
}

export function formatScheduleTimeLabel(
  time: string,
  intl: IntlShape,
): string | null {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return intl.formatTime(new Date(2024, 0, 1, hour, minute), {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatWeekdayPlural(
  weekday: RruleWeekday,
  intl: IntlShape,
): string {
  switch (weekday) {
    case "SU":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.sundaysLabel",
        defaultMessage: "Sundays",
        description: "Plural Sunday label for schedule summaries",
      });
    case "MO":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.mondaysLabel",
        defaultMessage: "Mondays",
        description: "Plural Monday label for schedule summaries",
      });
    case "TU":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.tuesdaysLabel",
        defaultMessage: "Tuesdays",
        description: "Plural Tuesday label for schedule summaries",
      });
    case "WE":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.wednesdaysLabel",
        defaultMessage: "Wednesdays",
        description: "Plural Wednesday label for schedule summaries",
      });
    case "TH":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.thursdaysLabel",
        defaultMessage: "Thursdays",
        description: "Plural Thursday label for schedule summaries",
      });
    case "FR":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.fridaysLabel",
        defaultMessage: "Fridays",
        description: "Plural Friday label for schedule summaries",
      });
    case "SA":
      return intl.formatMessage({
        id: "settings.automations.scheduleSummary.saturdaysLabel",
        defaultMessage: "Saturdays",
        description: "Plural Saturday label for schedule summaries",
      });
  }
}

export function formatWeekdaysSummary(
  weekdays: Array<RruleWeekday>,
  intl: IntlShape,
  isWeekdaysOnly: boolean,
  isWeekendsOnly: boolean,
  format: "short" | "long",
): string | null {
  if (isWeekdaysOnly) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.weekdaysLabel",
      defaultMessage: "weekdays",
      description: "Weekday label for schedule summaries",
    });
  }
  if (isWeekendsOnly) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.weekendsLabel",
      defaultMessage: "weekends",
      description: "Weekend label for schedule summaries",
    });
  }
  if (format === "long" && weekdays.length === 1) {
    const weekday = weekdays[0];
    return weekday ? formatWeekdayPlural(weekday, intl) : null;
  }
  if (weekdays.length > 2 && isConsecutiveWeekdays(weekdays)) {
    return formatWeekdayRangeLabel(weekdays, intl);
  }
  const resolvedFormat = weekdays.length > 2 ? "short" : format;
  return formatWeekdaysLabel(weekdays, intl, resolvedFormat);
}

export function isExactWeekdaySet(
  weekdays: Array<RruleWeekday>,
  expected: ReadonlyArray<RruleWeekday>,
): boolean {
  if (weekdays.length !== expected.length) {
    return false;
  }
  return expected.every((day) => weekdays.includes(day));
}

function formatWeekdaysLabel(
  weekdays: Array<RruleWeekday>,
  intl: IntlShape,
  format: "short" | "long",
): string | null {
  const labels = weekdays.map((weekday): string =>
    format === "short"
      ? formatWeekdayAbbrev(weekday, intl)
      : formatWeekdayLabel(weekday, intl, "long"),
  );
  if (labels.length === 0) {
    return null;
  }
  return intl.formatList(labels, { type: "conjunction" });
}

function formatWeekdayLabel(
  weekday: RruleWeekday,
  intl: IntlShape,
  format: "short" | "long",
): string {
  const date = resolveWeekdayDate(weekday);
  return intl.formatDate(date, { weekday: format });
}

function resolveWeekdayDate(weekday: RruleWeekday): Date {
  const offset = weekdayToOffset(weekday);
  return new Date(2024, 0, 7 + offset);
}

function weekdayToOffset(weekday: RruleWeekday): number {
  return WEEKDAY_ORDER.indexOf(weekday);
}

function formatWeekdayAbbrev(weekday: RruleWeekday, intl: IntlShape): string {
  const shortLabel = formatWeekdayLabel(weekday, intl, "short");
  const longLabel = formatWeekdayLabel(weekday, intl, "long");
  if (shortLabel.length >= longLabel.length) {
    return intl.formatDate(resolveWeekdayDate(weekday), { weekday: "narrow" });
  }
  return shortLabel;
}

function formatWeekdayRangeLabel(
  weekdays: Array<RruleWeekday>,
  intl: IntlShape,
): string {
  const sorted = sortWeekdays(weekdays);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  if (!start || !end) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.weekdaysLabel",
      defaultMessage: "weekdays",
      description: "Weekday label for schedule summaries",
    });
  }
  return `${formatWeekdayAbbrev(start, intl)}-${formatWeekdayAbbrev(end, intl)}`;
}

function isConsecutiveWeekdays(weekdays: Array<RruleWeekday>): boolean {
  if (weekdays.length < 2) {
    return false;
  }
  const sorted = sortWeekdays(weekdays);
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = WEEKDAY_ORDER.indexOf(sorted[index - 1] ?? "");
    const current = WEEKDAY_ORDER.indexOf(sorted[index] ?? "");
    if (prev < 0 || current < 0 || current !== prev + 1) {
      return false;
    }
  }
  return true;
}
