import clsx from "clsx";
import { motion } from "framer-motion";
import type { ConversationId, GitCwd } from "protocol";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import {
  MarkdownSurface,
  MarkdownSurfaceBody,
} from "@/components/markdown-surface";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import { useWindowType } from "@/hooks/use-window-type";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import ChevronIcon from "@/icons/chevron.svg";
import DownloadIcon from "@/icons/download.svg";
import { messageBus } from "@/message-bus";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import type {
  AssistantMessageLocalConversationItem,
  ProposedPlanLocalConversationItem,
} from "./local-conversation-item";

const COLLAPSED_CONTENT_HEIGHT = 320;
const PLAN_MARKDOWN_FILENAME = "PLAN.md";

export function PlanSummaryItemContent({
  item,
  conversationId,
  cwd,
  hideCodeBlocks = false,
  defaultCollapsed = false,
  showOpenButton = true,
}: {
  item:
    | AssistantMessageLocalConversationItem
    | ProposedPlanLocalConversationItem;
  conversationId: ConversationId;
  cwd: GitCwd | null;
  hideCodeBlocks?: boolean;
  defaultCollapsed?: boolean;
  showOpenButton?: boolean;
}): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const intl = useIntl();
  const windowType = useWindowType();
  const showOpenActions = showOpenButton && item.completed;
  const canCopyPlan = item.completed && item.content.trim().length > 0;
  const canDownloadPlan = item.completed && item.content.trim().length > 0;
  const showRightSideCopyButton = canCopyPlan && windowType !== "extension";
  const showRightSideDownloadButton =
    canDownloadPlan && windowType !== "extension";
  const downloadPlanLabel = intl.formatMessage({
    id: "localConversation.planSummary.download",
    defaultMessage: "Download plan",
    description: "Tooltip text for button that downloads the plan markdown",
  });
  const collapseLabel = isCollapsed
    ? intl.formatMessage({
        id: "localConversation.planSummary.expand",
        defaultMessage: "Expand plan summary",
        description:
          "Aria label for button that expands a collapsed plan summary",
      })
    : intl.formatMessage({
        id: "localConversation.planSummary.collapse",
        defaultMessage: "Collapse plan summary",
        description:
          "Aria label for button that collapses the plan summary content",
      });
  const handleOpenPlanSummary = (): void => {
    messageBus.dispatchMessage("show-plan-summary", {
      planContent: item.content,
      conversationId,
    });
  };
  const handleDownloadPlan = (): void => {
    const blob = new Blob([item.content], {
      type: "text/markdown;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = PLAN_MARKDOWN_FILENAME;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <MarkdownSurface>
      <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span
          className={clsx(
            "text-token-foreground text-base font-semibold leading-tight",
            !item.completed && "loading-shimmer-pure-text",
          )}
        >
          {item.completed ? (
            <FormattedMessage
              id="localConversation.planSummary.title"
              defaultMessage="Plan"
              description="Title for the plan summary card header"
            />
          ) : (
            <FormattedMessage
              id="localConversation.planSummary.titleWriting"
              defaultMessage="Writing plan"
              description="Title for the plan summary card header while the plan is still being written"
            />
          )}
        </span>
        <div className="flex items-center gap-1">
          {showOpenActions ? (
            <WithWindow extension>
              <div className="flex items-center gap-1">
                {canDownloadPlan ? (
                  <Tooltip tooltipContent={downloadPlanLabel}>
                    <Button
                      color="ghost"
                      size="icon"
                      aria-label={downloadPlanLabel}
                      onClick={() => {
                        handleDownloadPlan();
                      }}
                    >
                      <DownloadIcon className="icon-2xs" />
                    </Button>
                  </Tooltip>
                ) : null}
                {canCopyPlan ? (
                  <CopyButton
                    iconOnly
                    iconClassName="icon-2xs"
                    onCopy={(event) => {
                      void copyToClipboard(item.content, event);
                    }}
                  />
                ) : null}
                <Tooltip
                  tooltipContent={
                    <FormattedMessage
                      id="localConversation.planSummary.openInNewWindow.tooltip"
                      defaultMessage="Open in new window"
                      description="Tooltip text for button that opens the plan summary in a new window"
                    />
                  }
                >
                  <Button
                    className="gap-1"
                    color="outline"
                    onClick={handleOpenPlanSummary}
                  >
                    <FormattedMessage
                      id="localConversation.planSummary.openInNewWindow"
                      defaultMessage="Open"
                      description="Button label to open the plan summary in a new window"
                    />
                    <ArrowTopRightIcon className="icon-2xs" />
                  </Button>
                </Tooltip>
              </div>
            </WithWindow>
          ) : null}
          {showRightSideDownloadButton ? (
            <Tooltip tooltipContent={downloadPlanLabel}>
              <Button
                color="ghost"
                size="icon"
                aria-label={downloadPlanLabel}
                onClick={() => {
                  handleDownloadPlan();
                }}
              >
                <DownloadIcon className="icon-2xs" />
              </Button>
            </Tooltip>
          ) : null}
          {showRightSideCopyButton ? (
            <CopyButton
              iconOnly
              iconClassName="icon-2xs"
              onCopy={(event) => {
                void copyToClipboard(item.content, event);
              }}
            />
          ) : null}
          <Tooltip
            tooltipContent={
              isCollapsed ? (
                <FormattedMessage
                  id="localConversation.planSummary.expandTooltip"
                  defaultMessage="Expand"
                  description="Tooltip text for button that expands a collapsed plan summary"
                />
              ) : (
                <FormattedMessage
                  id="localConversation.planSummary.collapseTooltip"
                  defaultMessage="Collapse"
                  description="Tooltip text for button that collapses the plan summary content"
                />
              )
            }
          >
            <Button
              color="ghost"
              size="icon"
              aria-label={collapseLabel}
              onClick={() => {
                setIsCollapsed((prev) => !prev);
              }}
            >
              <ChevronIcon
                className={clsx(
                  "icon-2xs transition-transform",
                  isCollapsed ? "rotate-180" : "rotate-0",
                )}
              />
            </Button>
          </Tooltip>
        </div>
      </div>
      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{
          height: isCollapsed ? COLLAPSED_CONTENT_HEIGHT : "auto",
        }}
        transition={ACCORDION_TRANSITION}
      >
        <MarkdownSurfaceBody
          markdown={item.content}
          conversationId={conversationId}
          hideCodeBlocks={hideCodeBlocks}
          fadeType={item.completed ? "none" : "indexed"}
          cwd={cwd}
        />
        {isCollapsed ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-token-input-background to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <Button
                className="pointer-events-auto"
                color="primary"
                onClick={() => {
                  setIsCollapsed(false);
                }}
              >
                <FormattedMessage
                  id="localConversation.planSummary.viewPlan"
                  defaultMessage="Expand plan"
                  description="Button label to expand a collapsed plan summary"
                />
              </Button>
            </div>
          </>
        ) : null}
      </motion.div>
    </MarkdownSurface>
  );
}
