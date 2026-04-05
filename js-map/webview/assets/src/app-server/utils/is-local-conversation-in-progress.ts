import last from "lodash/last";

import type { AppServerConversationState } from "../app-server-manager-types";

export function isLocalConversationInProgress({
  resumeState,
  threadRuntimeStatus,
  turns,
}: {
  resumeState: AppServerConversationState["resumeState"];
  threadRuntimeStatus?: AppServerConversationState["threadRuntimeStatus"];
  turns: AppServerConversationState["turns"];
}): boolean {
  if (resumeState === "needs_resume") {
    return threadRuntimeStatus?.type === "active";
  }
  if (turns.length === 0) {
    return resumeState === "resuming";
  }
  const lastTurn = last(turns);
  if (lastTurn == null) {
    return true;
  }
  return lastTurn.status === "inProgress";
}
