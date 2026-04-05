import path from "path";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import type { VSCodeFetchRequest } from "protocol";
import { type ReactElement, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import FolderIcon from "@/icons/folder.svg";
import UndoIcon from "@/icons/undo.svg";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { fetchFromVSCode, getQueryKey, useFetchFromVSCode } from "@/vscode-api";

type RemoteWorkspaceDirectoryListing =
  VSCodeFetchRequest["remote-workspace-directory-entries"]["response"];

type RemoteWorkspaceDirectoryEntry =
  RemoteWorkspaceDirectoryListing["entries"][number];

export function RemoteCwdPicker({
  hostId,
  initialDirectoryPath,
  selectedPath,
  setSelectedPath,
}: {
  hostId: string;
  initialDirectoryPath?: string | null;
  selectedPath: string;
  setSelectedPath: (value: string) => void;
}): ReactElement {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [currentDirectoryPath, setCurrentDirectoryPath] = useState(
    initialDirectoryPath?.trim() ?? "",
  );
  const requestedDirectoryPath =
    currentDirectoryPath.length === 0 ? null : currentDirectoryPath;
  const { data, error, isLoading } = useFetchFromVSCode(
    "remote-workspace-directory-entries",
    {
      params: {
        hostId,
        directoryPath: requestedDirectoryPath,
        directoriesOnly: true,
      },
      queryConfig: {
        cacheKey: [hostId, requestedDirectoryPath?.trim() ?? ""],
        enabled: true,
        staleTime: 0,
      },
    },
  );
  const displayedDirectoryPath =
    requestedDirectoryPath || data?.directoryPath || "";
  const matchesDisplayedDirectory =
    data?.directoryPath === displayedDirectoryPath;
  const directoryEntries = matchesDisplayedDirectory ? data?.entries : null;
  const entries = directoryEntries ?? [];
  const shouldShowSelectedPathInHeader = entries.some(
    (entry) => entry.path === selectedPath,
  );
  const displayedPathLabel = shouldShowSelectedPathInHeader
    ? selectedPath
    : displayedDirectoryPath;
  const navigationSourcePath = selectedPath || displayedDirectoryPath;
  const parentPath = getParentDirectoryPath(navigationSourcePath);
  const isEnclosingFolderDisabled = isLoading || parentPath == null;
  const enclosingFolderLabel = intl.formatMessage({
    id: "remoteCwdPicker.up",
    defaultMessage: "Enclosing folder",
    description:
      "Button label for moving the remote cwd picker to the parent directory",
  });
  const selectedFolderPathLabel = intl.formatMessage({
    id: "remoteCwdPicker.selectedPath",
    defaultMessage: "Selected folder path",
    description:
      "Accessible label for the disabled input showing the current remote folder path",
  });

  function openDirectoryWithoutChangingSelection(directoryPath: string): void {
    setCurrentDirectoryPath(directoryPath);
  }

  useEffect(() => {
    if (
      !matchesDisplayedDirectory ||
      directoryEntries == null ||
      directoryEntries.length === 0
    ) {
      return;
    }

    void Promise.all(
      directoryEntries.map((entry) =>
        queryClient.prefetchQuery({
          queryKey: getQueryKey(
            "remote-workspace-directory-entries",
            {
              hostId,
              directoryPath: entry.path,
              directoriesOnly: true,
            },
            [hostId, entry.path.trim()],
          ),
          queryFn: () =>
            fetchFromVSCode("remote-workspace-directory-entries", {
              params: {
                hostId,
                directoryPath: entry.path,
                directoriesOnly: true,
              },
            }),
          staleTime: QUERY_STALE_TIME.INFINITE,
        }),
      ),
    );
  }, [directoryEntries, hostId, matchesDisplayedDirectory, queryClient]);

  return (
    <div className="flex h-70 min-h-56 flex-col gap-3">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mt-1 mb-2 flex min-w-0 items-center gap-1">
          <Button
            className="shrink-0"
            color="ghost"
            size="composerSm"
            uniform
            type="button"
            aria-label={enclosingFolderLabel}
            disabled={isEnclosingFolderDisabled}
            onClick={() => {
              if (parentPath == null) {
                return;
              }
              setSelectedPath(parentPath);
              setCurrentDirectoryPath(parentPath);
            }}
          >
            <UndoIcon className="icon-2xs" />
          </Button>
          <input
            aria-label={selectedFolderPathLabel}
            className="w-full min-w-0 flex-1 rounded-md border border-token-input-border bg-token-input-background px-2.5 py-1.5 text-sm text-token-input-foreground outline-none disabled:bg-token-foreground/5 disabled:text-token-text-secondary disabled:opacity-100"
            disabled
            readOnly
            spellCheck={false}
            title={displayedPathLabel}
            value={displayedPathLabel}
          />
        </div>
        <div
          className={clsx(
            "min-h-0 flex-1",
            "bg-token-input-background border-token-input-border flex overflow-y-auto rounded-lg border",
          )}
        >
          {isLoading && data == null ? (
            <div className="flex w-full items-center justify-center px-4 text-sm text-token-description-foreground">
              <FormattedMessage
                id="remoteCwdPicker.loading"
                defaultMessage="Loading folder contents…"
                description="Message shown while the remote cwd picker is loading the current folder contents"
              />
            </div>
          ) : error || data == null ? (
            <div className="flex w-full items-center justify-center px-4 text-sm text-token-description-foreground">
              <FormattedMessage
                id="remoteCwdPicker.loadError"
                defaultMessage="Unable to load folder contents: {errorMessage}"
                description="Message shown when the remote cwd picker cannot load the current folder contents"
                values={{
                  errorMessage: error?.message,
                }}
              />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex w-full items-center justify-center px-4 text-sm text-token-description-foreground">
              <FormattedMessage
                id="remoteCwdPicker.empty"
                defaultMessage="No folders found in this directory."
                description="Message shown when the current remote directory has no folders to choose from"
              />
            </div>
          ) : (
            <div className="flex w-full flex-col py-1">
              {entries.map((entry) => (
                <DirectoryEntryRow
                  key={entry.path}
                  entry={entry}
                  isSelected={entry.path === selectedPath}
                  disabled={isLoading}
                  onOpen={() => {
                    openDirectoryWithoutChangingSelection(entry.path);
                  }}
                  onSelect={() => {
                    setSelectedPath(entry.path);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getParentDirectoryPath(selectedPath: string): string | null {
  if (selectedPath.length === 0) {
    return null;
  }

  const parentDirectory = path.posix.dirname(selectedPath);
  if (parentDirectory === "." || parentDirectory === selectedPath) {
    return null;
  }

  return parentDirectory;
}

function DirectoryEntryRow({
  entry,
  isSelected,
  disabled,
  onOpen,
  onSelect,
}: {
  entry: RemoteWorkspaceDirectoryEntry;
  isSelected: boolean;
  disabled: boolean;
  onOpen: () => void;
  onSelect: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={clsx(
        "flex w-full min-w-0 self-stretch items-center gap-2 px-3 py-1.5 text-left text-sm",
        !disabled && "hover:bg-token-foreground/5",
        disabled && "cursor-not-allowed opacity-50",
        isSelected && "bg-token-foreground/10",
      )}
      disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      onDoubleClick={onOpen}
    >
      <FolderIcon className="icon-xs shrink-0 text-token-description-foreground" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}
