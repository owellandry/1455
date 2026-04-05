import type { OpenInTarget } from "protocol";
import { useCallback, useMemo } from "react";

import {
  ContextMenu,
  type AppContextMenuItem,
} from "@/components/context-menu";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

type TargetApp = {
  id: OpenInTarget;
  label: string;
  icon: string;
};

/**
 * Builds code diff context menu options and tracks selection for native/Radix menus.
 */
function useCodeDiffContextMenu({
  visibleTargets,
  primaryTarget,
  canOpenFile,
  onRequestChanges,
  onCopyPath,
  onToggleWrap,
  primaryOpenAction,
  handleOpenInTarget,
}: {
  visibleTargets: Array<TargetApp>;
  primaryTarget: TargetApp | null;
  canOpenFile: boolean;
  onRequestChanges: () => void;
  onCopyPath: () => void;
  onToggleWrap: () => void;
  primaryOpenAction: (() => void) | null;
  handleOpenInTarget: (targetId: OpenInTarget) => void;
}): {
  getItems: () => Array<AppContextMenuItem>;
} {
  const baseItems = useMemo(() => {
    const items: Array<AppContextMenuItem> = [
      {
        id: "request-changes",
        message: {
          id: "wham.diff.contextMenu.requestChanges",
          defaultMessage: "Request changes",
          description:
            "Context menu option for requesting changes on a diff file",
        },
        onSelect: onRequestChanges,
      },
    ];

    if (primaryTarget) {
      items.push({
        id: "open-primary",
        message: {
          id: "wham.diff.contextMenu.openInTarget",
          defaultMessage: "Open in {target}",
          description:
            "Context menu option to open a file in the primary target",
        },
        messageValues: { target: primaryTarget.label },
        icon: primaryTarget.icon,
        onSelect: primaryOpenAction ?? undefined,
      });

      items.push({
        id: "open-with",
        message: {
          id: "wham.diff.contextMenu.openWith",
          defaultMessage: "Open with",
          description: "Context menu option to select an alternate open target",
        },
        submenu: visibleTargets.map((target) => ({
          id: target.id,
          message: {
            id: "wham.diff.contextMenu.openInTarget",
            defaultMessage: "{target}",
            description: "Context menu option to open a file in the target app",
          },
          messageValues: { target: target.label },
          icon: target.icon,
          onSelect: (): void => handleOpenInTarget(target.id),
        })),
      });
    }

    if (primaryTarget) {
      items.push({ id: "section-separator-1", type: "separator" });
    }

    items.push(
      {
        id: "copy-selection",
        message: {
          id: "wham.diff.contextMenu.copySelection",
          defaultMessage: "Copy selection",
          description: "Context menu option to copy selected text",
        },
        enabled: false,
      },
      {
        id: "copy-path",
        message: {
          id: "wham.diff.contextMenu.copyPath",
          defaultMessage: "Copy path",
          description: "Context menu option to copy the file path",
        },
        enabled: canOpenFile,
        onSelect: onCopyPath,
      },
      {
        id: "toggle-wrap",
        message: {
          id: "wham.diff.contextMenu.toggleWrap",
          defaultMessage: "Toggle line wrap",
          description:
            "Context menu option to toggle line wrapping in the diff view",
        },
        onSelect: onToggleWrap,
      },
    );

    return items;
  }, [
    canOpenFile,
    handleOpenInTarget,
    onCopyPath,
    onRequestChanges,
    onToggleWrap,
    primaryOpenAction,
    primaryTarget,
    visibleTargets,
  ]);

  const handleBeforeOpen = useCallback((): Array<AppContextMenuItem> => {
    const selection = window.getSelection()?.toString()?.trim() ?? "";
    const selectionAvailable = Boolean(selection);
    const handleCopySelection = (): void => {
      if (!selectionAvailable) {
        return;
      }
      void copyToClipboard(selection);
    };
    return baseItems.map((item) =>
      item.id === "copy-selection"
        ? {
            ...item,
            enabled: selectionAvailable,
            onSelect: handleCopySelection,
          }
        : item,
    );
  }, [baseItems]);

  return { getItems: handleBeforeOpen };
}

/**
 * Wrapper that wires the code diff menu into the shared ContextMenu component.
 */
export function CodeDiffContextMenu({
  children,
  disableNative,
  ...hookProps
}: {
  children: React.ReactElement;
  disableNative?: boolean;
} & Parameters<typeof useCodeDiffContextMenu>[0]): React.ReactElement {
  const { getItems } = useCodeDiffContextMenu(hookProps);
  return (
    <ContextMenu getItems={getItems} disableNative={disableNative}>
      {children}
    </ContextMenu>
  );
}
