import type {
  CodeTaskTurnsResponse,
  TaskAssistantTurn,
  TaskUserTurn,
} from "protocol";

export type RemoteConversationTurn = TaskAssistantTurn | TaskUserTurn;

export type TurnTreeNode = {
  userTurn: TaskUserTurn;
  assistantTurns: Array<TaskAssistantTurn>;
  children: Record<string, TurnTreeNode>;
};

export function isTaskUserTurn(
  turn: RemoteConversationTurn,
): turn is TaskUserTurn {
  return "input_items" in turn;
}

export function buildRemoteTurns({
  taskTurns,
  fallbackUserTurn,
  fallbackAssistantTurn,
}: {
  taskTurns: CodeTaskTurnsResponse | undefined;
  fallbackUserTurn: TaskUserTurn | null;
  fallbackAssistantTurn: TaskAssistantTurn | null;
}): Array<RemoteConversationTurn> {
  const byId = new Map<string, RemoteConversationTurn>();
  Object.values(taskTurns?.turn_mapping ?? {}).forEach((node) => {
    if (node?.turn) {
      byId.set(node.turn.id, node.turn);
    }
  });
  if (fallbackUserTurn) {
    byId.set(fallbackUserTurn.id, fallbackUserTurn);
  }
  if (fallbackAssistantTurn) {
    byId.set(fallbackAssistantTurn.id, fallbackAssistantTurn);
  }
  return Array.from(byId.values()).sort((a, b) => a.created_at - b.created_at);
}

export function buildTurnTree(
  turns: Array<RemoteConversationTurn>,
): TurnTreeNode | null {
  const assistantsByPrev: Record<string, Array<TaskAssistantTurn>> = {};
  const userByPrevAssist: Record<string, TaskUserTurn> = {};
  let root: TaskUserTurn | undefined;

  for (const turn of turns) {
    if (isTaskUserTurn(turn)) {
      if (!turn.previous_turn_id) {
        root = turn;
      } else {
        userByPrevAssist[turn.previous_turn_id] = turn;
      }
    } else if (turn.previous_turn_id) {
      (assistantsByPrev[turn.previous_turn_id] ??= []).push(turn);
    }
  }

  if (!root) {
    return null;
  }

  const buildNode = (userTurn: TaskUserTurn): TurnTreeNode => {
    const assistantTurns = assistantsByPrev[userTurn.id] ?? [];
    const children: Record<string, TurnTreeNode> = {};

    for (const assistantTurn of assistantTurns) {
      const childUser = userByPrevAssist[assistantTurn.id];
      if (childUser) {
        children[assistantTurn.id] = buildNode(childUser);
      }
    }

    return { userTurn, assistantTurns, children };
  };

  return buildNode(root);
}

export function getDefaultFocusId(
  turns: Array<RemoteConversationTurn>,
): string | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (isTaskUserTurn(turn) && turn.previous_turn_id) {
      return turn.previous_turn_id;
    }
  }
  return null;
}

export function createTurnGroupings(
  root: TurnTreeNode | null,
  focusedAssistantId: string | null,
): Array<{ node: TurnTreeNode; activeId: string | null }> {
  if (!root) {
    return [] as Array<{ node: TurnTreeNode; activeId: string | null }>;
  }

  const path: Array<{ node: TurnTreeNode; activeId: string | null }> = [];

  if (focusedAssistantId) {
    const dfs = (
      node: TurnTreeNode,
    ): Array<{ node: TurnTreeNode; activeId: string | null }> | null => {
      for (const assistantTurn of node.assistantTurns) {
        if (assistantTurn.id === focusedAssistantId) {
          return [{ node, activeId: assistantTurn.id }];
        }
        const childNode = node.children[assistantTurn.id];
        const childPath = childNode && dfs(childNode);
        if (childPath) {
          return [{ node, activeId: assistantTurn.id }, ...childPath];
        }
      }
      return null;
    };

    const foundPath = dfs(root);
    if (foundPath) {
      path.push(...foundPath);
    }
  }

  if (path.length === 0) {
    path.push({
      node: root,
      activeId: root.assistantTurns[0]?.id ?? null,
    });
  }

  let last = path[path.length - 1];
  while (last?.activeId) {
    const child = last.node.children[last.activeId];
    if (!child) {
      break;
    }
    path.push({
      node: child,
      activeId: child.assistantTurns[0]?.id ?? null,
    });
    last = path[path.length - 1];
  }

  return path;
}
