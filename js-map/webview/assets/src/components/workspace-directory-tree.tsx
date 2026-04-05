import type { FileTreeOptions, FileTreeSelectionItem } from "@pierre/trees";
import { FileTree } from "@pierre/trees/react";
import { createGitCwd } from "protocol";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { defineMessage, FormattedMessage } from "react-intl";

import {
  ContextMenu,
  type AppContextMenuItem,
} from "@/components/context-menu";
import {
  useResolvedAppearanceMode,
  useResolvedThemeVariant,
} from "@/theme/use-resolved-theme-variant";
import {
  fetchFromVSCode,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

type WorkspaceDirectoryEntry = {
  isSymlink?: boolean;
  name: string;
  path: string;
  type: "directory" | "file";
};

const DIRECTORY_SENTINEL_SUFFIX = "/";

const WORKSPACE_FILE_TREE_UNSAFE_CSS = `
  :host {
    --trees-row-height-override: 28px;
    --trees-font-size-override: 13px;
    --trees-theme-sidebar-bg: var(--color-token-side-bar-background);
    --trees-theme-sidebar-fg: var(--color-token-foreground);
    --trees-theme-sidebar-border: var(--color-token-border);
    --trees-theme-list-hover-bg: var(--color-token-list-hover-background);
    --trees-theme-list-active-selection-bg: var(--color-token-list-active-selection-background);
    --trees-theme-list-active-selection-fg: var(--color-token-list-active-selection-foreground);
    --trees-theme-focus-ring: var(--color-token-list-focus-outline);
  }

  [data-item-type='file']:has([data-item-section='content']:empty) {
    display: none;
  }
`;

const FILE_TREE_OPTIONS: FileTreeOptions = {
  initialFiles: [],
  flattenEmptyDirectories: false,
  id: "workspace-directory-tree",
  search: false,
  sort: false,
  unsafeCSS: WORKSPACE_FILE_TREE_UNSAFE_CSS,
  useLazyDataLoader: true,
};

const addToChatMenuMessage = defineMessage({
  id: "threadSidePanel.workspaceBrowser.addToChat",
  defaultMessage: "Add to chat",
  description:
    "Context menu action for adding a file from the workspace browser to the current chat",
});

export function WorkspaceDirectoryTree({
  root,
  includeHidden,
}: {
  root: string;
  includeHidden: boolean;
}): React.ReactElement {
  return (
    <WorkspaceDirectoryTreeInner
      key={`${root}:${includeHidden ? "hidden" : "visible"}`}
      includeHidden={includeHidden}
      root={root}
    />
  );
}

function WorkspaceDirectoryTreeInner({
  root,
  includeHidden,
}: {
  root: string;
  includeHidden: boolean;
}): React.ReactElement {
  const appearanceMode = useResolvedAppearanceMode();
  const appearanceVariant = useResolvedThemeVariant(appearanceMode);
  const openFile = useMutationFromVSCode("open-file");
  const addContextFile = useMutationFromVSCode("add-context-file");
  const [loadedDirectories, setLoadedDirectories] = useState<
    Record<string, Array<WorkspaceDirectoryEntry>>
  >({});
  const [expandedItems, setExpandedItems] = useState<Array<string>>([]);
  const [loadingDirectories, setLoadingDirectories] = useState<Set<string>>(
    () => new Set(),
  );
  const contextMenuTargetPathRef = useRef<string | null>(null);
  const { data, error, isLoading } = useFetchFromVSCode(
    "workspace-directory-entries",
    {
      params: {
        workspaceRoot: root,
        includeHidden,
      },
    },
  );

  const files = useMemo(() => {
    const paths = new Set<string>();
    const allEntries = [
      ...(data?.entries ?? []),
      ...Object.values(loadedDirectories).flat(),
    ];

    for (const entry of allEntries) {
      if (entry.type === "directory") {
        paths.add(`${entry.path}${DIRECTORY_SENTINEL_SUFFIX}`);
        continue;
      }
      paths.add(entry.path);
    }

    return Array.from(paths);
  }, [data?.entries, loadedDirectories]);
  const fileTreeItemIdToPath = useMemo(
    () => buildFileTreeItemIdToPath(files),
    [files],
  );

  const handleExpandedItemsChange = async (
    nextExpandedItems: Array<string>,
  ): Promise<void> => {
    setExpandedItems(nextExpandedItems);

    const directoriesToLoad = nextExpandedItems.filter(
      (directoryPath) =>
        directoryPath.length > 0 &&
        !(directoryPath in loadedDirectories) &&
        !(directoryPath in loadingDirectories),
    );

    if (directoriesToLoad.length === 0) {
      return;
    }

    setLoadingDirectories((current) => {
      const next = new Set([...current, ...directoriesToLoad]);
      return next;
    });

    const results = await Promise.all(
      directoriesToLoad.map(async (directoryPath) => {
        try {
          const response = await fetchFromVSCode(
            "workspace-directory-entries",
            {
              params: {
                workspaceRoot: root,
                directoryPath,
                includeHidden,
              },
            },
          );
          return {
            directoryPath,
            entries: response.entries,
            error: null,
          };
        } catch (directoryError) {
          return {
            directoryPath,
            entries: null,
            error:
              directoryError instanceof Error
                ? directoryError.message
                : String(directoryError),
          };
        }
      }),
    );

    setLoadedDirectories((current) => {
      const next = { ...current };
      for (const result of results) {
        if (result.entries != null) {
          next[result.directoryPath] = result.entries;
        }
      }
      return next;
    });
    setLoadingDirectories((current) => {
      const next = new Set(current);
      for (const directoryPath of directoriesToLoad) {
        next.delete(directoryPath);
      }
      return next;
    });
  };

  const handleFileTreeContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      const nextPath = getFileTreePathFromMouseEvent(
        event.nativeEvent,
        fileTreeItemIdToPath,
      );
      contextMenuTargetPathRef.current = nextPath;
    },
    [fileTreeItemIdToPath],
  );

  const getContextMenuItems = useCallback((): Array<AppContextMenuItem> => {
    const targetPath = contextMenuTargetPathRef.current;
    if (!targetPath) {
      return [];
    }
    return [
      {
        id: "add-to-chat",
        message: addToChatMenuMessage,
        onSelect: (): void => {
          void addContextFile.mutateAsync({ path: targetPath });
        },
      },
    ];
  }, [addContextFile]);

  if (error) {
    return (
      <div className="px-3 py-2 text-xs text-token-error-foreground">
        {error.message}
      </div>
    );
  }

  if (isLoading && data == null) {
    return (
      <div className="px-3 py-2 text-xs text-token-description-foreground">
        <FormattedMessage
          id="threadSidePanel.workspaceBrowser.loading"
          defaultMessage="Loading directory entries..."
          description="Loading message shown while the workspace file browser is fetching a directory"
        />
      </div>
    );
  }

  if ((data?.entries.length ?? 0) === 0) {
    return (
      <div className="px-3 py-2 text-xs text-token-description-foreground">
        <FormattedMessage
          id="threadSidePanel.workspaceBrowser.empty"
          defaultMessage="Empty folder"
          description="Empty state shown when a workspace directory contains no visible entries"
        />
      </div>
    );
  }

  return (
    <ContextMenu getItems={getContextMenuItems}>
      <div onContextMenu={handleFileTreeContextMenu}>
        <FileTree
          expandedItems={expandedItems}
          files={files}
          onExpandedItemsChange={(items) => {
            void handleExpandedItemsChange(items);
          }}
          onSelection={(items) => {
            handleWorkspaceDirectorySelection(items, (path) => {
              openFile.mutate({
                cwd: createGitCwd(root),
                path,
              });
            });
          }}
          options={FILE_TREE_OPTIONS}
          style={{
            backgroundColor: "transparent",
            color: "var(--color-token-foreground)",
            colorScheme: appearanceVariant,
          }}
        />
      </div>
    </ContextMenu>
  );
}

