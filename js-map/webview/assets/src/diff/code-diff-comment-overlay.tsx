import clsx from "clsx";
import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type InlineCommentOverlayPosition = {
  portalContainer: HTMLElement;
  left: number;
  top: number;
  width: number;
  fixedPosition: boolean;
};

/**
 * Portal-based overlay for inline diff comment mention menus.
 *
 * We render in a portal to avoid clipping from diff rows/headers while still
 * anchoring the menu width/position to the inline comment editor.
 */
export function CodeDiffCommentOverlay({
  anchorRef,
  isActive,
  placement,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  isActive: boolean;
  placement: "top" | "bottom";
  children: ReactNode;
}): ReactElement | null {
  const subscribeOverlayPosition = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!isActive || typeof window === "undefined") {
        return (): void => {};
      }
      window.addEventListener("resize", onStoreChange);
      window.addEventListener("scroll", onStoreChange, true);
      return (): void => {
        window.removeEventListener("resize", onStoreChange);
        window.removeEventListener("scroll", onStoreChange, true);
      };
    },
    [isActive],
  );
  const overlaySnapshot = useSyncExternalStore(subscribeOverlayPosition, () => {
    const position = getInlineCommentOverlayPosition({
      anchorRef,
      placement,
    });
    if (position == null) {
      return null;
    }
    return `${position.fixedPosition}:${position.left}:${position.top}:${position.width}:${placement}`;
  });
  const overlayPosition = useMemo<InlineCommentOverlayPosition | null>(() => {
    if (overlaySnapshot == null) {
      return null;
    }
    return getInlineCommentOverlayPosition({
      anchorRef,
      placement,
    });
  }, [anchorRef, overlaySnapshot, placement]);

  if (!isActive || overlayPosition == null) {
    return null;
  }

  return createPortal(
    <div
      className={clsx(
        "z-[60]",
        overlayPosition.fixedPosition ? "fixed" : "absolute",
      )}
      style={{
        left: overlayPosition.left,
        top: overlayPosition.top,
        width: overlayPosition.width,
      }}
    >
      {children}
    </div>,
    overlayPosition.portalContainer,
  );
}

/**
 * Computes viewport-relative overlay coordinates and normalizes them into the
 * selected portal container's coordinate space (`document.body` or a dialog).
 */
function getInlineCommentOverlayPosition({
  anchorRef,
  placement,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  placement: "top" | "bottom";
}): InlineCommentOverlayPosition | null {
  if (typeof document === "undefined") {
    return null;
  }

  const anchorElement = anchorRef.current;
  if (anchorElement == null) {
    return null;
  }

  const portalContainer =
    (anchorElement.closest(".codex-dialog") as HTMLElement | null) ??
    document.body;
  const anchorRect = anchorElement.getBoundingClientRect();
  const containerRect =
    portalContainer === document.body
      ? { left: 0, top: 0 }
      : portalContainer.getBoundingClientRect();

  return {
    portalContainer,
    left: anchorRect.left - containerRect.left,
    top:
      (placement === "top" ? anchorRect.top - 8 : anchorRect.bottom + 8) -
      containerRect.top,
    width: anchorRect.width,
    fixedPosition: portalContainer === document.body,
  };
}
