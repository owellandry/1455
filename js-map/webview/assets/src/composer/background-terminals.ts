import type { AppServerConversationState } from "@/app-server/app-server-manager-types";

export type BackgroundTerminal = {
  id: string;
  command: string;
  cwd: string | null;
  processId: string | null;
  previewLine: string | null;
};

function getTerminalPreviewLine(
  output: string | null | undefined,
): string | null {
  if (!output) {
    return null;
  }
  const lines = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }
  return lines[lines.length - 1] ?? null;
}

export function getBackgroundTerminals(
  conversation: {
    turns: AppServerConversationState["turns"];
  } | null,
  hasActiveConversationTerminalSession = true,
): Array<BackgroundTerminal> {
  if (!conversation || !hasActiveConversationTerminalSession) {
    return [];
  }
  const latestTurnIndex = conversation.turns.length - 1;
  const runningTerminals = Array<BackgroundTerminal>();
  for (let turnIndex = latestTurnIndex; turnIndex >= 0; turnIndex -= 1) {
    const turn = conversation.turns[turnIndex];
    if (!turn) {
      continue;
    }
    if (turnIndex === latestTurnIndex && turn.status === "inProgress") {
      continue;
    }
    for (const item of turn.items ?? []) {
      if (!item) {
        continue;
      }
      if (
        item.type === "commandExecution" &&
        item.status === "inProgress" &&
        !turn.interruptedCommandExecutionItemIds?.includes(item.id)
      ) {
        runningTerminals.push({
          id: item.id,
          command: item.command,
          cwd: item.cwd ?? null,
          processId: item.processId,
          previewLine: getTerminalPreviewLine(item.aggregatedOutput),
        });
      }
    }
  }
  return runningTerminals;
}
