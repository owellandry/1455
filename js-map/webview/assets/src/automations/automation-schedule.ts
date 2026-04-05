import type { IntlShape } from "react-intl";
import {
  RRule,
  rrulestr,
  type Options,
  type RRuleSet,
  type Weekday,
} from "rrule";

import {
  WEEKDAY_ORDER,
  formatScheduleTimeLabel,
  formatWeekdaysSummary,
  isExactWeekdaySet,
  sortWeekdays,
  type RruleWeekday,
} from "./rrule-formatters";

export type { RruleWeekday } from "./rrule-formatters";

const ALL_WEEKDAYS = Array.from(WEEKDAY_ORDER);
const WEEKDAYS_ONLY = ["MO", "TU", "WE", "TH", "FR"] as const;
const WEEKENDS_ONLY = ["SA", "SU"] as const;
const BADGE_SEPARATOR = " · ";
const DEFAULT_TIME = "09:00";
const DEFAULT_WEEKLY_DAY: RruleWeekday = "MO";

export type ScheduleMode =
  | "hourly"
  | "daily"
  | "weekdays"
  | "weekly"
  | "custom";
export type ScheduleConfig = {
  mode: ScheduleMode;
  intervalHours: number;
  intervalMinutes: number | null;
  weekdays: Array<RruleWeekday>;
  time: string;
  customRrule: string;
};

type ParsedScheduleDetails = {
  freq: number;
  interval: number;
  minute: number | null;
  rruleText: string;
  time: string;
  weekdays: Array<RruleWeekday>;
};

const RRULE_WEEKDAY_MAP: Record<RruleWeekday, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

export function createDefaultScheduleConfig(): ScheduleConfig {
  return {
    mode: "daily",
    intervalHours: 24,
    intervalMinutes: null,
    weekdays: ALL_WEEKDAYS,
    time: DEFAULT_TIME,
    customRrule: "",
  };
}

export function createDefaultHeartbeatScheduleConfig(): ScheduleConfig {
  return {
    ...createDefaultScheduleConfig(),
    mode: "hourly",
    intervalHours: 1,
    intervalMinutes: 30,
    weekdays: ALL_WEEKDAYS,
    customRrule: "",
  };
}

export function parseScheduleConfig(rruleText: string | null): ScheduleConfig {
  const fallback = createDefaultScheduleConfig();
  const scheduleDetails = getParsedScheduleDetails(rruleText);
  if (!scheduleDetails) {
    return fallback;
  }
  const mode = getScheduleModeFromParsedDetails(scheduleDetails);
  return {
    ...fallback,
    mode,
    intervalHours: scheduleDetails.interval,
    intervalMinutes: null,
    weekdays: scheduleDetails.weekdays,
    time: scheduleDetails.time,
    customRrule: mode === "custom" ? scheduleDetails.rruleText : "",
  };
}

export function parseHeartbeatScheduleConfig(
  rruleText: string | null,
): ScheduleConfig {
  const fallback = createDefaultHeartbeatScheduleConfig();
  const scheduleDetails = getParsedScheduleDetails(rruleText);
  if (!scheduleDetails) {
    return fallback;
  }
  const intervalMinutes = getHeartbeatIntervalMinutes(scheduleDetails);
  return {
    ...fallback,
    intervalHours: Math.max(1, Math.round(intervalMinutes / 60)),
    intervalMinutes,
  };
}

export function buildScheduleRruleString(config: ScheduleConfig): string {
  switch (config.mode) {
    case "hourly":
      return config.intervalMinutes != null
        ? buildMinutelyRruleString(config.intervalMinutes)
        : buildHourlyRruleString(config.intervalHours);
    case "daily":
      return buildTimedWeeklyRruleString({
        time: config.time,
        weekdays: ALL_WEEKDAYS,
      });
    case "weekdays":
      return buildTimedWeeklyRruleString({
        time: config.time,
        weekdays: Array.from(WEEKDAYS_ONLY),
      });
    case "weekly":
      return buildTimedWeeklyRruleString({
        time: config.time,
        weekdays: [getWeeklyScheduleDay(config.weekdays)],
      });
    case "custom":
      return config.customRrule.trim();
  }
}

