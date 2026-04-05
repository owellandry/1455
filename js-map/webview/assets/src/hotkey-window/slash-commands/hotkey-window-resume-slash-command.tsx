import { isCodexWorktree } from "protocol";
import { useMemo, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";

import { useConversationsMeta } from "@/app-server/app-server-manager-hooks";
import { useTasks } from "@/codex-api";
import { Spinner } from "@/components/spinner";
import { useProvideSlashCommand } from "@/composer/slash-commands/slash-command";
import { SlashCommandItem } from "@/composer/slash-commands/slash-command-item";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import ThreadsIcon from "@/icons/chats.svg";
import CloudIcon from "@/icons/cloud.svg";
import MacbookIcon from "@/icons/macbook.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { messageBus } from "@/message-bus";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  buildHotkeyWindowResumeTargets,
  type HotkeyWindowResumeTarget,
} from "./hotkey-window-resume-targets";

export function HotkeyWindowResumeSlashCommand(): React.ReactElement | null {
  const intl = useIntl();
  const location = useLocation();
  const { data: localConversations = [] } = useConversationsMeta();
  const { data: cloudTasks = [] } = useTasks({
    limit: 20,
    taskFilter: "current",
  });
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
  });
  const resumeTargets = useMemo(() => {
    const targets = buildHotkeyWindowResumeTargets(
      localConversations,
      cloudTasks,
      isBackgroundSubagentsEnabled,
    );
    return targets.filter((target) => target.path !== location.pathname);
  }, [
    cloudTasks,
    isBackgroundSubagentsEnabled,
    localConversations,
    location.pathname,
  ]);

  useProvideSlashCommand({
    id: "hotkey-window-resume",
    title: intl.formatMessage({
      id: "composer.hotkeyWindowResumeSlashCommand.title",
      defaultMessage: "Resume",
      description: "Title for hotkey-window resume slash command",
    }),
    description: intl.formatMessage({
      id: "composer.hotkeyWindowResumeSlashCommand.description",
      defaultMessage: "Resume a recent thread",
      description: "Description for hotkey-window resume slash command",
    }),
    requiresEmptyComposer: true,
    Icon: ThreadsIcon,
    dependencies: [resumeTargets],
    Content: ({ onClose }: { onClose: () => void }): React.ReactElement => {
      if (resumeTargets.length === 0) {
        return (
          <SlashCommandItem
            value="No recent threads"
            title={intl.formatMessage({
              id: "composer.hotkeyWindowResumeSlashCommand.empty",
              defaultMessage: "No recent threads",
              description: "Empty state for hotkey-window resume command list",
            })}
            disabled
          />
        );
      }
      return (
        <>
          {resumeTargets.map((target) => (
            <SlashCommandItem
              key={target.key}
              value={target.key}
              title={target.title}
              description={target.projectShortName ?? undefined}
              rightAccessory={getResumeTargetStatusNode(target.status)}
              LeftIcon={
                target.kind === "cloud"
                  ? CloudIcon
                  : isCodexWorktree(target.cwd, codexHome)
                    ? WorktreeIcon
                    : MacbookIcon
              }
              onSelect={() => {
                onClose();
                messageBus.dispatchMessage("open-in-hotkey-window", {
                  path: target.path,
                });
              }}
            />
          ))}
        </>
      );
    },
  });

  return null;
}

function getResumeTargetStatusNode(
  status: HotkeyWindowResumeTarget["status"],
): ReactNode {
  switch (status) {
    case "running":
      return (
        <span className="relative flex w-5 shrink-0 items-center justify-center text-token-foreground/70">
          <Spinner className="icon-xs shrink-0" />
        </span>
      );
    case "unread":
      return (
        <span className="relative flex w-5 shrink-0 items-center justify-center text-token-description-foreground">
          <span className="icon-xs relative scale-50">
            <span className="absolute inset-0 rounded-full bg-token-text-link-foreground" />
          </span>
        </span>
      );
    case "read":
      return null;
  }
}
