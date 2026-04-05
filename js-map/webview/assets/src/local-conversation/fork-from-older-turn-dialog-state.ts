import { persistedAtom } from "@/utils/persisted-atom";
import { getPersistedValue } from "@/utils/persisted-atom-store";

const SKIP_FORK_FROM_OLDER_TURN_CONFIRM_KEY =
  "skip-fork-from-older-turn-confirm";

export const aSkipForkFromOlderTurnConfirm = persistedAtom<boolean>(
  SKIP_FORK_FROM_OLDER_TURN_CONFIRM_KEY,
  false,
);

export function shouldSkipForkFromOlderTurnConfirm(): boolean {
  return getPersistedValue(SKIP_FORK_FROM_OLDER_TURN_CONFIRM_KEY, false);
}