export function isScheduleConfigValid(config: ScheduleConfig): boolean {
  switch (config.mode) {
    case "hourly":
      return config.intervalMinutes != null
        ? normalizeIntervalMinutes(config.intervalMinutes) != null
        : normalizeIntervalHours(config.intervalHours) != null;
    case "daily":
    case "weekdays":
    case "weekly":
      return getTimeParts(config.time) != null;
    case "custom":
      return canParseRrule(config.customRrule.trim());
  }
}

export function changeScheduleMode(
  config: ScheduleConfig,
  nextMode: ScheduleMode,
): ScheduleConfig {
  if (nextMode === "custom") {
    return {
      ...config,
      mode: "custom",
      customRrule:
        config.mode === "custom" && config.customRrule.trim()
          ? config.customRrule
          : buildScheduleRruleString(config),
    };
  }
  if (nextMode === "hourly") {
    return {
      ...config,
      mode: "hourly",
      intervalHours:
        config.mode === "hourly"
          ? (normalizeIntervalHours(config.intervalHours) ?? 1)
          : 1,
      intervalMinutes:
        config.intervalMinutes != null
          ? (normalizeIntervalMinutes(config.intervalMinutes) ?? 30)
          : null,
    };
  }
  if (nextMode === "daily") {
    return {
      ...config,
      mode: "daily",
      weekdays: ALL_WEEKDAYS,
    };
  }
  if (nextMode === "weekdays") {
    return {
      ...config,
      mode: "weekdays",
      weekdays: Array.from(WEEKDAYS_ONLY),
    };
  }
  return {
    ...config,
    mode: "weekly",
    weekdays: [getWeeklyScheduleDay(config.weekdays)],
  };
}

export function hasWeekday(
  weekdays: Array<RruleWeekday>,
  day: RruleWeekday,
): boolean {
  return weekdays.includes(day);
}

export function toggleWeekday(
  weekdays: Array<RruleWeekday>,
  day: RruleWeekday,
): Array<RruleWeekday> {
  const next = weekdays.includes(day)
    ? weekdays.filter((value): boolean => value !== day)
    : [...weekdays, day];
  return sortWeekdays(next);
}

export function isSingleWeekday(weekdays: Array<RruleWeekday>): boolean {
  return weekdays.length === 1;
}

export function listWeekdays(
  weekdays: Array<RruleWeekday>,
): Array<RruleWeekday> {
  return weekdays.length > 0 ? sortWeekdays(weekdays) : ALL_WEEKDAYS;
}

export function formatScheduleSummary(
  scheduleConfig: ScheduleConfig,
  intl: IntlShape,
): string | null {
  return (
    formatParsedScheduleSummary(
      getParsedScheduleDetails(buildScheduleRruleString(scheduleConfig)),
      intl,
    ) ?? null
  );
}

export function formatScheduleBadgeSummary(
  scheduleConfig: ScheduleConfig,
  intl: IntlShape,
): string | null {
  return (
    formatParsedScheduleBadgeSummary(
      getParsedScheduleDetails(buildScheduleRruleString(scheduleConfig)),
      intl,
    ) ?? null
  );
}

export function formatScheduleSummaryForRrule({
  rrule,
  intl,
  fallbackMessage,
}: {
  rrule: string | null;
  intl: IntlShape;
  fallbackMessage: string;
}): string | null {
  if (!rrule) {
    return null;
  }
  return (
    formatParsedScheduleSummary(getParsedScheduleDetails(rrule), intl) ??
    fallbackMessage
  );
}

export function formatScheduleBadgeSummaryForRrule({
  rrule,
  intl,
  fallbackMessage,
}: {
  rrule: string | null;
  intl: IntlShape;
  fallbackMessage: string;
}): string | null {
  if (!rrule) {
    return null;
  }
  return (
    formatParsedScheduleBadgeSummary(getParsedScheduleDetails(rrule), intl) ??
    fallbackMessage
  );
}

