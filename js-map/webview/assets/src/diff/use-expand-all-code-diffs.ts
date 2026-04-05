import { useCallback, useEffect } from "react";

export type DiffScope = "review";

export type ExpandAllCodeDiffsEvent = CustomEvent<{
  open: boolean;
  scope?: DiffScope;
}>;

const EVENT_NAME = "wham-toggle-all-diffs";

declare global {
  interface WindowEventMap {
    [EVENT_NAME]: ExpandAllCodeDiffsEvent;
  }
}

export function useExpandAllCodeDiffs(
  onExpand: (expand: boolean) => void,
  scope?: DiffScope,
): (expand: boolean) => void {
  useEffect(() => {
    function handle(event: ExpandAllCodeDiffsEvent): void {
      const eventScope = event.detail.scope;
      if (scope && eventScope !== scope) {
        return;
      } else if (!scope && eventScope) {
        return;
      }
      onExpand(event.detail.open);
    }

    window.addEventListener(EVENT_NAME, handle);
    return (): void => {
      window.removeEventListener(EVENT_NAME, handle);
    };
  }, [onExpand, scope]);

  return useCallback(
    (expand: boolean) => {
      const detail: ExpandAllCodeDiffsEvent["detail"] = { open: expand, scope };
      const event = new CustomEvent(EVENT_NAME, { detail });
      window.dispatchEvent(event);
    },
    [scope],
  );
}
