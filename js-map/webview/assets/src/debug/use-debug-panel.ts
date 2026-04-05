import React, { useCallback, useEffect, useRef } from "react";

type DebugLineContent = {
  label: string;
  value: string;
};

export type DebugPanelEntry =
  | {
      title: React.ReactNode;
      lines: Array<DebugLineContent>;
    }
  | {
      title: React.ReactNode;
      lines: Array<DebugLineContent>;
    };

type SafeDebugPanelEntry = {
  id: string;
  titleText: string;
  lines: Array<DebugLineContent>;
};

export type DebugPanelMessage =
  | { kind: "add"; id: string; entry: SafeDebugPanelEntry }
  | { kind: "remove"; id: string }
  | { kind: "request-sync" }
  | { kind: "clear" };

export const debugPanelChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("codex-debug-panel")
    : null;

export function clearDebugPanel(): void {
  debugPanelChannel?.postMessage({ kind: "clear" });
}

function toSafeEntry(id: string, entry: DebugPanelEntry): SafeDebugPanelEntry {
  const titleText =
    typeof entry.title === "string"
      ? entry.title
      : React.isValidElement(entry.title)
        ? ""
        : "[non-serializable title]";
  return {
    id,
    titleText,
    lines: entry.lines,
  };
}

/**
 * Registers content for the debug page while the calling component is mounted.
 */
export function useDebugPanel(entry: DebugPanelEntry): void {
  const entryRef = useRef<{
    id: string;
    entry: DebugPanelEntry;
  }>({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `debug-panel-${String(Symbol("entry"))}`,
    entry,
  });
  const broadcastEntry = useCallback((safe: SafeDebugPanelEntry): void => {
    debugPanelChannel?.postMessage({
      kind: "add",
      id: entryRef.current.id,
      entry: safe,
    });
  }, []);

  useEffect(() => {
    entryRef.current = { ...entryRef.current, entry };
    const safeEntry = toSafeEntry(entryRef.current.id, entry);
    broadcastEntry(safeEntry);
    return (): void => {
      debugPanelChannel?.postMessage({
        kind: "remove",
        id: entryRef.current.id,
      });
    };
  }, [broadcastEntry, entry]);

  useEffect(() => {
    if (!debugPanelChannel) {
      return;
    }
    const handleSync = (event: MessageEvent<DebugPanelMessage>): void => {
      if (event.data?.kind !== "request-sync") {
        return;
      }
      broadcastEntry(toSafeEntry(entryRef.current.id, entryRef.current.entry));
    };
    debugPanelChannel.addEventListener("message", handleSync);
    return (): void => {
      debugPanelChannel.removeEventListener("message", handleSync);
    };
  }, [broadcastEntry]);
}
