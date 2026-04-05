import { useState, type ReactElement, type ReactNode } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import {
  Dropdown,
  DropdownItem,
  DropdownSearchInput,
} from "@/components/dropdown";
import { WithWindow } from "@/components/with-window";
import { WorkspaceRootIcon } from "@/components/workspace-root-icon";
import CheckMdIcon from "@/icons/check-md.svg";
import AddFolderIcon from "@/icons/folder-plus.svg";
import GlobeIcon from "@/icons/globe.svg";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import { formatPathFromLastSharedSegment } from "@/utils/path";

const workspaceSearchPlaceholderMessage = defineMessage({
  id: "composer.localCwdDropdown.searchPlaceholder",
  defaultMessage: "Search projects",
  description: "Placeholder for searching the workspace root dropdown",
});

export function WorkspaceRootDropdownContent({
  groups,
  selectedProjectIds,
  onSelectProjectId,
  keepOpenOnSelect = false,
  onAddLocalProject,
  onAddRemoteProject,
  emptyMessage,
}: {
  groups: Array<RepositoryTaskGroups>;
  selectedProjectIds: Array<string>;
  onSelectProjectId: (projectId: string) => void;
  keepOpenOnSelect?: boolean;
  onAddLocalProject?: () => void;
  onAddRemoteProject?: () => void;
  emptyMessage?: ReactNode;
}): ReactElement {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredGroups = groups.filter((group) => {
    if (!normalizedQuery) {
      return true;
    }

    const rootFolder = group.repositoryData?.rootFolder ?? "";
    const searchableValues = [
      group.label,
      rootFolder,
      group.path,
      group.hostDisplayName ?? "",
    ];
    return searchableValues.some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
  const groupPathsByLabel = new Map<string, Array<string>>();
  groups.forEach((group) => {
    const sameLabelPaths = groupPathsByLabel.get(group.label);
    if (sameLabelPaths == null) {
      groupPathsByLabel.set(group.label, [group.path]);
      return;
    }
    sameLabelPaths.push(group.path);
  });

  return (
    <>
      <DropdownSearchInput
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
        }}
        placeholder={intl.formatMessage(workspaceSearchPlaceholderMessage)}
        className="mb-1"
      />
      <Dropdown.Section className="flex max-h-[232px] flex-col overflow-y-auto [--edge-fade-distance:1.5rem]">
        {filteredGroups.map((group) => {
          const rootFolder = group.repositoryData?.rootFolder;
          const isSubfolder = rootFolder && rootFolder !== group.label;
          const isWorktreeGroup = Boolean(group.isCodexWorktree);
          const sameLabelPaths = groupPathsByLabel.get(group.label) ?? [];
          const tooltipPath =
            sameLabelPaths.length > 1
              ? formatPathFromLastSharedSegment(group.path, sameLabelPaths)
              : null;
          return (
            <div key={group.projectId} className="flex flex-col">
              <DropdownItem
                LeftIcon={({ className }) => (
                  <WorkspaceRootIcon
                    isCodexWorktree={isWorktreeGroup}
                    isRemoteProject={group.projectKind === "remote"}
                    className={className}
                  />
                )}
                RightIcon={
                  selectedProjectIds.includes(group.projectId)
                    ? CheckMdIcon
                    : undefined
                }
                tooltipText={tooltipPath ?? undefined}
                tooltipAlign="center"
                onSelect={(event): void => {
                  if (keepOpenOnSelect) {
                    event.preventDefault();
                  }
                  onSelectProjectId(group.projectId);
                }}
              >
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate">{group.label}</span>
                  {group.hostDisplayName != null ? (
                    <span className="truncate text-sm text-token-description-foreground">
                      {group.hostDisplayName}
                    </span>
                  ) : null}
                  {isSubfolder ? (
                    <span className="truncate text-sm text-token-description-foreground">
                      {rootFolder}
                    </span>
                  ) : null}
                </div>
              </DropdownItem>
            </div>
          );
        })}
        {filteredGroups.length === 0 ? (
          <div className="text-token-muted-foreground px-3 py-2 text-sm">
            {emptyMessage ?? (
              <FormattedMessage
                id="composer.localCwdDropdown.noResults"
                defaultMessage="No folders found"
                description="Shown when searching for workspace roots returns no results"
              />
            )}
          </div>
        ) : null}
      </Dropdown.Section>
      {onAddLocalProject || onAddRemoteProject ? (
        <WithWindow electron>
          <>
            <Dropdown.Separator />
            <Dropdown.Section className="flex flex-col pb-1">
              {onAddLocalProject ? (
                <DropdownItem
                  LeftIcon={AddFolderIcon}
                  onSelect={onAddLocalProject}
                >
                  {onAddRemoteProject ? (
                    <FormattedMessage
                      id="composer.localCwdDropdown.addLocalWorkspaceRoot"
                      defaultMessage="Add local project"
                      description="Menu item that opens the local folder picker in the electron app when a remote project can also be added"
                    />
                  ) : (
                    <FormattedMessage
                      id="composer.localCwdDropdown.addWorkspaceRoot"
                      defaultMessage="Add new project"
                      description="Menu item that opens the project picker in the electron app when only local projects can be added"
                    />
                  )}
                </DropdownItem>
              ) : null}
              {onAddRemoteProject ? (
                <DropdownItem
                  LeftIcon={GlobeIcon}
                  onSelect={onAddRemoteProject}
                >
                  <FormattedMessage
                    id="composer.localCwdDropdown.addRemoteWorkspaceRoot"
                    defaultMessage="Add remote project"
                    description="Menu item that opens the remote project setup dialog in the electron app"
                  />
                </DropdownItem>
              ) : null}
            </Dropdown.Section>
          </>
        </WithWindow>
      ) : null}
    </>
  );
}