function buildHourlyRruleString(intervalHours: number): string {
  const normalizedIntervalHours = normalizeIntervalHours(intervalHours) ?? 1;
  const options: Partial<Options> = {
    freq: RRule.HOURLY,
    interval: normalizedIntervalHours,
    byminute: 0,
    byweekday: ALL_WEEKDAYS.map((day): Weekday => RRULE_WEEKDAY_MAP[day]),
  };
  return new RRule(options).toString();
}

function buildMinutelyRruleString(intervalMinutes: number): string {
  const normalizedIntervalMinutes =
    normalizeIntervalMinutes(intervalMinutes) ?? 30;
  return new RRule({
    freq: RRule.MINUTELY,
    interval: normalizedIntervalMinutes,
  }).toString();
}

export function normalizeIntervalHours(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  if (rounded < 1) {
    return null;
  }
  return rounded;
}

export function normalizeIntervalMinutes(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  if (rounded < 1) {
    return null;
  }
  return rounded;
}

function getHeartbeatIntervalMinutes(
  scheduleDetails: ParsedScheduleDetails,
): number {
  if (scheduleDetails.freq === RRule.MINUTELY) {
    return normalizeIntervalMinutes(scheduleDetails.interval) ?? 30;
  }
  if (scheduleDetails.freq === RRule.HOURLY) {
    return (normalizeIntervalHours(scheduleDetails.interval) ?? 1) * 60;
  }
  if (scheduleDetails.freq === RRule.DAILY) {
    return (normalizeIntervalHours(scheduleDetails.interval) ?? 1) * 24 * 60;
  }
  if (scheduleDetails.freq === RRule.WEEKLY) {
    return (
      (normalizeIntervalHours(scheduleDetails.interval) ?? 1) * 24 * 7 * 60
    );
  }
  return 30;
}

function buildTimedWeeklyRruleString({
  time,
  weekdays,
}: {
  time: string;
  weekdays: Array<RruleWeekday>;
}): string {
  const timeParts = getTimeParts(time) ?? getTimeParts(DEFAULT_TIME);
  if (!timeParts) {
    return "";
  }
  const options: Partial<Options> = {
    freq: RRule.WEEKLY,
    byhour: timeParts.hour,
    byminute: timeParts.minute,
    byweekday: sortWeekdays(weekdays).map(
      (day): Weekday => RRULE_WEEKDAY_MAP[day],
    ),
  };
  return new RRule(options).toString();
}

function getParsedScheduleDetails(
  rruleText: string | null,
): ParsedScheduleDetails | null {
  if (!rruleText) {
    return null;
  }
  try {
    const timeZone = getLocalTimeZone();
    const ruleSet = rrulestr(rruleText, {
      forceset: true,
      tzid: timeZone ?? undefined,
    }) as RRuleSet;
    const primaryRule = ruleSet.rrules()[0];
    if (!primaryRule) {
      return null;
    }
    const options = primaryRule.options;
    const weekdays =
      getWeekdaysFromOptions(options.byweekday) ??
      parseByDayFromRruleText(rruleText) ??
      ALL_WEEKDAYS;
    const minute = getNumberFromOption(options.byminute);
    return {
      freq: options.freq,
      interval: Math.max(1, Math.round(options.interval ?? 1)),
      minute,
      rruleText,
      time: getTimeInputFromOptions(options.byhour, options.byminute, options),
      weekdays,
    };
  } catch {
    return null;
  }
}

