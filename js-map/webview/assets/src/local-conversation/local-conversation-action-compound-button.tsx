import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import type {
  ConversationId,
  HostConfig,
  LocalEnvironmentAction,
  LocalEnvironmentWithPath,
} from "protocol";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { Button } from "@/components/button";
import { CompoundButton } from "@/components/compound-button";
import { Dialog } from "@/components/dialog";
import {
  BasicDropdown,
  BasicSubDropdown,
  Dropdown,
  DropdownSeparator,
} from "@/components/dropdown";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useOsInfo } from "@/hooks/use-os-info";
import CheckMdIcon from "@/icons/check-md.svg";
import PlusIcon from "@/icons/plus.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import { getEnvironmentDisplayName } from "@/local-conversation/environment-labels";
import { ActionIcon } from "@/settings/settings-content/local-environments/local-environment-action-icon";
import { ACTION_ICON_OPTION_DESCRIPTORS } from "@/settings/settings-content/local-environments/local-environment-action-icon-options";
import {
  buildEnvironmentToml,
  createDefaultAction,
  getLifecyclePlatformScripts,
  type LocalEnvironmentActionDraft,
} from "@/settings/settings-content/local-environments/local-environments-utils";
import { terminalService } from "@/terminal/terminal-service";
import { getProjectName } from "@/thread-layout/get-project-name";
import { logger } from "@/utils/logger";
import { joinRootAndPath } from "@/utils/path";
import { getQueryKey, useMutationFromVSCode } from "@/vscode-api";

import { LocalConversationEnvironmentMenuContent } from "./local-conversation-environment-menu-content";
import {
  aLocalEnvironmentRecentActionsByKey,
  getRecentActionNamesForKey,
  updateRecentActionNamesForKey,
} from "./local-environment-action-recents";
import { RunActionForm } from "./run-action-form";
import { useLocalConversationEnvironment } from "./use-local-conversation-environment";

