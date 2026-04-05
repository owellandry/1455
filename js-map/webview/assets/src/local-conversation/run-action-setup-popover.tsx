import { useQueryClient } from "@tanstack/react-query";
import type {
  ConversationId,
  HostConfig,
  LocalEnvironmentAction,
  LocalEnvironmentPlatform,
} from "protocol";
import type React from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Tooltip } from "@/components/tooltip";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useOsInfo } from "@/hooks/use-os-info";
import PlayOutlineIcon from "@/icons/play-outline.svg";
import { RunActionForm } from "@/local-conversation/run-action-form";
import {
  buildEnvironmentToml,
  getLifecyclePlatformScripts,
  type LocalEnvironmentActionDraft,
} from "@/settings/settings-content/local-environments/local-environments-utils";
import { terminalService } from "@/terminal/terminal-service";
import { getProjectName } from "@/thread-layout/get-project-name";
import { getNextLocalEnvironmentConfigPath } from "@/utils/local-environments";
import { joinRootAndPath } from "@/utils/path";
import { getQueryKey, useMutationFromVSCode } from "@/vscode-api";

import { useLocalConversationEnvironment } from "./use-local-conversation-environment";

export function RunActionSetupPopover({
  conversationId,
  hostConfig,
  defaultOpen = false,
  onShowTerminal,
  triggerLabel,
  workspaceRoot,
}: {
  conversationId: ConversationId;
  hostConfig: HostConfig;
  defaultOpen?: boolean;
  onShowTerminal: () => void;
  triggerLabel: string;
  workspaceRoot: string | null;
}): React.ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const { data: osInfo } = useOsInfo();
  const queryClient = useQueryClient();
  const { environment, localEnvironments, setEnvironmentSelection } =
    useLocalConversationEnvironment(workspaceRoot, hostConfig);
  const { data: repoStableMetadata } = useGitStableMetadata(
    workspaceRoot,
    hostConfig,
  );
  const [command, setCommand] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const saveConfig = useMutationFromVSCode("local-environment-config-save");
  const configPath = workspaceRoot
    ? (environment?.configPath ??
      getNextLocalEnvironmentConfigPath(localEnvironments, workspaceRoot))
    : null;
  const trimmedCommand = command.trim();
  const canSubmit = trimmedCommand.length > 0 && configPath != null;
  const runLabel = intl.formatMessage({
    id: "threadPage.runAction.label",
    defaultMessage: "Run",
    description: "Label for the run action button and default action name",
  });
  const defaultEnvironmentName =
    getProjectName(workspaceRoot) ??
    intl.formatMessage({
      id: "settings.localEnvironments.environment.defaultName",
      defaultMessage: "local",
      description: "Fallback name for the local environment",
    });
  const commandPlaceholder = intl.formatMessage({
    id: "threadPage.runAction.setup.placeholder",
    defaultMessage: "eg:\nnpm install\nnpm run",
    description: "Placeholder text for the run action command input",
  });
  const saveDisabled = !canSubmit || saveConfig.isPending;

  const handleOpenSettings = (): void => {
    setIsOpen(false);
    void navigate("/settings/local-environments");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (saveDisabled) {
      return;
    }
    if (!configPath) {
      return;
    }
    const baseEnvironment = environment?.environment ?? null;
    const setupScripts = getLifecyclePlatformScripts(baseEnvironment?.setup);
    const existingActions = baseEnvironment?.actions ?? [];
    const platform = osInfo?.platform ?? null;
    const runActionPlatform = getRunActionPlatform(
      existingActions,
      platform === "darwin" || platform === "linux" || platform === "win32"
        ? platform
        : null,
    );
    const runActionDraft: LocalEnvironmentActionDraft = {
      id: crypto.randomUUID(),
      name: runLabel,
      icon: "run",
      command: trimmedCommand,
      platform: runActionPlatform,
    };
    const actions = [
      ...existingActions.map((action) => toActionDraft(action)),
      runActionDraft,
    ];
    const raw = buildEnvironmentToml({
      version: baseEnvironment?.version ?? 1,
      name: baseEnvironment?.name ?? defaultEnvironmentName,
      setupScript: baseEnvironment?.setup.script ?? "",
      setupPlatformScripts: setupScripts,
      cleanupScript: baseEnvironment?.cleanup?.script ?? "",
      cleanupPlatformScripts: getLifecyclePlatformScripts(
        baseEnvironment?.cleanup,
      ),
      actions,
    });

    const actionCwd = resolveActionCwd({
      gitRoot: repoStableMetadata?.root ?? null,
      relativePath: environment?.cwdRelativeToGitRoot ?? null,
      workspaceRoot,
    });
    const runAction: LocalEnvironmentAction = {
      name: runLabel,
      icon: "run",
      command: trimmedCommand,
      ...(runActionPlatform ? { platform: runActionPlatform } : {}),
    };

    saveConfig.mutate(
      {
        configPath,
        raw,
      },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({
            queryKey: getQueryKey("local-environment-config", {
              configPath,
            }),
          });
          void queryClient.invalidateQueries({
            queryKey: getQueryKey("local-environment", {
              configPath: result.configPath,
            }),
          });
          if (workspaceRoot) {
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("find-files", {
                query: "environment",
                cwd: workspaceRoot,
              }),
            });
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("local-environments", {
                workspaceRoot,
              }),
            });
          }
          setEnvironmentSelection(result.configPath);
          setIsOpen(false);
          setCommand("");
          runActionInTerminal({
            action: runAction,
            actionCwd,
            conversationId,
            hostId: hostConfig.id,
            onShowTerminal,
          });
        },
      },
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
      contentClassName="max-h-[calc(100vh-4rem)]"
      size="narrow"
      triggerContent={
        <Tooltip side="bottom" tooltipContent={triggerLabel}>
          <Button color="ghost" size="toolbar" aria-label={triggerLabel}>
            <PlayOutlineIcon className="icon-sm" />
          </Button>
        </Tooltip>
      }
    >
      <RunActionForm
        headerIcon={
          <PlayOutlineIcon className="icon-base text-token-foreground" />
        }
        title={
          <FormattedMessage
            id="threadPage.runAction.setup.title"
            defaultMessage="Run"
            description="Title for the run action setup popover"
          />
        }
        description={
          <FormattedMessage
            id="threadPage.runAction.setup.description"
            defaultMessage="Tell Codex how to install dependencies and start your app."
            description="Description for the run action setup popover"
          />
        }
        commandLabel={
          <FormattedMessage
            id="threadPage.runAction.setup.commandLabel"
            defaultMessage="Command to run"
            description="Label for run action command input"
          />
        }
        command={command}
        onCommandChange={setCommand}
        commandPlaceholder={commandPlaceholder}
        leftAction={
          <Button
            className="px-0"
            color="ghost"
            size="toolbar"
            type="button"
            onClick={handleOpenSettings}
          >
            <FormattedMessage
              id="threadPage.runAction.setup.editMore"
              defaultMessage="Environment settings"
              description="Edit more action label in run action setup popover"
            />
          </Button>
        }
        submitLabel={
          <FormattedMessage
            id="threadPage.runAction.setup.submit"
            defaultMessage="Save and run"
            description="Submit button label for run action setup popover"
          />
        }
        submitDisabled={saveDisabled}
        submitLoading={saveConfig.isPending}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}

