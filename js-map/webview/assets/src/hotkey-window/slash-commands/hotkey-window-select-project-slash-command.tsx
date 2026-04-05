import { useIntl } from "react-intl";

import { useProvideSlashCommand } from "@/composer/slash-commands/slash-command";
import { SlashCommandItem } from "@/composer/slash-commands/slash-command-item";
import CheckMdIcon from "@/icons/check-md.svg";
import FolderIcon from "@/icons/folder.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { messageBus } from "@/message-bus";
import { useSelectedRemoteProject } from "@/remote-projects/remote-projects";
import { useWorkspaceGroups } from "@/sidebar/use-repository-task-groups";
import { useFetchFromVSCode } from "@/vscode-api";

export function HotkeyWindowSelectProjectSlashCommand(): React.ReactElement | null {
  const intl = useIntl();
  const workspaceGroups = useWorkspaceGroups();
  const localWorkspaceGroups = workspaceGroups.filter((group) => {
    return group.projectKind === "local";
  });
  const { setSelectedRemoteProjectId } = useSelectedRemoteProject();
  const { data: activeWorkspaceRoot } = useFetchFromVSCode(
    "active-workspace-roots",
    {
      select: (data): string | null => data.roots[0] ?? null,
    },
  );
  const activeProjectId = activeWorkspaceRoot;

  useProvideSlashCommand({
    id: "hotkey-window-select-project",
    title: intl.formatMessage({
      id: "composer.hotkeyWindowSelectProjectSlashCommand.title",
      defaultMessage: "Project",
      description: "Title for hotkey-window select project slash command",
    }),
    description: intl.formatMessage({
      id: "composer.hotkeyWindowSelectProjectSlashCommand.description",
      defaultMessage: "Choose project for new threads",
      description: "Description for hotkey-window select project slash command",
    }),
    requiresEmptyComposer: false,
    Icon: FolderIcon,
    dependencies: [localWorkspaceGroups, activeProjectId],
    Content: ({ onClose }: { onClose: () => void }): React.ReactElement => {
      if (localWorkspaceGroups.length === 0) {
        return (
          <SlashCommandItem
            value="No projects"
            title={intl.formatMessage({
              id: "composer.hotkeyWindowSelectProjectSlashCommand.empty",
              defaultMessage: "No projects available",
              description:
                "Empty state for hotkey-window select project slash command",
            })}
            disabled
          />
        );
      }
      return (
        <>
          {localWorkspaceGroups.map((localGroup) => (
            <SlashCommandItem
              key={localGroup.projectId}
              value={localGroup.label}
              title={localGroup.label}
              description={localGroup.path}
              LeftIcon={localGroup.isCodexWorktree ? WorktreeIcon : FolderIcon}
              RightIcon={
                localGroup.projectId === activeProjectId
                  ? CheckMdIcon
                  : undefined
              }
              onSelect={() => {
                setSelectedRemoteProjectId(null);
                messageBus.dispatchMessage(
                  "electron-set-active-workspace-root",
                  {
                    root: localGroup.path,
                  },
                );
                onClose();
              }}
            />
          ))}
        </>
      );
    },
  });

  return null;
}