export function LocalConversationActionCompoundButton({
  conversationId,
  hostConfig,
  onShowTerminal,
  workspaceRoot,
}: {
  conversationId: ConversationId;
  hostConfig: HostConfig;
  onShowTerminal: () => void;
  workspaceRoot: string | null;
}): ReactElement {
  const navigate = useNavigate();
  const {
    environment,
    resolvedEnvironmentConfigPath,
    localEnvironments,
    localEnvironmentsLoading,
    localEnvironmentsError,
    defaultEnvironment,
    defaultEnvironmentNormalized,
    availableEnvironments,
    normalizedResolvedConfigPath,
    codexWorktree,
    canChangeEnvironment,
    setEnvironmentSelection,
  } = useLocalConversationEnvironment(workspaceRoot, hostConfig);
  const { data: repoStableMetadata } = useGitStableMetadata(
    workspaceRoot,
    hostConfig,
  );
  const repoRoot = repoStableMetadata?.root ?? null;
  const { data: osInfo } = useOsInfo();
  const platform = osInfo?.platform ?? null;
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [actionDraft, setActionDraft] = useState<LocalEnvironmentActionDraft>(
    () => createDefaultAction(""),
  );
  const [recentActionsByKey, setRecentActionsByKey] = useAtom(
    aLocalEnvironmentRecentActionsByKey,
  );

  const actions = environment?.environment.actions ?? [];
  const actionsForPlatform = actions.filter((action): boolean => {
    return actionMatchesPlatform(action, platform);
  });
  const environmentKey = getEnvironmentActionKey({
    repoRoot,
    relativePath: environment?.cwdRelativeToGitRoot ?? null,
    workspaceRoot,
    configPath: environment?.configPath ?? null,
  });
  const recentActionNames = getRecentActionNamesForKey(
    recentActionsByKey,
    environmentKey,
  );
  const orderedActionsForPlatform =
    recentActionNames.length > 0
      ? orderActionsByRecentNames(actionsForPlatform, recentActionNames)
      : actionsForPlatform;
  const primaryAction = orderedActionsForPlatform[0] ?? null;
  const actionsTitleDescriptor = defineMessage({
    id: "settings.localEnvironments.actions.title",
    defaultMessage: "Actions",
    description: "Title for local environment actions section",
  });
  const environmentDisplayName = environment
    ? getEnvironmentDisplayName(
        environment.configPath,
        environment.environment.name,
      )
    : null;
  const onRunAction = (action: LocalEnvironmentAction): void => {
    const actionCwd = resolveActionCwd({
      repoRoot,
      relativePath: environment?.cwdRelativeToGitRoot ?? null,
      workspaceRoot,
    });
    if (!actionCwd) {
      logger.error("Can not run action. Cwd is not set");
      return;
    }
    setRecentActionsByKey(
      updateRecentActionNamesForKey(
        recentActionsByKey,
        environmentKey ?? actionCwd,
        action.name,
      ),
    );
    onShowTerminal();
    const sessionId = terminalService.ensureConversationSession(
      conversationId,
      actionCwd,
      hostConfig.id,
    );
    terminalService.runAction(sessionId, {
      cwd: actionCwd,
      command: action.command ?? "",
    });
  };

  const handleActionMenuOpenChange = (nextOpen: boolean): void => {
    setActionMenuOpen(nextOpen);
  };

  const handleStartCreateAction = (): void => {
    if (!resolvedEnvironmentConfigPath) {
      return;
    }
    setActionDraft(createDefaultAction(""));
    setActionMenuOpen(false);
    setAddActionOpen(true);
  };

  const handleCloseAddAction = (): void => {
    setAddActionOpen(false);
  };

  const handleOpenEnvironmentSettings = (): void => {
    setActionMenuOpen(false);
    void navigate("/settings/local-environments");
  };

  return (
    <>
      <CompoundButton
        color="outline"
        size="toolbar"
        dropdownAlign="end"
        dropdownOpen={actionMenuOpen}
        onDropdownOpenChange={handleActionMenuOpenChange}
        tooltipSide="bottom"
        tooltipContent={
          environmentDisplayName ? (
            <FormattedMessage
              id="threadPage.runAction.tooltip.withEnvironment"
              defaultMessage="{environmentName} actions"
              description="Tooltip for the local run action button when an environment is selected"
              values={{
                environmentName: environmentDisplayName,
              }}
            />
          ) : primaryAction ? (
            primaryAction.name
          ) : (
            <FormattedMessage {...actionsTitleDescriptor} />
          )
        }
        dropdownContent={
          <>
            <Dropdown.Title>
              {environmentDisplayName ? (
                <FormattedMessage
                  id="threadPage.runAction.dropdown.titleWithEnvironment"
                  defaultMessage="{environmentName} actions"
                  description="Title for the run action dropdown when an environment is selected"
                  values={{
                    environmentName: environmentDisplayName,
                  }}
                />
              ) : (
                <FormattedMessage {...actionsTitleDescriptor} />
              )}
            </Dropdown.Title>
            {orderedActionsForPlatform.map(
              (action, i): ReactElement => (
                <Dropdown.Item
                  key={i}
                  RightIcon={action === primaryAction ? CheckMdIcon : undefined}
                  onSelect={() => {
                    onRunAction(action);
                  }}
                >
                  <ActionDropdownRow
                    icon={<ActionIcon icon={action.icon ?? "tool"} />}
                    label={action.name}
                  />
                </Dropdown.Item>
              ),
            )}
            <Dropdown.Item onSelect={handleStartCreateAction}>
              <ActionDropdownRow
                icon={<PlusIcon className="icon-sm" />}
                label={
                  <FormattedMessage
                    id="settings.localEnvironments.actions.add"
                    defaultMessage="Add action"
                    description="Button label to add a local environment action"
                  />
                }
              />
            </Dropdown.Item>
            {!codexWorktree && canChangeEnvironment ? (
              <>
                {/* Worktrees keep their env. */}
                <DropdownSeparator />
                <BasicSubDropdown
                  trigger={
                    <Dropdown.Item>
                      <ActionDropdownRow
                        icon={<SettingsCogIcon className="icon-sm" />}
                        label={
                          <FormattedMessage
                            id="threadPage.runAction.changeEnvironment"
                            defaultMessage="Change environment"
                            description="Menu item to change the active local environment"
                          />
                        }
                      />
                    </Dropdown.Item>
                  }
                >
                  <LocalConversationEnvironmentMenuContent
                    localEnvironmentsLoading={localEnvironmentsLoading}
                    localEnvironmentsError={localEnvironmentsError}
                    localEnvironments={localEnvironments}
                    availableEnvironments={availableEnvironments}
                    defaultEnvironment={defaultEnvironment}
                    defaultEnvironmentNormalized={defaultEnvironmentNormalized}
                    normalizedResolvedConfigPath={normalizedResolvedConfigPath}
                    onSelectEnvironment={setEnvironmentSelection}
                    onOpenSettings={handleOpenEnvironmentSettings}
                  />
                </BasicSubDropdown>
              </>
            ) : null}
          </>
        }
        onClick={() => {
          if (primaryAction) {
            setActionMenuOpen(false);
            onRunAction(primaryAction);
            return;
          }
          setActionMenuOpen(true);
        }}
        primaryAriaLabel={primaryAction?.name ?? actionsTitleDescriptor}
      >
        <ActionIcon icon={primaryAction?.icon ?? "tool"} />
      </CompoundButton>
      {environment && resolvedEnvironmentConfigPath ? (
        <Dialog
          open={addActionOpen}
          onOpenChange={setAddActionOpen}
          contentClassName="!w-[379px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] !p-0"
        >
          <ActionCreateForm
            action={actionDraft}
            configPath={resolvedEnvironmentConfigPath}
            environment={environment}
            onRunAction={onRunAction}
            onCancel={handleCloseAddAction}
            onOpenSettings={() => {
              handleCloseAddAction();
              void navigate("/settings/local-environments");
            }}
            onSaved={handleCloseAddAction}
            onUpdate={(update) => {
              setActionDraft((currentDraft) => ({
                ...currentDraft,
                ...update,
              }));
            }}
            workspaceRoot={workspaceRoot}
          />
        </Dialog>
      ) : null}
    </>
  );
}

