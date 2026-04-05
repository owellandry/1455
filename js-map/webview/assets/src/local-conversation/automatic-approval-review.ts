import type * as AppServer from "app-server-types";
import {
  defineMessages,
  type IntlShape,
  type MessageDescriptor,
} from "react-intl";

const messages = defineMessages({
  statusApproved: {
    id: "localConversation.automaticApprovalReview.status.approved",
    defaultMessage: "Approved",
    description:
      "Compact status label shown for an approved automatic approval review.",
  },
  statusDenied: {
    id: "localConversation.automaticApprovalReview.status.denied",
    defaultMessage: "Denied",
    description:
      "Compact status label shown for a denied automatic approval review.",
  },
  statusAborted: {
    id: "localConversation.automaticApprovalReview.status.aborted",
    defaultMessage: "Aborted",
    description:
      "Compact status label shown for an aborted automatic approval review.",
  },
  statusInProgress: {
    id: "localConversation.automaticApprovalReview.status.inProgress",
    defaultMessage: "Reviewing",
    description:
      "Compact status label shown while an automatic approval review is in progress.",
  },
  summaryInProgress: {
    id: "localConversation.automaticApprovalReview.summary.inProgress",
    defaultMessage:
      "A carefully prompted reviewer agent is reviewing this request before Codex runs it.",
    description:
      "Fallback summary shown while an automatic approval review is in progress.",
  },
  summaryAborted: {
    id: "localConversation.automaticApprovalReview.summary.aborted",
    defaultMessage:
      "A carefully prompted reviewer agent stopped reviewing this request before Codex ran it.",
    description:
      "Fallback summary shown when an automatic approval review is aborted before the action runs.",
  },
  summaryCompleted: {
    id: "localConversation.automaticApprovalReview.summary.completed",
    defaultMessage:
      "A carefully prompted reviewer agent reviewed this request.",
    description:
      "Fallback summary shown when an automatic approval review completes without a rationale.",
  },
  riskHigh: {
    id: "localConversation.automaticApprovalReview.risk.high",
    defaultMessage: "High risk",
    description:
      "Compact risk label shown for a high-risk automatic approval review.",
  },
  riskMedium: {
    id: "localConversation.automaticApprovalReview.risk.medium",
    defaultMessage: "Medium risk",
    description:
      "Compact risk label shown for a medium-risk automatic approval review.",
  },
  riskLow: {
    id: "localConversation.automaticApprovalReview.risk.low",
    defaultMessage: "Low risk",
    description:
      "Compact risk label shown for a low-risk automatic approval review.",
  },
});

const AUTOMATIC_APPROVAL_REVIEW_STATUS_MESSAGES = {
  approved: messages.statusApproved,
  denied: messages.statusDenied,
  aborted: messages.statusAborted,
  inProgress: messages.statusInProgress,
} satisfies Record<
  AppServer.v2.GuardianApprovalReviewStatus,
  MessageDescriptor
>;

const AUTOMATIC_APPROVAL_REVIEW_RISK_MESSAGES = {
  high: messages.riskHigh,
  medium: messages.riskMedium,
  low: messages.riskLow,
} satisfies Record<
  NonNullable<AppServer.v2.GuardianApprovalReview["riskLevel"]>,
  MessageDescriptor
>;

export function formatAutomaticApprovalReviewStatusLabel(
  intl: IntlShape,
  status: AppServer.v2.GuardianApprovalReviewStatus,
): string {
  return intl.formatMessage(AUTOMATIC_APPROVAL_REVIEW_STATUS_MESSAGES[status]);
}

export function formatAutomaticApprovalReviewSummary(
  intl: IntlShape,
  review: AppServer.v2.GuardianApprovalReview,
): string {
  if (review.rationale != null && review.rationale.trim().length > 0) {
    return review.rationale.trim();
  }
  if (review.status === "inProgress") {
    return intl.formatMessage(messages.summaryInProgress);
  }
  if (review.status === "aborted") {
    return intl.formatMessage(messages.summaryAborted);
  }
  return intl.formatMessage(messages.summaryCompleted);
}

export function formatAutomaticApprovalReviewRiskLabel(
  intl: IntlShape,
  riskLevel: NonNullable<AppServer.v2.GuardianApprovalReview["riskLevel"]>,
): string {
  return intl.formatMessage(AUTOMATIC_APPROVAL_REVIEW_RISK_MESSAGES[riskLevel]);
}
