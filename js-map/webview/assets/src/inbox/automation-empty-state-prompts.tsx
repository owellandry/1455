import clsx from "clsx";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl, type MessageDescriptor } from "react-intl";

import type { ScheduleConfig } from "@/automations/automation-schedule";
import type { AutomationTemplateSelection } from "@/automations/automation-shared";
import {
  SectionedPageLayout,
  SectionedPageSection,
} from "@/components/sectioned-page";
import { ColorIcon, ConversationStarterCard } from "@/home-use-cases";
import { getHomeAutomationUseCases } from "@/home-use-cases-data";

const WEEKDAYS_ALL: Array<ScheduleConfig["weekdays"][number]> = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
];
const WEEKDAYS_WEEKDAYS: Array<ScheduleConfig["weekdays"][number]> = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
];

function buildScheduleConfig({
  mode,
  weekdays,
  time,
  intervalHours = 24,
  intervalMinutes = null,
  customRrule = "",
}: {
  mode: ScheduleConfig["mode"];
  weekdays: Array<ScheduleConfig["weekdays"][number]>;
  time: string;
  intervalHours?: number;
  intervalMinutes?: number | null;
  customRrule?: string;
}): ScheduleConfig {
  return {
    mode,
    intervalHours,
    intervalMinutes,
    weekdays,
    time,
    customRrule,
  };
}

const DEFAULT_AUTOMATION_NAME_MESSAGE: MessageDescriptor = {
  id: "inbox.rightPanel.quickStart.home.defaultDraftName",
  defaultMessage: "Automation",
  description: "Fallback draft name for home automation templates",
};

const DEFAULT_AUTOMATION_SCHEDULE = buildScheduleConfig({
  mode: "daily",
  weekdays: WEEKDAYS_ALL,
  time: "09:00",
});

