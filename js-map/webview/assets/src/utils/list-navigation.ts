import type {
  Dispatch,
  MouseEvent,
  MouseEventHandler,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  SetStateAction,
} from "react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

type ListNavigationOptions<T> = {
  items: ReadonlyArray<T>;
  isActive: boolean;
  onSelect: (item: T, index: number) => void;
  onHighlight?: (item: T | null, index: number) => void;
  onEscape?: () => void;
  autoHighlightFirst?: boolean;
  captureWindowKeydown?: boolean;
  preserveHighlightOnItemsChange?: boolean;
};

type InputPropsOptions = {
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
};

type ItemPropsOptions = {
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
};

type ListNavigationResult = {
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  listRef: RefObject<HTMLDivElement | null>;
  handleKeyDown: (event: KeyboardEvent | ReactKeyboardEvent) => boolean;
  getInputProps: (options?: InputPropsOptions) => {
    onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  };
  getItemProps: (
    index: number,
    options?: ItemPropsOptions,
  ) => {
    onClick: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    onMouseEnter: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    "aria-selected": boolean;
    "data-list-navigation-item": "true";
  };
};

function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1;
  }
  const normalized = index % length;
  return normalized < 0 ? normalized + length : normalized;
}

/**
 * Navigates a list of items with the keyboard.
 * Spread input props and item props onto the corresponding elements.
 */
export function useListNavigation<T>(
  options: ListNavigationOptions<T>,
): ListNavigationResult {
  const {
    items,
    isActive,
    onSelect,
    onHighlight,
    onEscape,
    autoHighlightFirst = true,
    captureWindowKeydown = false,
    preserveHighlightOnItemsChange = false,
  } = options;
  const onHighlightEvent = useEffectEvent(
    (item: T | null, index: number): void => {
      onHighlight?.(item, index);
    },
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const previousItemsRef = useRef<ReadonlyArray<T> | null>(null);
  const itemsCount = items.length;

  const [highlightedIndex, setHighlightedIndex] = useState<number>(
    autoHighlightFirst && itemsCount > 0 ? 0 : -1,
  );
  useEffect(() => {
    const previousItems = previousItemsRef.current;
    const itemsChanged =
      previousItems != null &&
      (previousItems.length !== itemsCount ||
        previousItems.some((item, index) => item !== items[index]));

    previousItemsRef.current = items;

    if (!isActive) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setHighlightedIndex(-1);
      return;
    }

    if (itemsCount === 0) {
      setHighlightedIndex(-1);
      return;
    }

    setHighlightedIndex((prev) => {
      if (
        prev >= 0 &&
        prev < itemsCount &&
        (preserveHighlightOnItemsChange || !itemsChanged)
      ) {
        return prev;
      }
      return autoHighlightFirst ? 0 : -1;
    });
  }, [
    autoHighlightFirst,
    isActive,
    items,
    itemsCount,
    preserveHighlightOnItemsChange,
  ]);

  useEffect(() => {
    if (!isActive || highlightedIndex < 0 || highlightedIndex >= itemsCount) {
      onHighlightEvent(null, -1);
      return;
    }

    onHighlightEvent(items[highlightedIndex] ?? null, highlightedIndex);
  }, [highlightedIndex, isActive, items, itemsCount]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (highlightedIndex < 0 || highlightedIndex >= itemsCount) {
      return;
    }

    const container = listRef.current;
    if (!container) {
      return;
    }

    const itemElements = container.querySelectorAll<HTMLElement>(
      '[data-list-navigation-item="true"]',
    );
    const element = itemElements.item(highlightedIndex);
    element?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isActive, itemsCount]);

  const selectByIndex = useCallback(
    (index: number) => {
      const item = index >= 0 && index < itemsCount ? items[index] : undefined;
      if (!item) {
        return;
      }
      setHighlightedIndex(index);
      onSelect(item, index);
    },
    [items, itemsCount, onSelect],
  );

  const moveHighlight = useCallback(
    (delta: number) => {
      setHighlightedIndex((prev) => {
        if (itemsCount === 0) {
          return -1;
        }

        if (prev < 0) {
          return delta >= 0 ? 0 : itemsCount - 1;
        }

        return wrapIndex(prev + delta, itemsCount);
      });
    },
    [itemsCount],
  );

  const stopEvent = useCallback(
    (event: KeyboardEvent | ReactKeyboardEvent): void => {
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | ReactKeyboardEvent): boolean => {
      if (!isActive) {
        return false;
      }

      const { key } = event;

      if (itemsCount === 0) {
        if (key === "Escape" && onEscape) {
          onEscape();
          stopEvent(event);
          return true;
        }
        return false;
      }

      if (key === "ArrowDown") {
        moveHighlight(1);
        stopEvent(event);
        return true;
      }

      if (key === "ArrowUp") {
        moveHighlight(-1);
        stopEvent(event);
        return true;
      }

      if (key === "Enter") {
        const index =
          highlightedIndex >= 0
            ? highlightedIndex
            : autoHighlightFirst
              ? 0
              : -1;
        if (index >= 0 && index < itemsCount) {
          selectByIndex(index);
          stopEvent(event);
          return true;
        }
        return false;
      }

      if (key === "Escape") {
        if (!onEscape) {
          return false;
        }
        onEscape();
        stopEvent(event);
        return true;
      }

      return false;
    },
    [
      autoHighlightFirst,
      highlightedIndex,
      isActive,
      itemsCount,
      moveHighlight,
      onEscape,
      selectByIndex,
      stopEvent,
    ],
  );

  useEffect(() => {
    if (!captureWindowKeydown || !isActive) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      handleKeyDown(event);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [captureWindowKeydown, handleKeyDown, isActive]);

  const getInputProps = useCallback(
    (props: InputPropsOptions = {}) => ({
      onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        const handled = handleKeyDown(event);
        if (!handled) {
          props.onKeyDown?.(event);
        }
      },
    }),
    [handleKeyDown],
  );

  const getItemProps = useCallback(
    (index: number, props: ItemPropsOptions = {}) => ({
      onClick: (
        event: MouseEvent<HTMLButtonElement | HTMLDivElement>,
      ): void => {
        selectByIndex(index);
        props.onClick?.(event);
      },
      onMouseEnter: (
        event: MouseEvent<HTMLButtonElement | HTMLDivElement>,
      ): void => {
        if (isActive && index >= 0 && index < itemsCount) {
          setHighlightedIndex(index);
        }
        props.onMouseEnter?.(event);
      },
      "aria-selected": index === highlightedIndex,
      "data-list-navigation-item": "true" as const,
    }),
    [highlightedIndex, isActive, itemsCount, selectByIndex],
  );

  return {
    highlightedIndex,
    setHighlightedIndex,
    listRef,
    handleKeyDown,
    getInputProps,
    getItemProps,
  };
}
