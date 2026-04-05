import clsx from "clsx";
import type {
  ReactElement,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SIDEBAR_DEFAULT_WIDTH, normalizeSidebarWidth } from "./sidebar-width";

export function SidebarResizer({
  isSidebarOpen,
  onResizingChange,
  previewSidebarWidth,
  setSidebarWidth,
  sidebarWidth,
}: {
  isSidebarOpen: boolean;
  onResizingChange?: (isResizing: boolean) => void;
  previewSidebarWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  sidebarWidth: number;
}): ReactElement | null {
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const dragStartXRef = useRef<number | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  useEffect((): void => {
    onResizingChange?.(isResizing);
  }, [isResizing, onResizingChange]);

  const commitCssWidth = useCallback(
    (nextWidth: number, opts?: { immediate?: boolean }): void => {
      const apply = (): void => {
        previewSidebarWidth(nextWidth);
      };

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (opts?.immediate) {
        apply();
      } else {
        rafRef.current = requestAnimationFrame(apply);
      }
    },
    [previewSidebarWidth],
  );

  const safeSidebarWidth = normalizeSidebarWidth(sidebarWidth);

  useEffect((): (() => void) => {
    commitCssWidth(safeSidebarWidth, { immediate: true });
    return (): void => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [commitCssWidth, safeSidebarWidth]);

  useEffect((): (() => void) | undefined => {
    if (!isResizing) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent): void => {
      event.preventDefault();
      const dragStartX = dragStartXRef.current;
      if (dragStartX != null && event.clientX !== dragStartX) {
        hasDraggedRef.current = true;
      }
      commitCssWidth(event.clientX);
    };

    const stopResizing = (event: PointerEvent): void => {
      event.preventDefault();
      const didDrag = hasDraggedRef.current;
      dragStartXRef.current = null;
      hasDraggedRef.current = false;

      if (didDrag) {
        // Commit while transitions are still disabled.
        commitCssWidth(event.clientX, { immediate: true });
        setSidebarWidth(normalizeSidebarWidth(event.clientX));
      } else {
        commitCssWidth(safeSidebarWidth, { immediate: true });
      }

      setIsResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [commitCssWidth, isResizing, safeSidebarWidth, setSidebarWidth]);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStartXRef.current = event.clientX;
      hasDraggedRef.current = false;
      setIsResizing(true);
    },
    [],
  );

  const handleResizeClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      if (event.detail !== 2) {
        return;
      }

      event.preventDefault();
      setIsResizing(false);
      setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
      commitCssWidth(SIDEBAR_DEFAULT_WIDTH, { immediate: true });
    },
    [commitCssWidth, setSidebarWidth],
  );

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <SidebarResizeHandle
      isResizing={isResizing}
      onClick={handleResizeClick}
      onPointerDown={handleResizeStart}
    />
  );
}

function SidebarResizeHandle({
  isResizing,
  onClick,
  onPointerDown,
}: {
  isResizing: boolean;
  onClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}): ReactElement {
  // z-20 ensures the handle captures pointer events above the main content.
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="group absolute -top-toolbar right-0 bottom-0 z-20 flex w-3 translate-x-1.5 cursor-col-resize touch-none select-none active:cursor-col-resize"
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div
        className={clsx(
          "pointer-events-none m-auto h-full w-px bg-gradient-to-b from-transparent via-transparent to-transparent transition-colors",
          isResizing
            ? "via-token-foreground/25"
            : "group-hover:via-token-foreground/25 group-active:via-token-foreground/25",
        )}
      />
    </div>
  );
}