function getRunActionPlatform(
  actions: Array<LocalEnvironmentAction>,
  platform: LocalEnvironmentPlatform | null,
): LocalEnvironmentPlatform | null {
  if (!platform) {
    return null;
  }
  const hasPlatformSpecificRunAction = actions.some((action) => {
    if ((action.icon ?? "tool") !== "run") {
      return false;
    }
    return action.platform != null;
  });
  if (hasPlatformSpecificRunAction) {
    return platform;
  }
  return null;
}

function toActionDraft(
  action: LocalEnvironmentAction,
): LocalEnvironmentActionDraft {
  return {
    ...action,
    id: crypto.randomUUID(),
    platform: action.platform ?? null,
  };
}

function resolveActionCwd({
  gitRoot,
  relativePath,
  workspaceRoot,
}: {
  gitRoot: string | null;
  relativePath: string | null;
  workspaceRoot: string | null;
}): string | null {
  if (gitRoot && relativePath) {
    return joinRootAndPath(gitRoot, relativePath);
  }
  if (workspaceRoot) {
    return workspaceRoot;
  }
  return null;
}

function runActionInTerminal({
  action,
  actionCwd,
  conversationId,
  hostId,
  onShowTerminal,
}: {
  action: LocalEnvironmentAction;
  actionCwd: string | null;
  conversationId: ConversationId;
  hostId: string;
  onShowTerminal: () => void;
}): void {
  if (!actionCwd) {
    return;
  }
  if (!action.command.trim()) {
    return;
  }
  onShowTerminal();
  const sessionId = terminalService.ensureConversationSession(
    conversationId,
    actionCwd,
    hostId,
  );
  terminalService.runAction(sessionId, {
    cwd: actionCwd,
    command: action.command,
  });
}