function getScheduleModeFromParsedDetails(
  scheduleDetails: ParsedScheduleDetails,
): ScheduleMode {
  if (
    scheduleDetails.freq === RRule.HOURLY &&
    scheduleDetails.interval === 1 &&
    scheduleDetails.minute === 0 &&
    isExactWeekdaySet(scheduleDetails.weekdays, ALL_WEEKDAYS)
  ) {
    return "hourly";
  }
  if (
    scheduleDetails.interval === 1 &&
    (scheduleDetails.freq === RRule.DAILY ||
      scheduleDetails.freq === RRule.WEEKLY)
  ) {
    if (isExactWeekdaySet(scheduleDetails.weekdays, ALL_WEEKDAYS)) {
      return "daily";
    }
    if (isExactWeekdaySet(scheduleDetails.weekdays, WEEKDAYS_ONLY)) {
      return "weekdays";
    }
    if (scheduleDetails.weekdays.length === 1) {
      return "weekly";
    }
  }
  return "custom";
}

function formatParsedScheduleSummary(
  scheduleDetails: ParsedScheduleDetails | null,
  intl: IntlShape,
): string | null {
  if (!scheduleDetails) {
    return null;
  }
  const weekdays = listWeekdays(scheduleDetails.weekdays);
  const isEveryDay = weekdays.length === WEEKDAY_ORDER.length;
  if (scheduleDetails.freq === RRule.MINUTELY) {
    return formatMinuteScheduleSummary({
      intervalMinutes: scheduleDetails.interval,
      intl,
      isEveryDay,
      weekdays,
    });
  }
  if (scheduleDetails.freq === RRule.HOURLY) {
    return formatHourlyScheduleSummary({
      intervalHours: scheduleDetails.interval,
      intl,
      isEveryDay,
      weekdays,
    });
  }
  if (
    scheduleDetails.freq !== RRule.DAILY &&
    scheduleDetails.freq !== RRule.WEEKLY
  ) {
    return null;
  }
  const timeLabel = formatScheduleTimeLabel(scheduleDetails.time, intl);
  if (!timeLabel) {
    return null;
  }
  return formatTimedScheduleSummary({
    intl,
    isEveryDay,
    timeLabel,
    weekdays,
  });
}

function formatParsedScheduleBadgeSummary(
  scheduleDetails: ParsedScheduleDetails | null,
  intl: IntlShape,
): string | null {
  if (!scheduleDetails) {
    return null;
  }
  const weekdays = listWeekdays(scheduleDetails.weekdays);
  const isEveryDay = weekdays.length === WEEKDAY_ORDER.length;
  if (scheduleDetails.freq === RRule.MINUTELY) {
    const intervalLabel = formatMinuteScheduleBadgeLabel({
      intervalMinutes: scheduleDetails.interval,
      intl,
    });
    if (isEveryDay) {
      return intervalLabel;
    }
    return joinBadgeParts([
      intervalLabel,
      formatBadgeDayCountLabel(weekdays.length, intl),
    ]);
  }
  if (scheduleDetails.freq === RRule.HOURLY) {
    const intervalLabel = intl.formatMessage(
      {
        id: "settings.automations.scheduleBadge.interval",
        defaultMessage: "{count}h",
        description:
          "Compact interval label for automation schedule badges (e.g., 6h)",
      },
      { count: scheduleDetails.interval },
    );
    if (isEveryDay) {
      return intervalLabel;
    }
    return joinBadgeParts([
      intervalLabel,
      formatBadgeDayCountLabel(weekdays.length, intl),
    ]);
  }
  if (
    scheduleDetails.freq !== RRule.DAILY &&
    scheduleDetails.freq !== RRule.WEEKLY
  ) {
    return null;
  }
  const timeLabel = formatScheduleTimeLabelCompact(scheduleDetails.time, intl);
  if (!timeLabel) {
    return null;
  }
  return formatTimedScheduleBadgeSummary({
    intl,
    isEveryDay,
    timeLabel,
    weekdays,
  });
}

