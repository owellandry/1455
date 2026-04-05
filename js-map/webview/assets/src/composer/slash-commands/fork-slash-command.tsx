import { useIntl } from "react-intl";

import BranchIcon from "@/icons/branch.svg";
import MacbookIcon from "@/icons/macbook.svg";
import WorktreeIcon from "@/icons/worktree.svg";

import { useProvideSlashCommand } from "./slash-command";
import { SlashCommandItem } from "./slash-command-item";

export function ForkSlashCommand({
  isResponseInProgress,
  canForkToWorktree,
  onForkIntoLocal,
  onForkIntoWorktree,
}: {
  isResponseInProgress: boolean;
  canForkToWorktree: boolean;
  onForkIntoLocal: () => Promise<void>;
  onForkIntoWorktree: () => Promise<void>;
}): null {
  const intl = useIntl();

  function Content({ onClose }: { onClose: () => void }): React.ReactElement {
    return (
      <>
        <SlashCommandItem
          value="Fork into new worktree"
          LeftIcon={WorktreeIcon}
          title={intl.formatMessage({
            id: "composer.forkSlashCommand.option.worktree.title",
            defaultMessage: "Fork into new worktree",
            description:
              "Fork slash command option label for creating a new worktree",
          })}
          description={intl.formatMessage({
            id: "composer.forkSlashCommand.option.worktree.description",
            defaultMessage: "Continue in a new worktree",
            description:
              "Fork slash command option description for creating a new worktree",
          })}
          disabled={!canForkToWorktree}
          onSelect={() => {
            void onForkIntoWorktree().finally(onClose);
          }}
        />
        <SlashCommandItem
          value="Fork into local"
          LeftIcon={MacbookIcon}
          title={intl.formatMessage({
            id: "composer.forkSlashCommand.option.local.title",
            defaultMessage: "Fork into local",
            description: "Fork slash command option label for local fork",
          })}
          description={intl.formatMessage({
            id: "composer.forkSlashCommand.option.local.description",
            defaultMessage: "Continue in a new local thread",
            description: "Fork slash command option description for local fork",
          })}
          onSelect={() => {
            void onForkIntoLocal().finally(onClose);
          }}
        />
      </>
    );
  }

  useProvideSlashCommand({
    id: "fork",
    title: intl.formatMessage({
      id: "composer.forkSlashCommand.title",
      defaultMessage: "Fork",
      description: "Title for the fork slash command",
    }),
    description: intl.formatMessage({
      id: "composer.forkSlashCommand.description",
      defaultMessage: "Fork this thread into local or a new worktree",
      description: "Description for the fork slash command",
    }),
    requiresEmptyComposer: true,
    Icon: BranchIcon,
    Content,
    enabled: !isResponseInProgress,
    dependencies: [
      isResponseInProgress,
      canForkToWorktree,
      onForkIntoLocal,
      onForkIntoWorktree,
    ],
  });

  return null;
}
