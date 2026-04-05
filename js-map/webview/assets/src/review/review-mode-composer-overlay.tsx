import { useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useResizeObserver } from "@/utils/use-resize-observer";

export const REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR =
  "--review-composer-overlay-height";

export function ReviewModeComposerOverlay({
  children,
  portalTarget,
}: {
  children: ReactNode;
  portalTarget?: HTMLElement | null;
}): React.ReactElement {
  const styleTargetRef = useRef<HTMLElement | null>(null);
  const resizeOverlayRef = useResizeObserver<HTMLDivElement>((entry) => {
    const styleTarget =
      styleTargetRef.current ?? portalTarget ?? entry.target.parentElement;
    if (!styleTarget) {
      return;
    }
    styleTargetRef.current = styleTarget;
    styleTarget.style.setProperty(
      REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR,
      `${Math.ceil(entry.contentRect.height)}px`,
    );
  });
  const setOverlayRef = useCallback(
    (node: HTMLDivElement | null): void => {
      resizeOverlayRef(node);
      if (!node) {
        styleTargetRef.current?.style.removeProperty(
          REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR,
        );
        styleTargetRef.current = null;
        return;
      }
      const styleTarget = portalTarget ?? node.parentElement;
      if (!styleTarget) {
        return;
      }
      styleTargetRef.current = styleTarget;
      styleTarget.style.setProperty(
        REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR,
        `${Math.ceil(node.getBoundingClientRect().height)}px`,
      );
    },
    [portalTarget, resizeOverlayRef],
  );
  const content = (
    <div
      ref={setOverlayRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
    >
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-token-bg-primary via-token-bg-primary/90 to-transparent" />
      <div className="relative mx-auto w-full max-w-[var(--thread-composer-max-width)] px-panel pb-2">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
  if (portalTarget == null) {
    return content;
  }
  return createPortal(content, portalTarget);
}
