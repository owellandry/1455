import { atom, useAtom } from "jotai";
import { useCallback } from "react";

export const aAppliedTurnIds = atom<Array<string>>([]);

export function useHasAppliedTurnLocally(
  turnId: string | null | undefined,
): [boolean, () => void, () => void] {
  const [appliedTurnIds, setAppliedTurnIds] = useAtom(aAppliedTurnIds);
  const hasApplied = turnId ? appliedTurnIds.includes(turnId) : false;
  const apply = useCallback(() => {
    if (!turnId) {
      return;
    }

    setAppliedTurnIds((prev) => {
      if (prev.includes(turnId)) {
        return prev;
      }

      // Don't store more than 20
      return [...prev, turnId].slice(0, 20);
    });
  }, [turnId, setAppliedTurnIds]);
  const clear = useCallback(() => {
    setAppliedTurnIds((prev) => {
      return prev.filter((id) => id !== turnId);
    });
  }, [turnId, setAppliedTurnIds]);
  return [hasApplied, apply, clear];
}
