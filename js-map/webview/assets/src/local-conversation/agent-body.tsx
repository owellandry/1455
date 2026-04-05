import type { ConversationId, GitCwd, ThreadDetailLevel } from "protocol";

import {
  ExplorationAccordion,
  type AgentRenderEntry,
} from "./exploration-accordion";
import { ConversationGap } from "./items/conversation-gap";
import { HookItem } from "./items/hook-item";
import type {
  MultiAgentActionLocalConversationItem,
  NonEmptyArray,
} from "./items/local-conversation-item";
import { renderLocalConversationItemContent } from "./items/local-conversation-item-content";
import { MultiAgentActionItemContent } from "./items/multi-agent-action-item-content";
import { TaskProgressItemContent } from "./items/task-progress-item-content";

const AGENT_GAP_SIZE = "var(--conversation-tool-assistant-gap, 8px)";

type AgentRenderUnit =
  | { kind: "entry"; entry: AgentRenderEntry }
  | {
      kind: "multi-agent-group";
      items: NonEmptyArray<MultiAgentActionLocalConversationItem>;
    };

export function AgentBody({
  entries,
  conversationId,
  conversationDetailLevel,
  isTurnInProgress,
  hasAssistantStartedStreaming,
  cwd,
}: {
  entries: Array<AgentRenderEntry>;
  conversationId: ConversationId;
  conversationDetailLevel: ThreadDetailLevel;
  isTurnInProgress: boolean;
  hasAssistantStartedStreaming: boolean;
  cwd: GitCwd | null;
}): React.ReactElement {
  const nodes: Array<React.ReactElement> = [];
  const units = groupAdjacentMultiAgentEntries(entries);
  const latestMultiAgentGroupIndex = getLatestMultiAgentGroupIndex(units);
  const hasInProgressMultiAgentAction = entries.some(
    (entry) =>
      entry.kind === "item" &&
      entry.item.type === "multi-agent-action" &&
      entry.item.status === "inProgress",
  );
  const shouldKeepLatestGroupActive =
    isTurnInProgress &&
    !hasAssistantStartedStreaming &&
    !hasInProgressMultiAgentAction;

  for (const [index, unit] of units.entries()) {
    const unitKey = getAgentRenderUnitKey(unit, index);
    nodes.push(
      <AgentEntry
        key={unitKey}
        unit={unit}
        conversationId={conversationId}
        conversationDetailLevel={conversationDetailLevel}
        isTurnInProgress={isTurnInProgress}
        shouldForceMultiAgentGroupInProgress={
          shouldKeepLatestGroupActive && index === latestMultiAgentGroupIndex
        }
        renderIndex={index}
        renderKey={unitKey}
        cwd={cwd}
      />,
    );
  }

  return <div className="flex flex-col space-y-0">{nodes}</div>;
}

function AgentEntry({
  unit,
  conversationId,
  conversationDetailLevel,
  isTurnInProgress,
  shouldForceMultiAgentGroupInProgress,
  renderIndex,
  renderKey,
  cwd,
}: {
  unit: AgentRenderUnit;
  conversationId: ConversationId;
  conversationDetailLevel: ThreadDetailLevel;
  isTurnInProgress: boolean;
  shouldForceMultiAgentGroupInProgress: boolean;
  renderIndex: number;
  renderKey: string;
  cwd: GitCwd | null;
}): React.ReactElement {
  let agentEntry = null;
  if (unit.kind === "multi-agent-group") {
    agentEntry = (
      <MultiAgentActionItemContent
        conversationId={conversationId}
        items={unit.items}
        forceInProgress={shouldForceMultiAgentGroupInProgress}
      />
    );
  } else if (unit.entry.kind === "exploration") {
    agentEntry = (
      <ExplorationAccordion
        items={unit.entry.items}
        status={unit.entry.status}
      />
    );
  } else {
    const item = unit.entry.item;
    if (item.type === "todo-list") {
      agentEntry = <TaskProgressItemContent item={item} />;
    } else if (item.type === "hook") {
      agentEntry = <HookItem item={item} />;
    } else if (item.type === "reasoning") {
      agentEntry = null;
    } else {
      agentEntry = renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel,
        isTurnInProgress,
        cwd,
      });
    }
  }
  return (
    <>
      {renderIndex !== 0 && agentEntry && (
        <ConversationGap key={`agent-gap-${renderKey}`} size={AGENT_GAP_SIZE} />
      )}
      {agentEntry}
    </>
  );
}

function groupAdjacentMultiAgentEntries(
  entries: Array<AgentRenderEntry>,
): Array<AgentRenderUnit> {
  const units = Array<AgentRenderUnit>();

  for (const entry of entries) {
    if (
      entry.kind === "item" &&
      entry.item.type === "multi-agent-action" &&
      entry.item.status !== "inProgress"
    ) {
      const previous = units[units.length - 1];
      if (
        previous?.kind === "multi-agent-group" &&
        previous.items[0]?.action === entry.item.action &&
        previous.items[0]?.status === entry.item.status
      ) {
        previous.items.push(entry.item);
        continue;
      }
      units.push({
        kind: "multi-agent-group",
        items: [entry.item],
      });
      continue;
    }

    units.push({ kind: "entry", entry });
  }

  return units;
}

function getLatestMultiAgentGroupIndex(units: Array<AgentRenderUnit>): number {
  for (let index = units.length - 1; index >= 0; index -= 1) {
    if (units[index]?.kind === "multi-agent-group") {
      return index;
    }
  }
  return -1;
}

function getAgentRenderUnitKey(unit: AgentRenderUnit, index: number): string {
  if (unit.kind === "multi-agent-group") {
    const firstItem = unit.items[0];
    return `multi-agent-group:${firstItem?.action ?? "unknown"}:${firstItem?.status ?? "unknown"}:${firstItem?.id ?? index}`;
  }

  if (unit.entry.kind === "exploration") {
    const firstExplorationItem = unit.entry.items[0];
    const firstKey =
      firstExplorationItem?.type === "exec"
        ? firstExplorationItem.callId
        : `${firstExplorationItem?.type ?? "none"}-${index}`;
    return `exploration:${firstKey}`;
  }

  const item = unit.entry.item;
  if ("id" in item && typeof item.id === "string") {
    return `item:${item.type}:${item.id}`;
  }
  if ("callId" in item && typeof item.callId === "string") {
    return `item:${item.type}:${item.callId}`;
  }
  return `item:${item.type}:${index}`;
}
