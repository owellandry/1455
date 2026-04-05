import {
  expandImplicitParentDirectories,
  type FileTreeSelectionItem,
} from "@pierre/trees";
import { FileTree } from "@pierre/trees/react";
import clsx from "clsx";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import XIcon from "@/icons/x.svg";
import {
  useResolvedAppearanceMode,
  useResolvedThemeVariant,
} from "@/theme/use-resolved-theme-variant";

const REVIEW_FILE_TREE_UNSAFE_CSS = `
  :host {
    --trees-row-height-override: 28px;
    --trees-font-size-override: 13px;
    --trees-theme-sidebar-bg: var(--color-token-main-surface-primary);
    --trees-theme-sidebar-fg: var(--color-token-foreground);
    --trees-theme-sidebar-border: var(--color-token-panel-border);
    --trees-theme-list-hover-bg: var(--color-token-list-hover-background);
    --trees-theme-list-active-selection-bg: var(--color-token-list-active-selection-background);
    --trees-theme-list-active-selection-fg: var(--color-token-list-active-selection-foreground);
    --trees-theme-focus-ring: var(--color-token-list-focus-outline);
    --trees-theme-input-bg: var(--color-token-input-background);
    --trees-theme-input-border: var(--color-token-input-border);
    --trees-theme-git-added-fg: var(--color-token-git-decoration-added-resource-foreground);
    --trees-theme-git-modified-fg: var(--color-token-git-decoration-modified-resource-foreground);
    --trees-theme-git-deleted-fg: var(--color-token-git-decoration-deleted-resource-foreground);
  }
`;

export function ReviewFileSearch({
  onQueryChange,
  searchQuery,
}: {
  onQueryChange: (query: string) => void;
  searchQuery: string;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <div className="relative flex w-full items-center gap-1.5 rounded-md border-[0.5px] border-token-border bg-token-input-background text-sm">
      <label className="sr-only" htmlFor="review-file-search">
        <FormattedMessage
          id="codex.review.fileSearch.label"
          defaultMessage="Filter files"
          description="Label for the review file tree filter input"
        />
      </label>
      <input
        id="review-file-search"
        className="w-full appearance-none border-none bg-transparent p-1.5 text-token-foreground ring-0 outline-none placeholder:text-token-input-placeholder-foreground focus:border-none focus:ring-0 focus:outline-none"
        type="text"
        value={searchQuery}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={intl.formatMessage({
          id: "codex.review.fileSearch.placeholder",
          defaultMessage: "Filter files…",
          description: "Placeholder text for the review file tree filter input",
        })}
      />
      {searchQuery.length > 0 ? (
        <Button
          aria-label={intl.formatMessage({
            id: "codex.review.fileSearch.clear",
            defaultMessage: "Clear file filter",
            description: "Button label to clear the review file filter input",
          })}
          className="text-token-input-placeholder-foreground hover:text-token-foreground"
          color="ghost"
          size="icon"
          onClick={() => onQueryChange("")}
        >
          <XIcon className="icon-2xs" />
        </Button>
      ) : null}
    </div>
  );
}

export function ReviewFileTreePane({
  activePath,
  entriesCount,
  isOpen,
  isReviewExpanded,
  onQueryChange,
  onSelectPath,
  paths,
  searchQuery,
}: {
  activePath: string | undefined;
  entriesCount: number;
  isOpen: boolean;
  isReviewExpanded: boolean;
  onQueryChange: (query: string) => void;
  onSelectPath: (path: string) => void;
  paths: Array<string>;
  searchQuery: string;
}): React.ReactElement {
  const appearanceMode = useResolvedAppearanceMode();
  const appearanceVariant = useResolvedThemeVariant(appearanceMode);
  const expandedItems = expandImplicitParentDirectories(paths);
  const treeOptions = useMemo(() => {
    return {
      fileTreeSearchMode: "hide-non-matches" as const,
      flattenEmptyDirectories: true,
      id: "review-file-tree",
      search: false,
      sort: false,
      unsafeCSS: REVIEW_FILE_TREE_UNSAFE_CSS,
    };
  }, []);
  const selectedItems =
    activePath != null && paths.includes(activePath) ? [activePath] : undefined;

  return (
    <div id="file-tree" className="flex h-full min-h-0 flex-col pr-2">
      <div className="shrink-0 pr-2 pb-1">
        <ReviewFileSearch
          onQueryChange={onQueryChange}
          searchQuery={searchQuery}
        />
      </div>
      <div
        className={clsx(
          "bg-token-main-surface-primary flex-1 overflow-x-hidden overflow-y-auto pt-1",
          isReviewExpanded ? "pb-40" : null,
        )}
      >
        {entriesCount > 0 ? (
          <FileTree
            className="min-h-full"
            files={paths}
            initialExpandedItems={expandedItems}
            key={isOpen ? "open" : "closed"}
            onSelection={(items) =>
              handleFileTreeSelection(items, activePath, onSelectPath)
            }
            options={treeOptions}
            selectedItems={selectedItems}
            style={{
              backgroundColor: "var(--color-token-main-surface-primary)",
              color: "var(--color-token-foreground)",
              colorScheme: appearanceVariant,
            }}
          />
        ) : (
          <FilteredFilesEmptyState />
        )}
      </div>
    </div>
  );
}

export function FilteredFilesEmptyState({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx("text-token-foreground-muted py-2 text-sm", className)}
    >
      <FormattedMessage
        id="codex.review.fileSearch.empty"
        defaultMessage="No matching files"
        description="Empty state shown when the file filter hides all files in review"
      />
    </div>
  );
}

function handleFileTreeSelection(
  items: Array<FileTreeSelectionItem>,
  activePath: string | undefined,
  onSelectPath: (path: string) => void,
): void {
  const selectedFile = items.find((item) => !item.isFolder);
  if (selectedFile == null) {
    return;
  }
  if (selectedFile.path === activePath) {
    return;
  }

  onSelectPath(selectedFile.path);
}