type FileTreeItemDatasetTarget = EventTarget & {
  getAttribute?: (name: string) => string | null;
};

function getFileTreePathFromMouseEvent(
  event: MouseEvent,
  itemIdToPath: ReadonlyMap<string, string>,
): string | null {
  const eventPath = event.composedPath();
  for (const pathEntry of eventPath) {
    const target = pathEntry as FileTreeItemDatasetTarget;
    const itemType = target.getAttribute?.("data-item-type");
    if (itemType !== "file") {
      continue;
    }
    const itemId = target.getAttribute?.("data-item-id");
    if (!itemId) {
      continue;
    }
    return itemIdToPath.get(itemId) ?? null;
  }
  return null;
}

function buildFileTreeItemIdToPath(
  files: Array<string>,
): ReadonlyMap<string, string> {
  const itemIdToPath = new Map<string, string>();
  for (const path of files) {
    if (path.endsWith(DIRECTORY_SENTINEL_SUFFIX)) {
      continue;
    }
    itemIdToPath.set(hashFileTreeItemId(path), path);
  }
  return itemIdToPath;
}

/* oxlint-disable no-bitwise -- Mirrors @pierre/trees internal hashId implementation for DOM item IDs. */
function hashFileTreeItemId(path: string): string {
  let h1 = 3735928559 ^ path.length;
  let h2 = 1103547991 ^ path.length;
  for (let i = 0; i < path.length; i += 1) {
    const char = path.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `n${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
}
/* oxlint-enable no-bitwise */

function handleWorkspaceDirectorySelection(
  items: Array<FileTreeSelectionItem>,
  onSelectPath: (path: string) => void,
): void {
  const selectedFile = items.find(
    (item) => !item.isFolder && !item.path.endsWith(DIRECTORY_SENTINEL_SUFFIX),
  );

  if (selectedFile == null) {
    return;
  }

  onSelectPath(selectedFile.path);
}
