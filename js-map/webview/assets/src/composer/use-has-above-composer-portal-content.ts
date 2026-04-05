import { useSyncExternalStore } from "react";

import { ABOVE_COMPOSER_PORTAL_ID } from "@/composer/above-composer-portal-id";

export function useHasAboveComposerPortalContent(): boolean {
  return useSyncExternalStore(
    subscribeToAboveComposerPortal,
    getAboveComposerPortalHasContent,
  );
}

function getAboveComposerPortalHasContent(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const portal = document.getElementById(ABOVE_COMPOSER_PORTAL_ID);
  if (!portal) {
    return false;
  }
  return portal.childElementCount > 0;
}

function subscribeToAboveComposerPortal(listener: () => void): () => void {
  if (typeof document === "undefined") {
    return (): void => {};
  }

  let portalObserver: MutationObserver | null = null;
  let retryTimeoutId: number | null = null;

  const startPortalObserver = (target: HTMLElement): void => {
    if (portalObserver) {
      return;
    }
    portalObserver = new MutationObserver((): void => {
      listener();
    });
    portalObserver.observe(target, {
      childList: true,
    });
  };

  const portal = document.getElementById(ABOVE_COMPOSER_PORTAL_ID);
  if (portal) {
    startPortalObserver(portal);
  } else {
    retryTimeoutId = window.setTimeout((): void => {
      const nextPortal = document.getElementById(ABOVE_COMPOSER_PORTAL_ID);
      if (!nextPortal) {
        return;
      }
      startPortalObserver(nextPortal);
      listener();
    }, 0);
  }

  return (): void => {
    if (retryTimeoutId != null) {
      window.clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    if (portalObserver) {
      portalObserver.disconnect();
    }
  };
}