const HOME_AUTOMATION_NAME_MESSAGES = new Map<string, MessageDescriptor>([
  [
    "daily-bug-scan",
    {
      id: "inbox.rightPanel.quickStart.home.dailyBugScan.draftName",
      defaultMessage: "Daily bug scan",
      description: "Draft name for the daily bug scan automation template",
    },
  ],
  [
    "weekly-release-notes",
    {
      id: "inbox.rightPanel.quickStart.home.weeklyReleaseNotes.draftName",
      defaultMessage: "Weekly release notes",
      description:
        "Draft name for the weekly release notes automation template",
    },
  ],
  [
    "daily-standup",
    {
      id: "inbox.rightPanel.quickStart.home.dailyStandup.draftName",
      defaultMessage: "Standup summary",
      description: "Draft name for the daily standup automation template",
    },
  ],
  [
    "nightly-ci-report",
    {
      id: "inbox.rightPanel.quickStart.home.nightlyCiReport.draftName",
      defaultMessage: "Nightly CI report",
      description: "Draft name for the nightly CI automation template",
    },
  ],
  [
    "daily-classic-game",
    {
      id: "inbox.rightPanel.quickStart.home.dailyClassicGame.draftName",
      defaultMessage: "Daily classic game",
      description: "Draft name for the daily classic game automation template",
    },
  ],
  [
    "skill-progression-map",
    {
      id: "inbox.rightPanel.quickStart.home.skillProgressionMap.draftName",
      defaultMessage: "Skill progression map",
      description:
        "Draft name for the skill progression map automation template",
    },
  ],
  [
    "weekly-engineering-summary",
    {
      id: "inbox.rightPanel.quickStart.home.weeklyEngineeringSummary.draftName",
      defaultMessage: "Weekly engineering summary",
      description:
        "Draft name for the weekly engineering summary automation template",
    },
  ],
  [
    "performance-regression-watch",
    {
      id: "inbox.rightPanel.quickStart.home.performanceRegressionWatch.draftName",
      defaultMessage: "Performance regression watch",
      description:
        "Draft name for the performance regression watch automation template",
    },
  ],
  [
    "dependency-sdk-drift",
    {
      id: "inbox.rightPanel.quickStart.home.dependencySdkDrift.draftName",
      defaultMessage: "Dependency and SDK drift",
      description:
        "Draft name for the dependency and SDK drift automation template",
    },
  ],
  [
    "test-gap-detection",
    {
      id: "inbox.rightPanel.quickStart.home.testGapDetection.draftName",
      defaultMessage: "Test gap detection",
      description: "Draft name for the test gap detection automation template",
    },
  ],
  [
    "pre-release-check",
    {
      id: "inbox.rightPanel.quickStart.home.preReleaseCheck.draftName",
      defaultMessage: "Pre-release check",
      description: "Draft name for the pre-release check automation template",
    },
  ],
  [
    "agents-docs-sync",
    {
      id: "inbox.rightPanel.quickStart.home.agentsDocsSync.draftName",
      defaultMessage: "Update AGENTS.md",
      description: "Draft name for the AGENTS.md sync automation template",
    },
  ],
  [
    "weekly-pr-summary",
    {
      id: "inbox.rightPanel.quickStart.home.weeklyPrSummary.draftName",
      defaultMessage: "Weekly PR summary",
      description: "Draft name for the weekly PR summary automation template",
    },
  ],
  [
    "issue-triage",
    {
      id: "inbox.rightPanel.quickStart.home.issueTriage.draftName",
      defaultMessage: "Issue triage",
      description: "Draft name for the issue triage automation template",
    },
  ],
  [
    "ci-monitor",
    {
      id: "inbox.rightPanel.quickStart.home.ciMonitor.draftName",
      defaultMessage: "CI monitor",
      description: "Draft name for the CI monitor automation template",
    },
  ],
  [
    "dependency-sweep",
    {
      id: "inbox.rightPanel.quickStart.home.dependencySweep.draftName",
      defaultMessage: "Dependency sweep",
      description: "Draft name for the dependency sweep automation template",
    },
  ],
  [
    "performance-audit",
    {
      id: "inbox.rightPanel.quickStart.home.performanceAudit.draftName",
      defaultMessage: "Performance audit",
      description: "Draft name for the performance audit automation template",
    },
  ],
  [
    "changelog-update",
    {
      id: "inbox.rightPanel.quickStart.home.changelogUpdate.draftName",
      defaultMessage: "Update changelog",
      description: "Draft name for the changelog update automation template",
    },
  ],
]);

const HOME_AUTOMATION_SCHEDULES = new Map<string, ScheduleConfig>([
  [
    "daily-bug-scan",
    buildScheduleConfig({
      mode: "daily",
      weekdays: WEEKDAYS_ALL,
      time: "09:00",
    }),
  ],
  [
    "weekly-release-notes",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["FR"],
      time: "09:00",
    }),
  ],
  [
    "daily-standup",
    buildScheduleConfig({
      mode: "weekdays",
      weekdays: WEEKDAYS_WEEKDAYS,
      time: "09:00",
    }),
  ],
  [
    "nightly-ci-report",
    buildScheduleConfig({
      mode: "daily",
      weekdays: WEEKDAYS_ALL,
      time: "21:00",
    }),
  ],
  [
    "daily-classic-game",
    buildScheduleConfig({
      mode: "daily",
      weekdays: WEEKDAYS_ALL,
      time: "14:00",
    }),
  ],
  [
    "skill-progression-map",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["FR"],
      time: "10:00",
    }),
  ],
  [
    "weekly-engineering-summary",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["FR"],
      time: "16:00",
    }),
  ],
  [
    "performance-regression-watch",
    buildScheduleConfig({
      mode: "daily",
      weekdays: WEEKDAYS_ALL,
      time: "09:00",
    }),
  ],
  [
    "dependency-sdk-drift",
    buildScheduleConfig({
      mode: "daily",
      weekdays: WEEKDAYS_ALL,
      time: "11:00",
    }),
  ],
  [
    "test-gap-detection",
    buildScheduleConfig({
      mode: "daily",
      weekdays: WEEKDAYS_ALL,
      time: "15:00",
    }),
  ],
  [
    "pre-release-check",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["TH"],
      time: "13:00",
    }),
  ],
  [
    "agents-docs-sync",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["FR"],
      time: "11:00",
    }),
  ],
  [
    "weekly-pr-summary",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["MO"],
      time: "09:00",
    }),
  ],
  [
    "issue-triage",
    buildScheduleConfig({
      mode: "weekdays",
      weekdays: WEEKDAYS_WEEKDAYS,
      time: "09:30",
    }),
  ],
  [
    "ci-monitor",
    buildScheduleConfig({
      mode: "custom",
      intervalHours: 2,
      weekdays: WEEKDAYS_WEEKDAYS,
      time: "09:00",
      customRrule:
        "RRULE:FREQ=HOURLY;INTERVAL=2;BYMINUTE=0;BYDAY=MO,TU,WE,TH,FR",
    }),
  ],
  [
    "dependency-sweep",
    buildScheduleConfig({
      mode: "custom",
      intervalHours: 720,
      weekdays: WEEKDAYS_ALL,
      time: "09:00",
      customRrule:
        "RRULE:FREQ=HOURLY;INTERVAL=720;BYMINUTE=0;BYDAY=MO,TU,WE,TH,FR,SA,SU",
    }),
  ],
  [
    "performance-audit",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["MO"],
      time: "14:00",
    }),
  ],
  [
    "changelog-update",
    buildScheduleConfig({
      mode: "weekly",
      weekdays: ["FR"],
      time: "16:00",
    }),
  ],
]);

