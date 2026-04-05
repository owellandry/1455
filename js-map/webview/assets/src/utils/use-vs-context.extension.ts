import type React from "react";
import { useEffect, useRef } from "react";

import { WebFetchWrapper } from "@/web-fetch-wrapper";

/**
 * useFocusVsContext
 * Composition hook that binds a container's focus state to a VS Code context key.
 * Returns a ref to attach to the container.
 */
export function useFocusVsContext<T extends HTMLElement = HTMLElement>(
  contextKey: string,
  options?: {
    activeValue?: string | boolean;
    inactiveValue?: string | boolean | undefined;
  },
): React.RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const activeValue = options?.activeValue ?? true;
  const inactiveValue = options?.inactiveValue ?? false;
  // Track last-sent focus state without triggering re-renders
  const lastIsFocusedRef = useRef<boolean | null>(null);

  // Bind focus listeners directly and dispatch without React state
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const computeHasFocus = (): boolean => {
      if (typeof document === "undefined") {
        return false;
      }
      const active = (document.activeElement as Element | null) ?? null;
      return !!active && el.contains(active);
    };

    const setVsContextFocused = (focused: boolean): void => {
      if (lastIsFocusedRef.current === focused) {
        return;
      }
      lastIsFocusedRef.current = focused;
      void WebFetchWrapper.getInstance().post(
        "vscode://codex/set-vs-context",
        JSON.stringify({
          key: contextKey,
          value: focused ? activeValue : inactiveValue,
        }),
      );
    };

    // Initialize based on current active element
    setVsContextFocused(computeHasFocus());

    const onFocusIn = (): void => {
      setVsContextFocused(true);
    };

    const onFocusOut = (event: FocusEvent): void => {
      const related = event.relatedTarget as Node | null;
      if (related) {
        setVsContextFocused(el.contains(related));
        return;
      }
      setVsContextFocused(computeHasFocus());
    };

    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return (): void => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      // On unmount, ensure context is cleared
      void WebFetchWrapper.getInstance().post(
        "vscode://codex/set-vs-context",
        JSON.stringify({ key: contextKey, value: inactiveValue }),
      );
      lastIsFocusedRef.current = null;
    };
  }, [contextKey, activeValue, inactiveValue]);

  return containerRef;
}
