import {
  formatWorkspaceRootLabel,
  isHeartbeatAutomation,
  type Automation,
} from "protocol";
import type { IntlShape } from "react-intl";

import { formatScheduleSummaryForRrule } from "@/automations/automation-schedule";

export type AutomationRowSummary = {
  workspaceLabel: string | null;
  scheduleLabel: string;
};

export function getAutomationRowSummary({
  automation,
  intl,
  formatRootLabel,
  threadLabelById,
}: {
  automation: Automation;
  intl: IntlShape;
  formatRootLabel?: (root: string) => string;
  threadLabelById?: Map<string, string>;
}): AutomationRowSummary {
  const scheduleFallback = intl.formatMessage({
    id: "settings.automations.rruleSummaryFallback",
    defaultMessage: "Custom schedule",
    description: "Fallback label when RRULE summary cannot be generated",
  });
  const scheduleLabel =
    formatScheduleSummaryForRrule({
      rrule: automation.rrule,
      intl,
      fallbackMessage: scheduleFallback,
    }) ?? scheduleFallback;
  const workspaceLabel = isHeartbeatAutomation(automation)
    ? ((): string => {
        const threadLabel =
          threadLabelById?.get(automation.targetThreadId) ??
          automation.targetThreadId;
        return intl.formatMessage(
          {
            id: "inbox.automations.rowSummary.heartbeat",
            defaultMessage: "Heartbeat • {thread}",
            description:
              "Summary label for heartbeat automations in the automation list",
          },
          { thread: threadLabel },
        );
      })()
    : ((): string | null => {
        const workspaceLabels = automation.cwds.map((root) =>
          formatRootLabel
            ? formatRootLabel(root)
            : formatWorkspaceRootLabel({ root, labels: {} }),
        );
        return workspaceLabels.length > 0
          ? intl.formatList(workspaceLabels, { type: "conjunction" })
          : null;
      })();
  return { workspaceLabel, scheduleLabel };
}

export function buildAutomationRowSummaries({
  automations,
  intl,
  formatRootLabel,
  threadLabelById,
}: {
  automations: Array<Automation>;
  intl: IntlShape;
  formatRootLabel?: (root: string) => string;
  threadLabelById?: Map<string, string>;
}): Map<Automation["id"], AutomationRowSummary> {
  const summaries = new Map<Automation["id"], AutomationRowSummary>();
  for (const automation of automations) {
    summaries.set(
      automation.id,
      getAutomationRowSummary({
        automation,
        intl,
        formatRootLabel,
        threadLabelById,
      }),
    );
  }
  return summaries;
}