function ActionDropdownRow({
  icon,
  label,
}: {
  icon: ReactNode;
  label: ReactNode;
}): ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function ActionCreateForm({
  action,
  environment,
  configPath,
  onRunAction,
  onCancel,
  onOpenSettings,
  onSaved,
  onUpdate,
  workspaceRoot,
}: {
  action: LocalEnvironmentActionDraft;
  environment: LocalEnvironmentWithPath;
  configPath: string;
  onRunAction: (action: LocalEnvironmentAction) => void;
  onCancel: () => void;
  onOpenSettings: () => void;
  onSaved: () => void;
  onUpdate: (update: Partial<LocalEnvironmentActionDraft>) => void;
  workspaceRoot: string | null;
}): ReactElement {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const saveConfig = useMutationFromVSCode("local-environment-config-save");
  const iconOptions = ACTION_ICON_OPTION_DESCRIPTORS.map((descriptor) => ({
    ariaLabel: intl.formatMessage(descriptor.message),
    value: descriptor.value,
    icon: <ActionIcon icon={descriptor.value} />,
  }));
  const selectedIconOption =
    iconOptions.find((option): boolean => option.value === action.icon) ??
    iconOptions[0];
  const defaultEnvironmentName =
    getProjectName(workspaceRoot) ??
    intl.formatMessage({
      id: "settings.localEnvironments.environment.defaultName",
      defaultMessage: "local",
      description: "Fallback name for the local environment",
    });
  const trimmedName = action.name.trim();
  const trimmedCommand = action.command.trim();
  const canSave = trimmedName.length > 0 && trimmedCommand.length > 0;
  const saveDisabled = !canSave || saveConfig.isPending;
  const actionNameInputId = `local-env-action-name-${action.id}`;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (saveDisabled) {
      return;
    }
    const baseEnvironment = environment.environment;
    const existingActions = baseEnvironment.actions ?? [];
    const nextAction: LocalEnvironmentActionDraft = {
      ...action,
      name: trimmedName,
      command: trimmedCommand,
    };
    const runAction: LocalEnvironmentAction = {
      name: trimmedName,
      icon: action.icon,
      command: trimmedCommand,
      ...(action.platform ? { platform: action.platform } : {}),
    };
    const actions: Array<LocalEnvironmentActionDraft> = [
      ...existingActions.map((action) => toActionDraft(action)),
      nextAction,
    ];
    const raw = buildEnvironmentToml({
      version: baseEnvironment.version ?? 1,
      name: baseEnvironment.name || defaultEnvironmentName,
      setupScript: baseEnvironment.setup.script ?? "",
      setupPlatformScripts: getLifecyclePlatformScripts(baseEnvironment.setup),
      cleanupScript: baseEnvironment.cleanup?.script ?? "",
      cleanupPlatformScripts: getLifecyclePlatformScripts(
        baseEnvironment.cleanup,
      ),
      actions,
    });
    saveConfig.mutate(
      {
        configPath,
        raw,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getQueryKey("local-environment-config", {
              configPath,
            }),
          });
          void queryClient.invalidateQueries({
            queryKey: getQueryKey("local-environment", {
              configPath,
            }),
          });
          if (workspaceRoot) {
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("local-environments", {
                workspaceRoot,
              }),
            });
          }
          onSaved();
          onRunAction(runAction);
        },
      },
    );
  };

  return (
    <RunActionForm
      headerIcon={
        <ActionIcon
          className="icon-base text-token-foreground"
          icon={action.icon ?? "tool"}
        />
      }
      title={
        <FormattedMessage
          id="settings.localEnvironments.actions.add"
          defaultMessage="Add action"
          description="Button label to add a local environment action"
        />
      }
      description={
        <FormattedMessage
          id="settings.localEnvironments.actions.add.description"
          defaultMessage="Create a new command to run from the toolbar."
          description="Description for adding a local environment action"
        />
      }
      extraFields={
        <div className="flex w-full flex-col gap-2">
          <label
            className="text-xs font-medium tracking-wide text-token-text-secondary uppercase"
            htmlFor={actionNameInputId}
          >
            <FormattedMessage
              id="settings.localEnvironments.actions.item.name"
              defaultMessage="Name"
              description="Label for local environment action name"
            />
          </label>
          <div className="flex items-center gap-2">
            <BasicDropdown
              align="start"
              contentWidth="icon"
              triggerButton={
                <Button
                  id={`local-env-action-icon-${action.id}`}
                  className="w-12 justify-center text-sm"
                  color="secondary"
                  size="toolbar"
                  aria-label={selectedIconOption.ariaLabel}
                >
                  {selectedIconOption.icon}
                </Button>
              }
            >
              {iconOptions.map((option): ReactElement => {
                return (
                  <Dropdown.Item
                    key={option.value}
                    tooltipText={option.ariaLabel}
                    onSelect={() => {
                      onUpdate({ icon: option.value });
                    }}
                  >
                    {option.icon}
                  </Dropdown.Item>
                );
              })}
            </BasicDropdown>
            <div className="flex-1">
              <input
                id={actionNameInputId}
                className="w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-1.5 text-sm text-token-text-primary outline-none focus-visible:ring-0"
                value={action.name}
                onChange={(event) => {
                  onUpdate({ name: event.target.value });
                }}
              />
            </div>
          </div>
        </div>
      }
      commandLabel={
        <FormattedMessage
          id="threadPage.runAction.setup.commandLabel"
          defaultMessage="Command to run"
          description="Label for run action command input"
        />
      }
      command={action.command}
      onCommandChange={(nextValue) => {
        onUpdate({ command: nextValue });
      }}
      commandPlaceholder={intl.formatMessage({
        id: "threadPage.runAction.setup.placeholder",
        defaultMessage: "eg:\nnpm install\nnpm run",
        description: "Placeholder text for the run action command input",
      })}
      leftAction={
        <Button
          className="px-0"
          color="ghost"
          size="toolbar"
          type="button"
          onClick={() => {
            onCancel();
            onOpenSettings();
          }}
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
          id="settings.localEnvironments.actions.add.save"
          defaultMessage="Save"
          description="Save button label for adding a local environment action"
        />
      }
      submitDisabled={saveDisabled}
      submitLoading={saveConfig.isPending}
      onSubmit={handleSubmit}
    />
  );
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
  repoRoot,
  relativePath,
  workspaceRoot,
}: {
  repoRoot: string | null;
  relativePath: string | null;
  workspaceRoot: string | null;
}): string | null {
  if (repoRoot && relativePath) {
    return joinRootAndPath(repoRoot, relativePath);
  }
  if (workspaceRoot) {
    return workspaceRoot;
  }
  if (repoRoot) {
    return repoRoot;
  }
  return null;
}

