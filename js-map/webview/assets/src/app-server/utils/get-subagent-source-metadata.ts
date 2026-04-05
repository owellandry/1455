import type * as AppServer from "app-server-types";

export type SubagentSourceMetadata = {
  parentThreadId: string | null;
  depth: number | null;
  agentNickname: string | null;
  agentRole: string | null;
};

export function getSubagentSourceMetadata(
  source: AppServer.v2.SessionSource | null | undefined,
): SubagentSourceMetadata | null {
  if (source == null || typeof source === "string") {
    return null;
  }

  const subAgentSource = getSubAgentSource(source);
  if (subAgentSource == null) {
    return null;
  }

  return getThreadSpawnMetadata(subAgentSource);
}

function getSubAgentSource(
  source: Exclude<AppServer.v2.SessionSource, string>,
): AppServer.SubAgentSource | null {
  if ("subAgent" in source) {
    return source.subAgent;
  }

  return null;
}

function getThreadSpawnMetadata(
  subAgentSource: AppServer.SubAgentSource,
): SubagentSourceMetadata {
  if (typeof subAgentSource === "string") {
    return getEmptySubagentSourceMetadata();
  }

  if ("thread_spawn" in subAgentSource) {
    return {
      parentThreadId: subAgentSource.thread_spawn.parent_thread_id,
      depth: subAgentSource.thread_spawn.depth,
      agentNickname: subAgentSource.thread_spawn.agent_nickname,
      agentRole: subAgentSource.thread_spawn.agent_role,
    };
  }

  return getEmptySubagentSourceMetadata();
}

function getEmptySubagentSourceMetadata(): SubagentSourceMetadata {
  return {
    parentThreadId: null,
    depth: null,
    agentNickname: null,
    agentRole: null,
  };
}
