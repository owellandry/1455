import type { AutomationRunStatus } from "protocol";

export function isInboxRunning(status: AutomationRunStatus | null): boolean {
  return status === "IN_PROGRESS";
}

export function isInboxPendingReview(
  status: AutomationRunStatus | null,
): boolean {
  return status === "PENDING_REVIEW";
}

export function isInboxArchived(status: AutomationRunStatus | null): boolean {
  return status === "ARCHIVED";
}