function getEnvironmentActionKey({
  repoRoot,
  relativePath,
  workspaceRoot,
  configPath,
}: {
  repoRoot: string | null;
  relativePath: string | null;
  workspaceRoot: string | null;
  configPath: string | null;
}): string | null {
  return (
    resolveActionCwd({ repoRoot, relativePath, workspaceRoot }) ??
    configPath ??
    null
  );
}

function orderActionsByRecentNames(
  actions: Array<LocalEnvironmentAction>,
  recentNames: Array<string>,
): Array<LocalEnvironmentAction> {
  const indexByName = new Map<string, number>();
  recentNames.forEach((name, index) => {
    if (!indexByName.has(name)) {
      indexByName.set(name, index);
    }
  });
  return actions
    .map((action, originalIndex) => ({
      action,
      originalIndex,
      recentIndex: indexByName.get(action.name) ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => {
      if (a.recentIndex !== b.recentIndex) {
        return a.recentIndex - b.recentIndex;
      }
      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.action);
}

function actionMatchesPlatform(
  action: LocalEnvironmentAction,
  platform: string | null,
): boolean {
  const supportedPlatform = action.platform;
  if (!supportedPlatform) {
    return true;
  }
  if (platform !== "darwin" && platform !== "linux" && platform !== "win32") {
    return true;
  }
  return supportedPlatform === platform;
}
