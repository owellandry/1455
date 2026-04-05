import { useScope } from "maitai";
import { useLayoutEffect, useRef } from "react";
import {
  type NavigationType,
  useLocation,
  useNavigationType,
} from "react-router";

import { AppScope } from "@/scopes/app-scope";

import { canGoBack$, canGoForward$ } from "./navigation-history-signal";

type NavigationHistory = {
  entries: Array<string>;
  index: number;
};

export function NavigationHistorySignalBridge(): null {
  const scope = useScope(AppScope);
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigationHistoryRef = useRef<NavigationHistory>({
    entries: [location.key],
    index: 0,
  });
  const navigationHistory = getNextNavigationHistory(
    navigationHistoryRef.current,
    location.key,
    navigationType,
  );
  navigationHistoryRef.current = navigationHistory;

  useLayoutEffect(() => {
    scope.set(canGoBack$, navigationHistory.index > 0);
    scope.set(
      canGoForward$,
      navigationHistory.index < navigationHistory.entries.length - 1,
    );
  }, [navigationHistory, scope]);

  return null;
}

function getNextNavigationHistory(
  current: NavigationHistory,
  locationKey: string,
  navigationType: NavigationType,
): NavigationHistory {
  if (current.entries[current.index] === locationKey) {
    return current;
  }

  if (navigationType === "PUSH") {
    const entries = current.entries.slice(0, current.index + 1);
    entries.push(locationKey);
    return { entries, index: entries.length - 1 };
  }

  if (navigationType === "REPLACE") {
    const entries = current.entries.slice();
    entries[current.index] = locationKey;
    return { entries, index: current.index };
  }

  if (navigationType === "POP") {
    const nextIndex = current.entries.indexOf(locationKey);
    if (nextIndex !== -1) {
      return { entries: current.entries, index: nextIndex };
    }

    const entries = current.entries.slice(0, current.index + 1);
    entries.push(locationKey);
    return { entries, index: entries.length - 1 };
  }

  throw new Error("Unhandled navigation type");
}
