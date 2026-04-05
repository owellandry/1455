import { useEffect, useEffectEvent, useRef, useState } from "react";

export type InlineCollapseItem = {
  id: string;
  ref: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  canHideLabel: boolean;
};

export type InlineItemCollapseState = {
  hideLabel: boolean;
  hideControl: boolean;
};

export type InlineItemsCollapseStateById = Record<
  string,
  InlineItemCollapseState
>;

export function useInlineItemCollapse({
  availableWidth,
  containerRef,
  items,
}: {
  availableWidth: number;
  containerRef: React.RefObject<HTMLElement | null>;
  items: Array<InlineCollapseItem>;
}): InlineItemsCollapseStateById {
  const [collapseStateById, setCollapseStateById] =
    useState<InlineItemsCollapseStateById>(() => createCollapseStateMap(items));
  // Cache widths for both visual states so collapse decisions stay stable.
  const expandedWidthByIdRef = useRef(new Map<string, number>());
  const compactWidthByIdRef = useRef(new Map<string, number>());

  const updateCollapsedItems = useEffectEvent((availableWidth: number) => {
    if (containerRef.current == null) {
      return;
    }

    const enabledItems = items.filter((item) => item.enabled);
    const nextCollapseStateById = createCollapseStateMap(items);
    const gapWidth = getFlexGapWidth(containerRef.current);

    if (enabledItems.length === 0) {
      if (!areCollapseMapsEqual(nextCollapseStateById, collapseStateById)) {
        setCollapseStateById(nextCollapseStateById);
      }
      return;
    }

    // Record the width for whichever state the item is currently rendered in.
    enabledItems.forEach((item) => {
      const width = item.ref.current?.offsetWidth ?? null;
      if (width != null && width > 0) {
        const isLabelHidden = collapseStateById[item.id]?.hideLabel === true;
        if (isLabelHidden) {
          compactWidthByIdRef.current.set(item.id, width);
        } else {
          expandedWidthByIdRef.current.set(item.id, width);
        }
      }
    });

    // Normalize widths per item, falling back to whichever state we have measured.
    const measuredWidths = enabledItems.map((item) => {
      const expandedWidth =
        expandedWidthByIdRef.current.get(item.id) ??
        compactWidthByIdRef.current.get(item.id) ??
        0;
      const compactWidthCandidate =
        compactWidthByIdRef.current.get(item.id) ?? expandedWidth;
      const compactWidth = item.canHideLabel
        ? Math.min(expandedWidth, compactWidthCandidate)
        : expandedWidth;

      return {
        item,
        expandedWidth,
        compactWidth,
        hasMeasuredCompactWidth: compactWidthByIdRef.current.has(item.id),
      };
    });

    const totalExpandedWidth =
      measuredWidths.reduce(
        (totalWidth, { expandedWidth }) => totalWidth + expandedWidth,
        0,
      ) +
      gapWidth * Math.max(0, measuredWidths.length - 1);
    if (totalExpandedWidth <= 0) {
      return;
    }

    // Step 1: hide labels first and subtract only the label savings.
    let requiredWidth = totalExpandedWidth;
    measuredWidths.forEach(({ item, expandedWidth, compactWidth }) => {
      if (!item.canHideLabel) {
        return;
      }
      if (availableWidth < requiredWidth) {
        nextCollapseStateById[item.id].hideLabel = true;
        requiredWidth = requiredWidth - (expandedWidth - compactWidth);
      }
    });

    const labelStateChanged = enabledItems.some(
      (item) =>
        nextCollapseStateById[item.id].hideLabel !==
        (collapseStateById[item.id]?.hideLabel === true),
    );
    if (labelStateChanged) {
      // Commit label changes first so compact widths can be measured on the next run.
      if (!areCollapseMapsEqual(nextCollapseStateById, collapseStateById)) {
        setCollapseStateById(nextCollapseStateById);
      }
      return;
    }

    // Step 2: after label visibility is settled, hide whole controls if needed.
    let visibleControlCount = measuredWidths.length;
    measuredWidths.forEach(
      ({ item, expandedWidth, compactWidth, hasMeasuredCompactWidth }) => {
        const controlWidth = nextCollapseStateById[item.id].hideLabel
          ? compactWidth
          : expandedWidth;

        if (
          nextCollapseStateById[item.id].hideLabel &&
          !hasMeasuredCompactWidth
        ) {
          // Wait for the compact render to be measured before hiding the control.
          return;
        }
        if (availableWidth < requiredWidth) {
          nextCollapseStateById[item.id].hideControl = true;
          requiredWidth =
            requiredWidth -
            controlWidth -
            (visibleControlCount > 1 ? gapWidth : 0);
          visibleControlCount -= 1;
        }
      },
    );

    if (!areCollapseMapsEqual(nextCollapseStateById, collapseStateById)) {
      setCollapseStateById(nextCollapseStateById);
    }
  });

  useEffect(() => {
    if (availableWidth <= 0) {
      return;
    }
    updateCollapsedItems(availableWidth);
    // Re-run after collapse state changes because rendered widths may change.
  }, [availableWidth, collapseStateById, items]);

  useEffect(() => {
    if (availableWidth <= 0 || typeof ResizeObserver === "undefined") {
      return;
    }

    const container = containerRef.current;
    if (container == null) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateCollapsedItems(availableWidth);
    });

    observer.observe(container);
    items.forEach((item) => {
      const element = item.ref.current;
      if (element != null) {
        observer.observe(element);
      }
    });

    return (): void => {
      observer.disconnect();
    };
  }, [availableWidth, containerRef, items]);

  return collapseStateById;
}

function createCollapseStateMap(
  items: Array<InlineCollapseItem>,
): InlineItemsCollapseStateById {
  const collapseStateById: InlineItemsCollapseStateById = {};
  items.forEach((item) => {
    collapseStateById[item.id] = {
      hideLabel: false,
      hideControl: false,
    };
  });
  return collapseStateById;
}

function areCollapseMapsEqual(
  left: InlineItemsCollapseStateById,
  right: InlineItemsCollapseStateById,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key]?.hideLabel !== right[key]?.hideLabel) {
      return false;
    }
    if (left[key]?.hideControl !== right[key]?.hideControl) {
      return false;
    }
  }

  return true;
}

function getFlexGapWidth(container: HTMLElement): number {
  if (!(container instanceof HTMLElement)) {
    return 0;
  }

  const { columnGap, gap } = window.getComputedStyle(container);
  return parsePixelValue(columnGap) ?? parsePixelValue(gap) ?? 0;
}

function parsePixelValue(value: string): number | null {
  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}
