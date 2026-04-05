import type * as AppServer from "app-server-types";

import { getSubagentSourceMetadata } from "./get-subagent-source-metadata";

export function getThreadAgentNickname(
  thread:
    | {
        agentNickname: string | null;
        source: AppServer.v2.SessionSource;
      }
    | null
    | undefined,
): string | null {
  if (thread == null) {
    return null;
  }

  const topLevelAgentNickname = getTrimmedAgentNickname(thread.agentNickname);
  if (topLevelAgentNickname != null) {
    return topLevelAgentNickname;
  }

  return getTrimmedAgentNickname(
    getSubagentSourceMetadata(thread.source)?.agentNickname,
  );
}

function getTrimmedAgentNickname(
  agentNickname: string | null | undefined,
): string | null {
  if (agentNickname == null) {
    return null;
  }

  const trimmedAgentNickname = agentNickname.trim();
  if (trimmedAgentNickname.length === 0) {
    return null;
  }

  return trimmedAgentNickname;
}