function formatHourlyScheduleSummary({
  intervalHours,
  intl,
  isEveryDay,
  weekdays,
}: {
  intervalHours: number;
  intl: IntlShape;
  isEveryDay: boolean;
  weekdays: Array<RruleWeekday>;
}): string {
  const intervalLabel =
    intervalHours === 1
      ? intl.formatMessage({
          id: "settings.automations.scheduleSummary.intervalHourly",
          defaultMessage: "Hourly",
          description: "Automation schedule summary for hourly interval",
        })
      : intl.formatMessage(
          {
            id: "settings.automations.scheduleSummary.interval",
            defaultMessage: "Every {count}h",
            description: "Automation schedule summary for hourly interval",
          },
          { count: intervalHours },
        );
  if (isEveryDay) {
    return intervalLabel;
  }
  const daysCountLabel = intl.formatMessage(
    {
      id: "settings.automations.scheduleSummary.intervalDayCount",
      defaultMessage: "{count, plural, one {# day} other {# days}}",
      description:
        "Day count label for interval schedules with selected weekdays",
    },
    { count: weekdays.length },
  );
  return intl.formatMessage(
    {
      id: "settings.automations.scheduleSummary.intervalDays",
      defaultMessage: "{interval} on {days}",
      description:
        "Automation schedule summary for interval schedule with weekday selection",
    },
    { interval: intervalLabel, days: daysCountLabel },
  );
}

function formatMinuteScheduleSummary({
  intervalMinutes,
  intl,
  isEveryDay,
  weekdays,
}: {
  intervalMinutes: number;
  intl: IntlShape;
  isEveryDay: boolean;
  weekdays: Array<RruleWeekday>;
}): string {
  const intervalLabel = formatMinuteScheduleLabel({ intervalMinutes, intl });
  if (isEveryDay) {
    return intervalLabel;
  }
  const daysCountLabel = intl.formatMessage(
    {
      id: "settings.automations.scheduleSummary.intervalDayCount",
      defaultMessage: "{count, plural, one {# day} other {# days}}",
      description:
        "Day count label for interval schedules with selected weekdays",
    },
    { count: weekdays.length },
  );
  return intl.formatMessage(
    {
      id: "settings.automations.scheduleSummary.intervalDays",
      defaultMessage: "{interval} on {days}",
      description:
        "Automation schedule summary for interval schedule with weekday selection",
    },
    { interval: intervalLabel, days: daysCountLabel },
  );
}

function formatMinuteScheduleLabel({
  intervalMinutes,
  intl,
}: {
  intervalMinutes: number;
  intl: IntlShape;
}): string {
  if (intervalMinutes === 1) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.intervalMinute",
      defaultMessage: "Every minute",
      description: "Automation schedule summary for one-minute interval",
    });
  }
  if (intervalMinutes === 60) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.intervalHourly",
      defaultMessage: "Hourly",
      description: "Automation schedule summary for hourly interval",
    });
  }
  if (intervalMinutes === 1_440) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.intervalDaily",
      defaultMessage: "Daily",
      description: "Automation schedule summary for daily interval",
    });
  }
  if (intervalMinutes === 10_080) {
    return intl.formatMessage({
      id: "settings.automations.scheduleSummary.intervalWeekly",
      defaultMessage: "Weekly",
      description: "Automation schedule summary for weekly interval",
    });
  }
  return intl.formatMessage(
    {
      id: "settings.automations.scheduleSummary.intervalMinutes",
      defaultMessage: "Every {count}m",
      description: "Automation schedule summary for minute interval",
    },
    { count: intervalMinutes },
  );
}

function formatMinuteScheduleBadgeLabel({
  intervalMinutes,
  intl,
}: {
  intervalMinutes: number;
  intl: IntlShape;
}): string {
  if (intervalMinutes === 60) {
    return intl.formatMessage({
      id: "settings.automations.scheduleBadge.hourly",
      defaultMessage: "Hourly",
      description: "Compact label for hourly minute-based heartbeat intervals",
    });
  }
  if (intervalMinutes === 1_440) {
    return intl.formatMessage({
      id: "settings.automations.scheduleBadge.daily",
      defaultMessage: "Daily",
      description: "Compact label for daily minute-based heartbeat intervals",
    });
  }
  if (intervalMinutes === 10_080) {
    return intl.formatMessage({
      id: "settings.automations.scheduleBadge.weekly",
      defaultMessage: "Weekly",
      description: "Compact label for weekly minute-based heartbeat intervals",
    });
  }
  return intl.formatMessage(
    {
      id: "settings.automations.scheduleBadge.minutes",
      defaultMessage: "{count}m",
      description:
        "Compact interval label for minute-based automation schedule badges",
    },
    { count: intervalMinutes },
  );
}

