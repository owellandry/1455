import clsx from "clsx";
import { motion } from "framer-motion";
import type { ConversationId } from "protocol";
import type React from "react";
import { useState } from "react";
import { useIntl } from "react-intl";

import { Tooltip } from "@/components/tooltip";
import { TaskDiffStats } from "@/diff-stats";
import AgentIcon from "@/icons/agent.svg";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import { getAgentMentionColorCssValueForSessionId } from "@/local-conversation/items/multi-agent-mentions";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { formatModelDisplayName } from "@/utils/format-model-display-name";

import type { BackgroundSubagentDisplayRow } from "./background-subagents";

export function BackgroundSubagentsPanel({
  onOpenThread,
  rows,
  showRoundedTop,
}: {
  onOpenThread: (conversationId: ConversationId) => void;
  rows: Array<BackgroundSubagentDisplayRow>;
  showRoundedTop: boolean;
}): React.ReactElement | null {
  if (rows.length === 0) {
    return null;
  }

  return (
    <BackgroundSubagentsPanelContent
      onOpenThread={onOpenThread}
      rows={rows}
      showRoundedTop={showRoundedTop}
    />
  );
}

function BackgroundSubagentsPanelContent({
  onOpenThread,
  rows,
  showRoundedTop,
}: {
  onOpenThread: (conversationId: ConversationId) => void;
  rows: Array<BackgroundSubagentDisplayRow>;
  showRoundedTop: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const totalDiffStats = rows.reduce(
    (acc, row) => ({
      linesAdded: acc.linesAdded + (row.diffStats?.linesAdded ?? 0),
      linesRemoved: acc.linesRemoved + (row.diffStats?.linesRemoved ?? 0),
    }),
    { linesAdded: 0, linesRemoved: 0 },
  );
  const hasTotalDiffStats =
    totalDiffStats.linesAdded !== 0 || totalDiffStats.linesRemoved !== 0;
  const summaryLabel = intl.formatMessage(
    {
      id: "composer.backgroundSubagents.summary",
      defaultMessage:
        "{count, plural, one {# background agent} other {# background agents}}",
      description: "Summary label for the background subagents panel header.",
    },
    {
      count: rows.length,
    },
  );
  const invokeAgentsLabel = intl.formatMessage({
    id: "composer.backgroundSubagents.invokeAgents",
    defaultMessage: "(@ to tag agents)",
    description:
      "Hint shown after the background agent summary when the panel is expanded.",
  });
  const expandedSummaryLabel = intl.formatMessage(
    {
      id: "composer.backgroundSubagents.summary.expanded",
      defaultMessage: "{summary} {hint}",
      description: "Background agent summary label when the panel is expanded.",
    },
    {
      summary: summaryLabel,
      hint: invokeAgentsLabel,
    },
  );
  const toggleExpanded = (): void => {
    setIsExpanded((currentValue) => {
      return !currentValue;
    });
  };

  return (
    <div
      className={clsx(
        "bg-token-input-background/70 text-token-foreground border-token-border/80 relative overflow-clip border-x border-t backdrop-blur-sm",
        showRoundedTop && "rounded-t-2xl",
      )}
    >
      <div className="group flex items-center justify-between gap-2 px-3 py-row-y">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
        >
          <span className="flex min-w-0 items-center gap-2">
            <AgentIcon
              className="icon-2xs shrink-0 text-token-input-placeholder-foreground/70"
              aria-hidden
            />
            <span className="text-size-chat min-w-0 truncate leading-4 text-token-description-foreground">
              {isExpanded ? expandedSummaryLabel : summaryLabel}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {hasTotalDiffStats ? (
              <TaskDiffStats
                linesAdded={totalDiffStats.linesAdded}
                linesRemoved={totalDiffStats.linesRemoved}
                variant="monochrome"
                className="text-size-chat"
              />
            ) : null}
            <ChevronRightIcon
              className={clsx(
                "icon-2xs shrink-0 text-current transition-transform duration-300",
                isExpanded ? "rotate-90" : "-rotate-90",
              )}
              aria-hidden
            />
          </span>
        </button>
      </div>
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? "auto" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={ACCORDION_TRANSITION}
        className={clsx(isExpanded ? "overflow-visible" : "overflow-hidden")}
        style={{ pointerEvents: isExpanded ? "auto" : "none" }}
      >
        <div className="vertical-scroll-fade-mask flex max-h-24 flex-col gap-0.5 overflow-y-auto px-3 pb-2 [--edge-fade-distance:1rem]">
          {rows.map((row) => (
            <BackgroundSubagentRow
              key={row.conversationId}
              row={row}
              onOpenThread={() => {
                onOpenThread(row.conversationId);
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function BackgroundSubagentRow({
  onOpenThread,
  row,
}: {
  onOpenThread: () => void;
  row: BackgroundSubagentDisplayRow;
}): React.ReactElement {
  const intl = useIntl();
  const mentionLabel = row.displayName;
  const agentRoleLabel = row.agentRole == null ? null : ` (${row.agentRole})`;
  const openThreadLabel = intl.formatMessage({
    id: "composer.backgroundSubagents.row.open",
    defaultMessage: "Open",
    description:
      "Label for button that opens the selected background subagent conversation as a full view",
  });
  const statusLabel =
    row.status === "active"
      ? intl.formatMessage({
          id: "composer.backgroundSubagents.row.activeLabel",
          defaultMessage: "is working",
          description:
            "Active status text shown after a background subagent mention label.",
        })
      : row.status === "waiting"
        ? intl.formatMessage({
            id: "composer.backgroundSubagents.row.waitingLabel",
            defaultMessage: "is awaiting instruction",
            description:
              "Waiting status text shown after a background subagent mention label.",
          })
        : intl.formatMessage({
            id: "composer.backgroundSubagents.row.doneLabel",
            defaultMessage: "is done",
            description:
              "Done status text shown after a background subagent mention label.",
          });

  return (
    <div className="px-0 py-1">
      <div className="text-size-chat block min-w-0 truncate leading-4 text-token-description-foreground">
        <div className="group flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">
            <Tooltip
              disabled={row.spawnModel == null}
              tooltipContent={
                row.spawnModel == null
                  ? null
                  : `Uses ${formatModelDisplayName(row.spawnModel)}`
              }
            >
              <button
                type="button"
                className={clsx(
                  "inline cursor-pointer bg-transparent p-0",
                  agentRoleLabel == null && "mr-1",
                )}
                onClick={onOpenThread}
                style={{
                  color: getAgentMentionColorCssValueForSessionId(
                    row.conversationId,
                  ),
                }}
              >
                {mentionLabel}
              </button>
            </Tooltip>
            {agentRoleLabel == null ? null : (
              <span className="mr-1">{agentRoleLabel}</span>
            )}
            <span
              className={clsx(
                "text-token-description-foreground",
                row.status === "active" && "loading-shimmer-pure-text",
              )}
            >
              {statusLabel}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-2.5">
            {row.diffStats == null ? null : (
              <TaskDiffStats
                linesAdded={row.diffStats.linesAdded}
                linesRemoved={row.diffStats.linesRemoved}
                className="mr-0.5"
              />
            )}
            <div
              role="button"
              tabIndex={0}
              className="text-size-chat inline-flex cursor-pointer items-center text-token-description-foreground opacity-70 hover:text-token-foreground hover:opacity-100 focus-visible:text-token-foreground focus-visible:opacity-100"
              aria-label={openThreadLabel}
              onClick={onOpenThread}
              onKeyDown={(event) => {
                runActionOnEnterOrSpace(event, onOpenThread);
              }}
            >
              <span>{openThreadLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function runActionOnEnterOrSpace(
  event: React.KeyboardEvent<HTMLElement>,
  action: () => void,
): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  action();
}
