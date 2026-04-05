import { useEffect } from "react";

import { messageBus } from "@/message-bus";

export function useHotkeyWindowDismissOnEscape(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      /*
        Register in the bubble phase so higher-priority Escape handlers in the
        composer, popovers, and dialogs can consume the key first. If nobody
        handled it, dismiss the hotkey window itself.
      */
      event.preventDefault();
      event.stopPropagation();
      messageBus.dispatchMessage("hotkey-window-dismiss", {});
    };

    window.addEventListener("keydown", onKeyDown);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
