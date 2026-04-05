import clsx from "clsx";
import type React from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import ChevronRight from "@/icons/chevron-right.svg";
import {
  formatAutomaticApprovalReviewRiskLabel,
  formatAutomaticApprovalReviewStatusLabel,
  formatAutomaticApprovalReviewSummary,
} from "@/local-conversation/automatic-approval-review";

import type { AutomaticApprovalReviewLocalConversationItem } from "./local-conversation-item";
import { TimelineItem } from "./timeline-item";

function getStatusToneClassName(
  status: AutomaticApprovalReviewLocalConversationItem["status"],
): string {
  if (status === "approved") {
    return "text-token-success";
  }
  if (status === "denied") {
    return "text-token-danger";
  }
  if (status === "aborted") {
    return "text-token-description-foreground";
  }
  return "text-token-foreground";
}

function getStatusBadgeClassName(
  status: AutomaticApprovalReviewLocalConversationItem["status"],
): string {
  if (status === "approved") {
    return "bg-token-success/15";
  }
  if (status === "denied") {
    return "bg-token-danger/15";
  }
  if (status === "aborted") {
    return "bg-token-foreground/5";
  }
  return "";
}

export function AutomaticApprovalReviewContent({
  item,
}: {
  item: AutomaticApprovalReviewLocalConversationItem;
}): React.ReactElement {
  const intl = useIntl();
  const summaryId = `automatic-approval-review-summary-${item.id}`;
  const isInProgress = item.status === "inProgress";
  const statusLabel = formatAutomaticApprovalReviewStatusLabel(
    intl,
    item.status,
  );
  const summary = formatAutomaticApprovalReviewSummary(intl, item);
  const riskLabel =
    item.riskLevel == null
      ? null
      : formatAutomaticApprovalReviewRiskLabel(intl, item.riskLevel);
  const canToggleSummary = summary.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const showSummary = canToggleSummary && isExpanded;

  const headerContent = (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="text-size-chat font-medium text-token-foreground">
        <FormattedMessage
          id="localConversation.automaticApprovalReview.title"
          defaultMessage="Automatic approval review"
          description="Title shown for an automatic approval review item in the conversation timeline."
        />
      </span>
      <span
        className={clsx(
          "text-size-chat min-w-0 font-medium",
          !isInProgress && "rounded-full px-1.5 py-0.5",
          getStatusToneClassName(item.status),
          getStatusBadgeClassName(item.status),
          isInProgress && "loading-shimmer-pure-text",
        )}
      >
        {statusLabel}
      </span>
      {riskLabel == null ? null : (
        <span className="text-size-chat min-w-0 text-token-description-foreground">
          {riskLabel}
        </span>
      )}
      {canToggleSummary && (
        <ChevronRight
          className={clsx(
            "icon-2xs flex-shrink-0 text-token-input-placeholder-foreground transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />
      )}
    </div>
  );

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col gap-1">
        {canToggleSummary ? (
          <button
            type="button"
            className="group cursor-pointer text-left"
            aria-expanded={isExpanded}
            aria-controls={summaryId}
            onClick={() => {
              setIsExpanded((value) => !value);
            }}
          >
            {headerContent}
          </button>
        ) : (
          headerContent
        )}
        {showSummary ? (
          <p
            id={summaryId}
            className="text-size-chat whitespace-pre-wrap text-token-description-foreground"
          >
            {summary}
          </p>
        ) : null}
      </div>
    </TimelineItem>
  );
}
