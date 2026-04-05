import type { AppServerConversationState } from "../app-server-manager-types";
import { toTimestampMs } from "./to-timestamp-ms";

export function deserializeConversationState(
  state: Record<string, unknown>,
  hostId: string,
): AppServerConversationState {
  const candidate = state as AppServerConversationState & {
    createdAt?: unknown;
    updatedAt?: unknown;
    id?: unknown;
  };

  const normalizedState: AppServerConversationState = {
    ...candidate,
    hostId,
    pendingSteers: candidate.pendingSteers ?? [],
    createdAt: toTimestampMs(candidate.createdAt) ?? Date.now(),
    updatedAt:
      toTimestampMs(candidate.updatedAt) ??
      toTimestampMs(candidate.createdAt) ??
      Date.now(),
    title: candidate.title ?? null,
    turns: (candidate.turns ?? []).map((turn) => ({
      ...turn,
      turnStartedAtMs: toTimestampMs(turn.turnStartedAtMs),
      finalAssistantStartedAtMs: toTimestampMs(turn.finalAssistantStartedAtMs),
    })),
  };

  return normalizedState;
}
