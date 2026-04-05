import type * as AppServer from "app-server-types";
import isEqual from "lodash/isEqual";

import type { AppServerConversationState } from "../app-server-manager-types";

export type ConversationMetaSnapshot = {
  id: string;
  requestsRef: AppServerConversationState["requests"];
  turnsLength: number;
  lastTurnId: string | null;
  lastTurnStatus: AppServer.v2.Turn["status"] | null;
  createdAtMs: number;
  updatedAtMs: number;
  title: string | null;
  hasUnreadTurn: boolean;
  resumeState: AppServerConversationState["resumeState"];
  threadRuntimeStatus: AppServerConversationState["threadRuntimeStatus"];
  cwd: string | undefined;
  gitInfoBranch: string | null;
  isSubagentSource: boolean;
  subagentParentThreadId: string | null;
  subagentSpinnerProjectionSignature: string;
};

export function conversationMetaSnapshotEqual(
  first: ConversationMetaSnapshot,
  second: ConversationMetaSnapshot,
): boolean {
  return (
    first.id === second.id &&
    first.requestsRef === second.requestsRef &&
    first.turnsLength === second.turnsLength &&
    first.lastTurnId === second.lastTurnId &&
    first.lastTurnStatus === second.lastTurnStatus &&
    first.createdAtMs === second.createdAtMs &&
    first.updatedAtMs === second.updatedAtMs &&
    first.title === second.title &&
    first.hasUnreadTurn === second.hasUnreadTurn &&
    first.resumeState === second.resumeState &&
    isEqual(first.threadRuntimeStatus, second.threadRuntimeStatus) &&
    first.cwd === second.cwd &&
    first.gitInfoBranch === second.gitInfoBranch &&
    first.isSubagentSource === second.isSubagentSource &&
    first.subagentParentThreadId === second.subagentParentThreadId &&
    first.subagentSpinnerProjectionSignature ===
      second.subagentSpinnerProjectionSignature
  );
}
