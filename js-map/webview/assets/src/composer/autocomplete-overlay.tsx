import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

import { useComposerTopMenuChrome } from "./use-composer-top-menu-chrome";

/**
 * Shared positioning wrapper for composer-style autocompletes (file mentions, skill mentions).
 * Avoids repeating absolute positioning/z-index in each consumer.
 */
export function AutocompleteOverlay({
  isActive,
  children,
}: {
  isActive: boolean;
  children: ReactNode;
}): ReactElement | null {
  const { hotkeyWindowPortalContainer, shellClassName } =
    useComposerTopMenuChrome({});

  if (!isActive) {
    return null;
  }

  if (hotkeyWindowPortalContainer != null) {
    return createPortal(
      <div data-hotkey-window-floating-ui className={shellClassName}>
        {children}
      </div>,
      hotkeyWindowPortalContainer,
    );
  }

  return (
    <div data-hotkey-window-floating-ui className={shellClassName}>
      {children}
    </div>
  );
}