function formatTimedScheduleSummary({
  intl,
  isEveryDay,
  timeLabel,
  weekdays,
}: {
  intl: IntlShape;
  isEveryDay: boolean;
  timeLabel: string;
  weekdays: Array<RruleWeekday>;
}): string | null {
  const isWeekdaysOnly = isExactWeekdaySet(weekdays, WEEKDAYS_ONLY);
  const isWeekendsOnly = isExactWeekdaySet(weekdays, WEEKENDS_ONLY);
  if (isEveryDay) {
    return intl.formatMessage(
      {
        id: "settings.automations.scheduleSummary.daily",
        defaultMessage: "Daily at {time}",
        description: "Automation schedule summary for daily schedule every day",
      },
      { time: timeLabel },
    );
  }
  if (isWeekdaysOnly) {
    return intl.formatMessage(
      {
        id: "settings.automations.scheduleSummary.weekdays",
        defaultMessage: "Weekdays at {time}",
        description:
          "Automation schedule summary for daily schedule on weekdays",
      },
      { time: timeLabel },
    );
  }
  if (isWeekendsOnly) {
    return intl.formatMessage(
      {
        id: "settings.automations.scheduleSummary.weekends",
        defaultMessage: "Weekends at {time}",
        description:
          "Automation schedule summary for daily schedule on weekends",
      },
      { time: timeLabel },
    );
  }
  const weekdaysLabel = formatWeekdaysSummary(
    weekdays,
    intl,
    isWeekdaysOnly,
    isWeekendsOnly,
    "long",
  );
  if (!weekdaysLabel) {
    return null;
  }
  return intl.formatMessage(
    {
      id: "settings.automations.scheduleSummary.weekly",
      defaultMessage: "{days} at {time}",
      description: "Automation schedule summary for weekly schedule",
    },
    { days: weekdaysLabel, time: timeLabel },
  );
}

