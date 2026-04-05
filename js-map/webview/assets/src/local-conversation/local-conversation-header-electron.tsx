import { createGitCwd, type ConversationId } from "protocol";
import type { ReactElement, ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { isCompactWindowContextFromWindow } from "@/compact-window/is-compact-window-context";
import {
  compactWindowActionMessages,
  useOpenCompactWindow,
} from "@/compact-window/use-open-compact-window";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { ReviewDiffStats } from "@/diff-stats";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import PopInMacIcon from "@/icons/pop-in-mac.svg";
import { LocalConversationGitActions } from "@/local-conversation/local-conversation-git-actions";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { getProjectName } from "@/thread-layout/get-project-name";
import { ThreadPageHeader } from "@/thread-layout/thread-page-header";
import {
  ThreadProjectTooltip,
  ThreadTitle,
} from "@/thread-layout/thread-title";
import { useMutationFromVSCode } from "@/vscode-api";

import { LocalConversationEnvironmentActions } from "./local-conversation-environment-actions";
import { OpenInTargetDropdown } from "./open-in-target-dropdown";
import { ThreadOverflowMenu } from "./thread-overflow-menu";
import { useLocalConversationEnvironment } from "./use-local-conversation-environment";

export function LocalConversationHeaderElectron({
  conversationId,
  title,
  titleSuffix,
  cwd,
  canPin = true,
  onToggleTerminal,
  isTerminalOpen,
  isDiffPanelOpen,
  onToggleReviewPanel,
  trailing,
}: {
  conversationId: ConversationId | null;
  title: string | null;
  titleSuffix?: ReactNode;
  cwd: string | null;
  canPin?: boolean;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
  isDiffPanelOpen: boolean;
  onToggleReviewPanel: () => void;
  trailing?: ReactElement | null;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const isCompactWindow = isCompactWindowContextFromWindow();
  const gitCwd = cwd ? createGitCwd(cwd) : null;
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const projectName = getProjectName(gitCwd);
  const openFile = useMutationFromVSCode("open-file");
  const handleOpenFolder = (): void => {
    if (gitCwd == null) {
      return;
    }
    openFile.mutate({
      path: gitCwd,
      cwd: gitCwd,
      target: "fileManager",
    });
  };
  const { compactWindowAction, hasConfiguredHotkey, openCompactWindow } =
    useOpenCompactWindow({
      conversationId,
    });
  const overlayButton =
    conversationId && compactWindowAction.kind !== "hidden" ? (
      <Tooltip
        tooltipContent={
          compactWindowAction.kind === "open-hotkey-window" &&
          !hasConfiguredHotkey ? (
            <div className="flex flex-col gap-1">
              <FormattedMessage
                {...compactWindowActionMessages[compactWindowAction.kind]}
              />
              <div>
                <FormattedMessage
                  id="threadPage.openInHotkeyWindow.settingsMessage"
                  defaultMessage="Set a hotkey in <settingsLink>Settings</settingsLink>"
                  description="Tooltip copy with a settings button when the hotkey window has no configured shortcut"
                  values={{
                    settingsLink: (text) => (
                      <button
                        type="button"
                        className="text-token-link underline-offset-2 hover:underline"
                        onClick={() => {
                          void navigate("/settings");
                        }}
                      >
                        {text}
                      </button>
                    ),
                  }}
                />
              </div>
            </div>
          ) : (
            <FormattedMessage
              {...compactWindowActionMessages[compactWindowAction.kind]}
            />
          )
        }
        delayOpen
        interactive={
          compactWindowAction.kind === "open-hotkey-window" &&
          !hasConfiguredHotkey
        }
      >
        <Button
          size="toolbar"
          color="ghost"
          aria-label={intl.formatMessage(
            compactWindowActionMessages[compactWindowAction.kind],
          )}
          className={
            compactWindowAction.kind === "local-only"
              ? "cursor-not-allowed opacity-40"
              : undefined
          }
          onClick={openCompactWindow}
        >
          <PopInMacIcon className="icon-sm" />
        </Button>
      </Tooltip>
    ) : null;
  const threadTitleContent =
    title == null && titleSuffix == null ? null : (
      <span className="no-drag truncate">
        <span>{title}</span>
        {titleSuffix}
      </span>
    );
  const threadTitleNode =
    threadTitleContent == null ? null : (
      <ThreadTitle
        title={threadTitleContent}
        repoBranch={{ projectName, branchName: null }}
        repoPath={gitCwd}
        onProjectClick={hostConfig.kind === "local" ? handleOpenFolder : null}
      />
    );

  return (
    <ThreadPageHeader
      hostConfig={hostConfig}
      hostTooltipText={cwd}
      start={
        isCompactWindow && threadTitleNode && gitCwd ? (
          <Tooltip
            tooltipContent={<ThreadProjectTooltip repoPath={gitCwd} />}
            delayOpen
          >
            {threadTitleNode}
          </Tooltip>
        ) : (
          threadTitleNode
        )
      }
      showHost
      startActions={
        <ThreadOverflowMenu
          conversationId={conversationId}
          cwd={cwd}
          title={title}
          canPin={canPin}
        />
      }
      panelToggles={{
        bottom: {
          isOpen: isTerminalOpen,
          onToggle: onToggleTerminal,
        },
        right: {
          isOpen: isDiffPanelOpen,
          onToggle: onToggleReviewPanel,
          buttonContent: <ReviewDiffStats className="ml-1" />,
        },
      }}
      trailing={trailing}
      endActions={overlayButton}
    />
  );
}

export function LocalConversationActions({
  conversationId,
  cwd,
  onShowTerminal,
}: {
  conversationId: ConversationId | null;
  cwd: string | null;
  onShowTerminal: () => void;
}): ReactElement | null {
  const isRemoteHost = useIsRemoteHost();
  const gitCwd = cwd ? createGitCwd(cwd) : null;
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const { codexWorktree } = useLocalConversationEnvironment(gitCwd, hostConfig);
  const { data: repoStableMetadata } = useGitStableMetadata(gitCwd, hostConfig);
  const hasGitRepo = repoStableMetadata?.root != null;

  if (!conversationId) {
    return null;
  }

  return (
    <>
      {gitCwd != null ? (
        <LocalConversationEnvironmentActions
          conversationId={conversationId}
          hostConfig={hostConfig}
          onShowTerminal={onShowTerminal}
          workspaceRoot={gitCwd}
        />
      ) : null}
      {gitCwd != null && !isRemoteHost ? (
        <OpenInTargetDropdown cwd={gitCwd} />
      ) : null}
      {gitCwd != null && hasGitRepo ? (
        <LocalConversationGitActions
          key={gitCwd}
          conversationId={conversationId}
          cwd={gitCwd}
          codexWorktree={codexWorktree}
        />
      ) : null}
    </>
  );
}
