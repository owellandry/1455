import { useLayoutEffect, useRef, type RefObject } from "react";

import type { ImperativePanelHandle } from "./panels";

/**
 * Syncs a panel's collapsed state to an external boolean.
 */
export function usePanelOpenState(
  isOpen: boolean | undefined,
  isEnabled = true,
): RefObject<ImperativePanelHandle | null> {
  const panelRef = useRef<ImperativePanelHandle | null>(null);

  useLayoutEffect((): void => {
    if (!isEnabled || !panelRef.current || isOpen === undefined) {
      return;
    }
    if (isOpen) {
      panelRef.current.expand();
      return;
    }
    panelRef.current.collapse();
  }, [isEnabled, isOpen]);

  return panelRef;
}