function formatScheduleTimeLabelCompact(
  time: string,
  intl: IntlShape,
): string | null {
  const timeParts = getTimeParts(time);
  if (!timeParts) {
    return null;
  }
  return intl.formatTime(
    new Date(2024, 0, 1, timeParts.hour, timeParts.minute),
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
}

function formatBadgeDayCountLabel(count: number, intl: IntlShape): string {
  return intl.formatMessage(
    {
      id: "settings.automations.scheduleBadge.dayCount",
      defaultMessage: "{count}d",
      description:
        "Compact day count label for automation schedule badges (e.g., 4d)",
    },
    { count },
  );
}

function joinBadgeParts(parts: Array<string>): string {
  return parts.join(BADGE_SEPARATOR);
}

function formatTimedScheduleBadgeSummary({
  intl,
  isEveryDay,
  timeLabel,
  weekdays,
}: {
  intl: IntlShape;
  isEveryDay: boolean;
  timeLabel: string;
  weekdays: Array<RruleWeekday>;
}): string | null {
  const isWeekdaysOnly = isExactWeekdaySet(weekdays, WEEKDAYS_ONLY);
  const isWeekendsOnly = isExactWeekdaySet(weekdays, WEEKENDS_ONLY);
  if (isEveryDay) {
    return intl.formatMessage(
      {
        id: "settings.automations.scheduleSummary.daily",
        defaultMessage: "Daily at {time}",
        description: "Automation schedule summary for daily schedule every day",
      },
      { time: timeLabel },
    );
  }
  if (isWeekdaysOnly) {
    return joinBadgeParts([
      intl.formatMessage({
        id: "settings.automations.scheduleBadge.weekdays",
        defaultMessage: "Weekdays",
        description: "Compact weekdays label for automation schedule badges",
      }),
      timeLabel,
    ]);
  }
  if (isWeekendsOnly) {
    return joinBadgeParts([
      intl.formatMessage({
        id: "settings.automations.scheduleBadge.weekends",
        defaultMessage: "Weekends",
        description: "Compact weekends label for automation schedule badges",
      }),
      timeLabel,
    ]);
  }
  const daysLabel =
    weekdays.length > 2
      ? formatBadgeDayCountLabel(weekdays.length, intl)
      : formatWeekdaysSummary(
          weekdays,
          intl,
          isWeekdaysOnly,
          isWeekendsOnly,
          "short",
        );
  if (!daysLabel) {
    return null;
  }
  return joinBadgeParts([daysLabel, timeLabel]);
}

function getTimeInputFromOptions(
  byhour: Options["byhour"],
  byminute: Options["byminute"],
  options: Options,
): string {
  const hour = getNumberFromOption(byhour);
  const minute = getNumberFromOption(byminute);
  if (hour != null && minute != null) {
    return formatTimeInput(hour, minute);
  }
  if (options.dtstart) {
    return formatTimeInput(
      options.dtstart.getHours(),
      options.dtstart.getMinutes(),
    );
  }
  return DEFAULT_TIME;
}

function getNumberFromOption(value: Options["byhour"]): number | null {
  if (Array.isArray(value)) {
    return typeof value[0] === "number" ? value[0] : null;
  }
  return typeof value === "number" ? value : null;
}

function getWeekdaysFromOptions(
  value: Options["byweekday"],
): Array<RruleWeekday> | null {
  if (!value) {
    return null;
  }
  const indexToLabel = new Map<number, RruleWeekday>(
    WEEKDAY_ORDER.map((day): [number, RruleWeekday] => [
      RRULE_WEEKDAY_MAP[day].weekday,
      day,
    ]),
  );
  const weekdays = Array.isArray(value) ? value : [value];
  const normalized = weekdays
    .map((weekday): RruleWeekday | null => {
      if (typeof weekday === "string") {
        const key = weekday.toUpperCase() as RruleWeekday;
        return WEEKDAY_ORDER.includes(key) ? key : null;
      }
      if (typeof weekday === "number") {
        return indexToLabel.get(weekday) ?? null;
      }
      if (typeof weekday === "object" && weekday != null) {
        if (typeof weekday.weekday === "number") {
          return indexToLabel.get(weekday.weekday) ?? null;
        }
      }
      return null;
    })
    .filter((day): day is RruleWeekday => day != null);
  if (normalized.length === 0) {
    return null;
  }
  return sortWeekdays(normalized);
}

function parseByDayFromRruleText(
  rruleText: string,
): Array<RruleWeekday> | null {
  const parts = rruleText.split(";");
  const byDayPart = parts.find((part) => part.startsWith("BYDAY="));
  if (!byDayPart) {
    return null;
  }
  const values = byDayPart.replace("BYDAY=", "").split(",");
  const normalized = values
    .map((value): RruleWeekday | null => {
      const key = value.trim().toUpperCase() as RruleWeekday;
      return WEEKDAY_ORDER.includes(key) ? key : null;
    })
    .filter((day): day is RruleWeekday => day != null);
  if (normalized.length === 0) {
    return null;
  }
  return sortWeekdays(normalized);
}

function getWeeklyScheduleDay(weekdays: Array<RruleWeekday>): RruleWeekday {
  return listWeekdays(weekdays)[0] ?? DEFAULT_WEEKLY_DAY;
}

function getTimeParts(value: string): { hour: number; minute: number } | null {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return { hour, minute };
}

function canParseRrule(rruleText: string): boolean {
  if (!rruleText) {
    return false;
  }
  return getParsedScheduleDetails(rruleText) != null;
}

function formatTimeInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getLocalTimeZone(): string | null {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return typeof zone === "string" && zone.trim().length > 0 ? zone : null;
}