const HOME_AUTOMATION_USE_CASES = getHomeAutomationUseCases();

type AutomationEmptyStateCard = {
  id: string;
  iconName: string;
  nameMessage: MessageDescriptor;
  promptMessage: MessageDescriptor;
  scheduleConfig: ScheduleConfig;
};

const AUTOMATION_EMPTY_STATE_CARDS: Array<AutomationEmptyStateCard> =
  HOME_AUTOMATION_USE_CASES.map((useCase) => {
    const nameMessage =
      HOME_AUTOMATION_NAME_MESSAGES.get(useCase.id) ??
      DEFAULT_AUTOMATION_NAME_MESSAGE;
    const promptMessage =
      useCase.automationPromptMessage ?? useCase.promptMessage;
    const scheduleConfig =
      HOME_AUTOMATION_SCHEDULES.get(useCase.id) ?? DEFAULT_AUTOMATION_SCHEDULE;
    return {
      id: useCase.id,
      iconName: useCase.iconName,
      nameMessage,
      promptMessage,
      scheduleConfig,
    };
  });

const AUTOMATION_EMPTY_STATE_CARD_BY_ID = new Map(
  AUTOMATION_EMPTY_STATE_CARDS.map(
    (card): [string, AutomationEmptyStateCard] => {
      return [card.id, card];
    },
  ),
);

