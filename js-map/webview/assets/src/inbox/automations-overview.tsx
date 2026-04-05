import type { Automation } from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import {
  SectionedPageLayout,
  SectionedPageSection,
} from "@/components/sectioned-page";
import { AutomationEmptyStateTitle } from "@/inbox/automation-empty-state-prompts";
import { SidebarListItem } from "@/sidebar/sidebar-list-item";

import { AutomationRow } from "./automation-row";
import type { AutomationRowSummary } from "./automation-row-summary";

export function AutomationsOverview({
  automations,
  automationRowSummaries,
  selectedAutomationId,
  onSelectAutomation,
  onPauseAutomation,
  onResumeAutomation,
  onDeleteAutomation,
}: {
  automations: Array<Automation>;
  automationRowSummaries: Map<Automation["id"], AutomationRowSummary>;
  selectedAutomationId: Automation["id"] | null;
  onSelectAutomation: (automation: Automation) => void;
  onPauseAutomation: (automation: Automation) => void;
  onResumeAutomation: (automation: Automation) => void;
  onDeleteAutomation: (automation: Automation) => void;
}): ReactElement {
  const intl = useIntl();
  const currentAutomations = automations.filter(
    (automation): boolean => automation.status !== "PAUSED",
  );
  const pausedAutomations = automations.filter(
    (automation): boolean => automation.status === "PAUSED",
  );
  const sections = [
    currentAutomations.length > 0
      ? {
          id: "automations-current",
          title: intl.formatMessage({
            id: "inbox.automations.current",
            defaultMessage: "Current",
            description: "Heading shown above the current automations list",
          }),
        }
      : null,
    pausedAutomations.length > 0
      ? {
          id: "automations-paused",
          title: intl.formatMessage({
            id: "inbox.automations.pausedSection",
            defaultMessage: "Paused",
            description: "Heading shown above paused automations",
          }),
        }
      : null,
  ].flatMap((section) => (section == null ? [] : [section]));

  return (
    <SectionedPageLayout
      ariaLabel={intl.formatMessage({
        id: "inbox.automations.sectionsNav",
        defaultMessage: "Automation sections",
        description:
          "Accessible label for the automation overview sections on the automations page",
      })}
      className="[--sectioned-page-leading-inset:0.75rem]"
      contentInnerClassName="flex flex-col gap-8 px-panel pb-panel"
      header={<AutomationEmptyStateTitle />}
      sections={sections}
      showNav={false}
    >
      {currentAutomations.length > 0 ? (
        <SectionedPageSection
          id="automations-current"
          title={
            <FormattedMessage
              id="inbox.automations.current"
              defaultMessage="Current"
              description="Heading shown above the current automations list"
            />
          }
        >
          <div className="flex flex-col gap-1" role="list">
            {currentAutomations.map((automation) => {
              const summary = automationRowSummaries.get(automation.id);
              return (
                <SidebarListItem key={automation.id}>
                  <AutomationRow
                    automation={automation}
                    displayName={automation.name}
                    workspaceLabel={summary?.workspaceLabel ?? null}
                    scheduleLabel={summary?.scheduleLabel ?? ""}
                    isInProgress={false}
                    isPaused={false}
                    isSelected={selectedAutomationId === automation.id}
                    onSelect={onSelectAutomation}
                    onPauseAutomation={onPauseAutomation}
                    onDeleteAutomation={onDeleteAutomation}
                  />
                </SidebarListItem>
              );
            })}
          </div>
        </SectionedPageSection>
      ) : null}
      {pausedAutomations.length > 0 ? (
        <SectionedPageSection
          id="automations-paused"
          title={
            <FormattedMessage
              id="inbox.automations.pausedSection"
              defaultMessage="Paused"
              description="Heading shown above paused automations"
            />
          }
        >
          <div className="flex flex-col gap-1" role="list">
            {pausedAutomations.map((automation) => {
              const summary = automationRowSummaries.get(automation.id);
              return (
                <SidebarListItem key={automation.id}>
                  <AutomationRow
                    automation={automation}
                    displayName={automation.name}
                    workspaceLabel={summary?.workspaceLabel ?? null}
                    scheduleLabel={summary?.scheduleLabel ?? ""}
                    isInProgress={false}
                    isPaused
                    isSelected={selectedAutomationId === automation.id}
                    onSelect={onSelectAutomation}
                    onResumeAutomation={onResumeAutomation}
                    onDeleteAutomation={onDeleteAutomation}
                  />
                </SidebarListItem>
              );
            })}
          </div>
        </SectionedPageSection>
      ) : null}
    </SectionedPageLayout>
  );
}
