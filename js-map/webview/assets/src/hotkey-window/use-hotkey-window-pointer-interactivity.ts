import type { RefObject } from "react";
import { useEffect, useEffectEvent, useState } from "react";

type Pointer = { x: number; y: number };

type UseHotkeyWindowPointerInteractivityOptions = {
  activationNonce: number | null;
  interactiveRegionRef: RefObject<HTMLElement | null>;
  onInteractiveChange: (isInteractive: boolean) => void;
};

const HOTKEY_WINDOW_FLOATING_UI_SELECTORS = [
  "[data-hotkey-window-floating-ui]",
  "#above-composer-portal > *",
  "[data-radix-popper-content-wrapper] > *",
] as const;

export function useHotkeyWindowPointerInteractivity({
  activationNonce,
  interactiveRegionRef,
  onInteractiveChange,
}: UseHotkeyWindowPointerInteractivityOptions): boolean {
  const [dragReactivationEnabled, setDragReactivationEnabled] = useState(false);
  const publishInteractiveChange = useEffectEvent(
    (isInteractive: boolean): void => {
      setDragReactivationEnabled(!isInteractive);
      onInteractiveChange(isInteractive);
    },
  );
  const resetInteractiveChange = useEffectEvent((): void => {
    onInteractiveChange(true);
  });

  useEffect(() => {
    let lastPublishedInteractive: boolean | null = null;
    let scheduledFrame: number | null = null;
    let pendingPoint: Pointer | null = null;
    let latestPoint: Pointer | null = null;

    const publishPointerInteractive = (isInteractive: boolean): void => {
      if (lastPublishedInteractive === isInteractive) {
        return;
      }
      lastPublishedInteractive = isInteractive;
      publishInteractiveChange(isInteractive);
    };

    const flushPendingPointer = (): void => {
      scheduledFrame = null;
      if (!pendingPoint) {
        return;
      }
      latestPoint = pendingPoint;
      const interactiveRegion = interactiveRegionRef.current;
      if (!interactiveRegion) {
        publishPointerInteractive(true);
        return;
      }
      const isInteractive = isPointerOverVisibleHotkeyWindowUi({
        point: pendingPoint,
        interactiveRegion,
      });
      publishPointerInteractive(isInteractive);
    };

    const schedulePointerEvaluation = (): void => {
      if (scheduledFrame != null) {
        return;
      }
      scheduledFrame = requestAnimationFrame(flushPendingPointer);
    };

    const onMouseMove = (event: MouseEvent): void => {
      pendingPoint = { x: event.clientX, y: event.clientY };
      latestPoint = pendingPoint;
      schedulePointerEvaluation();
    };

    const recheckLatestPoint = (): void => {
      if (!latestPoint) {
        return;
      }
      pendingPoint = latestPoint;
      schedulePointerEvaluation();
    };

    const onMouseLeave = (): void => {
      publishPointerInteractive(false);
    };

    const publishInitialHoverInteractivity = (): void => {
      const interactiveRegion = interactiveRegionRef.current;
      if (!interactiveRegion) {
        return;
      }
      const initialHoverInteractivity =
        getHotkeyWindowHoverInteractivity(interactiveRegion);
      if (initialHoverInteractivity == null) {
        return;
      }
      publishPointerInteractive(initialHoverInteractivity);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", recheckLatestPoint);
    window.addEventListener("scroll", recheckLatestPoint, true);
    window.addEventListener("mouseleave", onMouseLeave);

    const mutationObserver = new MutationObserver(() => {
      recheckLatestPoint();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"],
    });

    publishInitialHoverInteractivity();
    const initialHoverFrame = requestAnimationFrame(
      publishInitialHoverInteractivity,
    );

    return (): void => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", recheckLatestPoint);
      window.removeEventListener("scroll", recheckLatestPoint, true);
      window.removeEventListener("mouseleave", onMouseLeave);
      mutationObserver.disconnect();
      cancelAnimationFrame(initialHoverFrame);
      if (scheduledFrame != null) {
        cancelAnimationFrame(scheduledFrame);
      }
      lastPublishedInteractive = null;
      resetInteractiveChange();
    };
  }, [activationNonce, interactiveRegionRef]);

  return dragReactivationEnabled;
}

function isPointerOverVisibleHotkeyWindowUi({
  point,
  interactiveRegion,
}: {
  point: Pointer;
  interactiveRegion: HTMLElement;
}): boolean {
  if (isPointOverElement(point, interactiveRegion)) {
    return true;
  }

  for (const selector of HOTKEY_WINDOW_FLOATING_UI_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const element of elements) {
      if (!isVisibleInteractiveElement(element)) {
        continue;
      }
      if (isPointOverElement(point, element)) {
        return true;
      }
    }
  }

  return false;
}

function isPointOverElement(point: Pointer, element: HTMLElement): boolean {
  if (!isPointInRect(point, element.getBoundingClientRect())) {
    return false;
  }
  return document.elementsFromPoint(point.x, point.y).some((hitElement) => {
    return hitElement === element || element.contains(hitElement);
  });
}

function getHotkeyWindowHoverInteractivity(
  interactiveRegion: HTMLElement,
): boolean | null {
  if (interactiveRegion.matches(":hover")) {
    return true;
  }

  for (const selector of HOTKEY_WINDOW_FLOATING_UI_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const element of elements) {
      if (!isVisibleInteractiveElement(element)) {
        continue;
      }
      if (element.matches(":hover")) {
        return true;
      }
    }
  }

  if (document.documentElement.matches(":hover")) {
    return false;
  }

  return null;
}

function isVisibleInteractiveElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none"
  ) {
    return false;
  }
  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

function isPointInRect(point: Pointer, rect: DOMRect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}