const AUTOMATION_EMPTY_STATE_SECTIONS: Array<{
  id: string;
  titleMessage: MessageDescriptor;
  cardIds: Array<string>;
}> = [
  {
    id: "automation-templates-status-reports",
    titleMessage: {
      id: "inbox.rightPanel.quickStart.section.statusReports",
      defaultMessage: "Status reports",
      description: "Section title for status report automation templates",
    },
    cardIds: [
      "daily-standup",
      "weekly-engineering-summary",
      "weekly-pr-summary",
    ],
  },
  {
    id: "automation-templates-release-prep",
    titleMessage: {
      id: "inbox.rightPanel.quickStart.section.releasePrep",
      defaultMessage: "Release prep",
      description: "Section title for release preparation automation templates",
    },
    cardIds: ["weekly-release-notes", "pre-release-check", "changelog-update"],
  },
  {
    id: "automation-templates-incidents-triage",
    titleMessage: {
      id: "inbox.rightPanel.quickStart.section.incidentsAndTriage",
      defaultMessage: "Incidents & triage",
      description: "Section title for incident and triage automation templates",
    },
    cardIds: ["nightly-ci-report", "ci-monitor", "issue-triage"],
  },
  {
    id: "automation-templates-code-quality",
    titleMessage: {
      id: "inbox.rightPanel.quickStart.section.codeQuality",
      defaultMessage: "Code quality",
      description: "Section title for code quality automation templates",
    },
    cardIds: [
      "daily-bug-scan",
      "test-gap-detection",
      "performance-regression-watch",
    ],
  },
  {
    id: "automation-templates-repo-maintenance",
    titleMessage: {
      id: "inbox.rightPanel.quickStart.section.repoMaintenance",
      defaultMessage: "Repo maintenance",
      description:
        "Section title for repository maintenance automation templates",
    },
    cardIds: ["dependency-sdk-drift", "dependency-sweep", "agents-docs-sync"],
  },
  {
    id: "automation-templates-growth-exploration",
    titleMessage: {
      id: "inbox.rightPanel.quickStart.section.growthAndExploration",
      defaultMessage: "Growth & exploration",
      description:
        "Section title for growth and exploratory automation templates",
    },
    cardIds: ["skill-progression-map", "performance-audit"],
  },
];

function getAutomationEmptyStateCards(
  cardIds: Array<string>,
): Array<AutomationEmptyStateCard> {
  return cardIds.flatMap((cardId): Array<AutomationEmptyStateCard> => {
    const card = AUTOMATION_EMPTY_STATE_CARD_BY_ID.get(cardId);
    return card == null ? [] : [card];
  });
}

export function AutomationEmptyStatePrompts({
  onSelectAction,
}: {
  onSelectAction: (draft: AutomationTemplateSelection) => void;
}): ReactElement {
  return (
    <SectionedPageLayout
      ariaLabel="Automation sections"
      className="mt-2 [--sectioned-page-leading-inset:0.75rem]"
      contentInnerClassName="flex flex-col gap-9 pb-2"
      sections={AUTOMATION_EMPTY_STATE_SECTIONS.map((section) => ({
        id: section.id,
        title: <FormattedMessage {...section.titleMessage} />,
      }))}
    >
      {AUTOMATION_EMPTY_STATE_SECTIONS.map((section) => (
        <SectionedPageSection
          key={section.id}
          id={section.id}
          title={<FormattedMessage {...section.titleMessage} />}
        >
          <AutomationTemplateGrid
            cards={getAutomationEmptyStateCards(section.cardIds)}
            onSelectAction={onSelectAction}
          />
        </SectionedPageSection>
      ))}
    </SectionedPageLayout>
  );
}

export function AutomationTemplateGrid({
  onSelectAction,
  cards = AUTOMATION_EMPTY_STATE_CARDS,
  columns = "responsive",
}: {
  onSelectAction: (draft: AutomationTemplateSelection) => void;
  cards?: Array<AutomationEmptyStateCard>;
  columns?: "responsive" | "two";
}): ReactElement {
  const intl = useIntl();

  return (
    <div
      className={
        columns === "two"
          ? "grid w-full grid-cols-2 gap-4"
          : "grid w-full gap-4 md:grid-cols-2"
      }
    >
      {cards.map((card) => (
        <ConversationStarterCard
          key={card.id}
          className="w-full"
          icon={<ColorIcon name={card.iconName} />}
          mode="local"
          onSelect={(prompt) => {
            onSelectAction({
              name: intl.formatMessage(card.nameMessage),
              prompt,
              scheduleConfig: card.scheduleConfig,
            });
          }}
          prompt={intl.formatMessage(card.promptMessage)}
        />
      ))}
    </div>
  );
}

export function AutomationEmptyStateTitle({
  className,
}: {
  className?: string;
}): ReactElement {
  return (
    <div
      className={clsx(
        "heading-xl font-normal text-token-foreground",
        className,
      )}
    >
      <FormattedMessage
        id="inbox.mode.automations"
        defaultMessage="Automations"
        description="Header label for the automations inbox view"
      />
    </div>
  );
}
