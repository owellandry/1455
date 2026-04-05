import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { LocalEnvironment, LocalEnvironmentPlatform } from "protocol";
import { isCodexWorktree, LOCAL_ENVIRONMENT_CONFIG_KEY } from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { CodeSnippet } from "@/components/code-snippet";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { gitQueryKey, useGitMutation } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useOsInfo } from "@/hooks/use-os-info";
import TrashIcon from "@/icons/trash.svg";
import { AppScope } from "@/scopes/app-scope";
import { platformLabels } from "@/settings/settings-content/local-environments/platform-labels";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSurface } from "@/settings/settings-surface";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import { getProjectName } from "@/thread-layout/get-project-name";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

import { ActionIcon } from "./local-environment-action-icon";
import { ACTION_ICON_OPTION_DESCRIPTORS } from "./local-environment-action-icon-options";
import { LocalEnvironmentSetupEnvVarsDialog } from "./local-environment-setup-env-vars-dialog";
import { LocalEnvironmentWorkspaceCard } from "./local-environment-workspace-card";
import {
  ACTION_SCRIPT_PLACEHOLDER,
  buildEnvironmentToml,
  CLEANUP_SCRIPT_PLACEHOLDER,
  createDefaultAction,
  getInitialActionDrafts,
  getLifecyclePlatformScripts,
  LIFECYCLE_PLATFORM_ORDER,
  SETUP_SCRIPT_PLACEHOLDER,
  type LocalEnvironmentActionDraft,
  type LocalEnvironmentLifecyclePlatformScripts,
} from "./local-environments-utils";

type LocalEnvironmentFormValues = {
  name: string;
  setupScript: string;
  setupPlatformScripts: LocalEnvironmentLifecyclePlatformScripts;
  setupPlatformVisibility: Record<LocalEnvironmentPlatform, boolean>;
  cleanupScript: string;
  cleanupPlatformScripts: LocalEnvironmentLifecyclePlatformScripts;
  cleanupPlatformVisibility: Record<LocalEnvironmentPlatform, boolean>;
  actions: Array<LocalEnvironmentActionDraft>;
};

type SaveDisabledReason = "missing-name" | "no-changes" | "saving";
type LocalEnvironmentLifecycleType = "setup" | "cleanup";

export function LocalEnvironmentEditor({
  workspaceRoot,
  workspaceGroup,
  configPath,
  configExists,
  initialEnvironment,
  parseErrorMessage,
  readErrorMessage,
  onExitEdit,
}: {
  workspaceRoot: string;
  workspaceGroup: RepositoryTaskGroups | null;
  configPath: string;
  configExists: boolean;
  initialEnvironment: LocalEnvironment | null;
  parseErrorMessage: string | null;
  readErrorMessage: string | null;
  onExitEdit: () => void;
}): ReactElement {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const scope = useScope(AppScope);
  const { data: osInfo } = useOsInfo();
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
  });
  const codexWorktree = isCodexWorktree(workspaceRoot, codexHome);
  const hostConfig = useHostConfig(DEFAULT_HOST_ID);
  const { data: gitMetadata } = useGitStableMetadata(workspaceRoot, hostConfig);
  const hostKey = getHostKey(hostConfig);
  const setConfigValue = useGitMutation("set-config-value", hostConfig, {
    onSuccess: () => {
      if (!gitMetadata) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: gitQueryKey({
          metadata: gitMetadata,
          method: "config-value",
          params: {
            root: gitMetadata.root,
            key: LOCAL_ENVIRONMENT_CONFIG_KEY,
            scope: "worktree",
          },
          hostKey,
        }),
      });
    },
  });

  const defaultActionName = "";
  const fallbackName =
    getProjectName(workspaceRoot) ??
    intl.formatMessage({
      id: "settings.localEnvironments.environment.defaultName",
      defaultMessage: "local",
      description: "Fallback name for the local environment",
    });
  const initialActions = initialEnvironment?.actions ?? [];
  const initialName = initialEnvironment?.name ?? fallbackName;
  const initialSetupScript = initialEnvironment?.setup?.script ?? "";
  const initialCleanupScript = initialEnvironment?.cleanup?.script ?? "";
  const initialSetupPlatformScripts = getLifecyclePlatformScripts(
    initialEnvironment?.setup,
  );
  const initialCleanupPlatformScripts = getLifecyclePlatformScripts(
    initialEnvironment?.cleanup,
  );
  const initialActionDrafts = getInitialActionDrafts(initialActions);
  const version = initialEnvironment?.version ?? 1;
  const initialFormValues: LocalEnvironmentFormValues = getInitialFormValues({
    name: initialName,
    setupScript: initialSetupScript,
    setupPlatformScripts: initialSetupPlatformScripts,
    cleanupScript: initialCleanupScript,
    cleanupPlatformScripts: initialCleanupPlatformScripts,
    actions: initialActionDrafts,
  });
  const saveConfig = useMutationFromVSCode("local-environment-config-save", {
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
      void queryClient.invalidateQueries({
        queryKey: getQueryKey("local-environments", {
          workspaceRoot,
        }),
      });
      scope.get(toast$).success(
        intl.formatMessage({
          id: "settings.localEnvironments.save.success",
          defaultMessage: "Saved local environment",
          description: "Toast shown when local environment is saved",
        }),
      );
      if (!configExists && codexWorktree && gitMetadata?.root) {
        setConfigValue.mutate({
          root: gitMetadata.root,
          key: LOCAL_ENVIRONMENT_CONFIG_KEY,
          value: configPath,
          scope: "worktree",
        });
      }
      onExitEdit();
    },
  });
  const form = useForm({
    defaultValues: initialFormValues,
    onSubmit: ({ value }) => {
      const tomlPreview = buildTomlPreview(value, version);
      if (value.name.length === 0) {
        return;
      }
      saveConfig.mutate({
        configPath,
        raw: tomlPreview,
      });
    },
  });
  const showPreview = __DEV__ || __STORYBOOK__;

  return (
    <form
      className="flex flex-col gap-[var(--padding-panel)]"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe
        selector={(
          state,
        ): { values: LocalEnvironmentFormValues; isDirty: boolean } => ({
          values: state.values,
          isDirty: state.isDirty,
        })}
      >
        {({ values, isDirty }): ReactElement => {
          const tomlPreview = buildTomlPreview(values, version);
          const iconOptions = ACTION_ICON_OPTION_DESCRIPTORS.map(
            (descriptor) => ({
              label: intl.formatMessage(descriptor.message),
              value: descriptor.value,
              icon: <ActionIcon icon={descriptor.value} />,
            }),
          );
          const defaultPlatform = getDefaultActionPlatform(osInfo?.platform);
          const platformToggleOptions = getActionPlatformToggleOptions(intl);
          const saveDisabledReason = getSaveDisabledReason({
            values,
            isDirty,
            isSaving: saveConfig.isPending,
          });
          const saveDisabledTooltip =
            getSaveDisabledTooltip(saveDisabledReason);
          const isSaveDisabled = saveDisabledReason != null;

          const handleAddLifecyclePlatform = (
            scriptType: LocalEnvironmentLifecycleType,
            platform: LocalEnvironmentPlatform,
          ): void => {
            const { visibilityField, visibility } = getLifecyclePlatformState(
              values,
              scriptType,
            );
            form.setFieldValue(visibilityField, {
              ...visibility,
              [platform]: true,
            });
          };

          const handleRemoveLifecyclePlatform = (
            scriptType: LocalEnvironmentLifecycleType,
            platform: LocalEnvironmentPlatform,
          ): void => {
            const { scriptField, scripts, visibilityField, visibility } =
              getLifecyclePlatformState(values, scriptType);
            form.setFieldValue(scriptField, {
              ...scripts,
              [platform]: "",
            });
            form.setFieldValue(visibilityField, {
              ...visibility,
              [platform]: false,
            });
          };

          const handleLifecyclePlatformScriptChange = (
            scriptType: LocalEnvironmentLifecycleType,
            platform: LocalEnvironmentPlatform,
            nextValue: string,
          ): void => {
            const { scriptField, scripts } = getLifecyclePlatformState(
              values,
              scriptType,
            );
            form.setFieldValue(scriptField, {
              ...scripts,
              [platform]: nextValue,
            });
          };

          const handleAddAction = (): void => {
            form.setFieldValue("actions", [
              ...values.actions,
              createDefaultAction(defaultActionName),
            ]);
          };

          const handleRemoveAction = (actionId: string): void => {
            form.setFieldValue(
              "actions",
              values.actions.filter(
                (action): boolean => action.id !== actionId,
              ),
            );
          };

          const handleUpdateAction = (
            actionId: string,
            update: Partial<LocalEnvironmentActionDraft>,
          ): void => {
            form.setFieldValue(
              "actions",
              values.actions.map((action): LocalEnvironmentActionDraft => {
                if (action.id !== actionId) {
                  return action;
                }
                return { ...action, ...update };
              }),
            );
          };

          const handleSave = (): void => {
            if (isSaveDisabled) {
              return;
            }
            void form.handleSubmit();
          };

          return (
            <>
              <SettingsGroup>
                <SettingsGroup.Header
                  title={
                    <FormattedMessage
                      id="settings.localEnvironments.file.title"
                      defaultMessage="Local environment file"
                      description="Title for local environment file section"
                    />
                  }
                />
                <SettingsGroup.Content>
                  <SettingsSurface>
                    <LocalEnvironmentWorkspaceCard
                      workspaceRoot={workspaceRoot}
                      workspaceGroup={workspaceGroup}
                    />
                  </SettingsSurface>
                  <div className="mt-2 truncate text-xs text-token-text-secondary">
                    <FormattedMessage
                      id="settings.localEnvironments.file.path"
                      defaultMessage="File: {path}"
                      description="Label for local environment config path"
                      values={{
                        path: <span className="font-mono">{configPath}</span>,
                      }}
                    />
                  </div>
                  {!configExists ? (
                    <div className="mt-1 text-sm text-token-text-secondary">
                      <FormattedMessage
                        id="settings.localEnvironments.file.missing"
                        defaultMessage="Save to create this file for the first time."
                        description="Message shown when local environment config does not exist"
                      />
                    </div>
                  ) : null}
                  {parseErrorMessage ? (
                    <div className="mt-2 text-sm text-token-error-foreground">
                      <FormattedMessage
                        id="settings.localEnvironments.file.parseError"
                        defaultMessage="Unable to parse the existing file. Saving will overwrite it. ({error})"
                        description="Parse error message for local environment file"
                        values={{ error: parseErrorMessage }}
                      />
                    </div>
                  ) : null}
                  {readErrorMessage ? (
                    <div className="mt-2 text-sm text-token-error-foreground">
                      <FormattedMessage
                        id="settings.localEnvironments.file.readError"
                        defaultMessage="Failed to load local environment data. ({error})"
                        description="Read error message for local environment config"
                        values={{ error: readErrorMessage }}
                      />
                    </div>
                  ) : null}
                </SettingsGroup.Content>
              </SettingsGroup>

              <SettingsGroup>
                <SettingsGroup.Header
                  title={
                    <FormattedMessage
                      id="settings.localEnvironments.environment.title"
                      defaultMessage="Environment details"
                      description="Title for local environment details section"
                    />
                  }
                />
                <SettingsGroup.Content className="gap-[var(--padding-panel)]">
                  <SettingsSurface>
                    <SettingsRow
                      label={
                        <FormattedMessage
                          id="settings.localEnvironments.environment.name"
                          defaultMessage="Name"
                          description="Label for environment name input"
                        />
                      }
                      control={
                        <div className="w-72">
                          <input
                            id="local-environment-name"
                            className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-1.5 text-sm text-token-text-primary outline-none focus-visible:ring-2"
                            value={values.name}
                            onChange={(event) => {
                              form.setFieldValue("name", event.target.value);
                            }}
                          />
                        </div>
                      }
                    />
                  </SettingsSurface>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium text-token-text-primary">
                        <FormattedMessage
                          id="settings.localEnvironments.environment.setup"
                          defaultMessage="Setup script"
                          description="Label for environment setup script input"
                        />
                      </div>
                      <div className="text-sm text-token-text-secondary">
                        <FormattedMessage
                          id="settings.localEnvironments.environment.setup.description"
                          defaultMessage="This script will run on worktree creation."
                          description="Description for environment setup script summary"
                        />
                      </div>
                    </div>
                    <SettingsSurface>
                      <div className="flex flex-col gap-2 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                              <FormattedMessage
                                id="settings.localEnvironments.environment.setup.script"
                                defaultMessage="Script"
                                description="Label for setup script input"
                              />
                            </div>
                            <div className="text-sm text-token-text-secondary">
                              <FormattedMessage
                                id="settings.localEnvironments.environment.setup.hint"
                                defaultMessage="Runs in the project root."
                                description="Description for setup script input"
                              />
                            </div>
                          </div>
                          <LocalEnvironmentSetupEnvVarsDialog />
                        </div>
                        <textarea
                          id="local-environment-setup-script"
                          className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none focus-visible:ring-2"
                          value={values.setupScript}
                          placeholder={SETUP_SCRIPT_PLACEHOLDER}
                          rows={6}
                          onChange={(event) => {
                            form.setFieldValue(
                              "setupScript",
                              event.target.value,
                            );
                          }}
                        />
                      </div>
                    </SettingsSurface>
                    <SettingsSurface>
                      <div className="flex flex-col gap-3 p-3">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                            <FormattedMessage
                              id="settings.localEnvironments.environment.setup.platformOverrides"
                              defaultMessage="Platform overrides"
                              description="Label for setup script platform overrides"
                            />
                          </div>
                          <div className="text-sm text-token-text-secondary">
                            <FormattedMessage
                              id="settings.localEnvironments.environment.setup.platformOverrides.description"
                              defaultMessage="Overrides the default script for specific OSes."
                              description="Description for setup script platform overrides"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-4">
                          {LIFECYCLE_PLATFORM_ORDER.map(
                            (platform): ReactElement | null => {
                              if (!values.setupPlatformVisibility[platform]) {
                                return null;
                              }
                              return (
                                <div
                                  key={platform}
                                  className="flex flex-col gap-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                                      {getPlatformLabel(platform)}
                                    </div>
                                    <Button
                                      color="ghost"
                                      size="toolbar"
                                      onClick={() => {
                                        handleRemoveLifecyclePlatform(
                                          "setup",
                                          platform,
                                        );
                                      }}
                                    >
                                      <FormattedMessage
                                        id="settings.localEnvironments.environment.setup.platformOverrides.remove"
                                        defaultMessage="Remove"
                                        description="Button label to remove a setup script override"
                                      />
                                    </Button>
                                  </div>
                                  <textarea
                                    id={`local-environment-setup-platform-script-${platform}`}
                                    className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none focus-visible:ring-2"
                                    value={
                                      values.setupPlatformScripts[platform] ??
                                      ""
                                    }
                                    placeholder={SETUP_SCRIPT_PLACEHOLDER}
                                    rows={6}
                                    onChange={(event) => {
                                      handleLifecyclePlatformScriptChange(
                                        "setup",
                                        platform,
                                        event.target.value,
                                      );
                                    }}
                                  />
                                </div>
                              );
                            },
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-2">
                          {LIFECYCLE_PLATFORM_ORDER.map(
                            (platform): ReactElement | null => {
                              const isVisible =
                                values.setupPlatformVisibility[platform];
                              if (isVisible) {
                                return null;
                              }
                              return (
                                <Button
                                  key={platform}
                                  color="secondary"
                                  size="toolbar"
                                  className="w-auto"
                                  onClick={() => {
                                    handleAddLifecyclePlatform(
                                      "setup",
                                      platform,
                                    );
                                  }}
                                >
                                  <FormattedMessage
                                    id="settings.localEnvironments.environment.setup.platformOverrides.add"
                                    defaultMessage="Add {platform} setup script"
                                    description="Button label to add a platform-specific setup script"
                                    values={{
                                      platform: getPlatformLabel(platform),
                                    }}
                                  />
                                </Button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </SettingsSurface>
                  </div>
                </SettingsGroup.Content>
              </SettingsGroup>

              <SettingsGroup>
                <SettingsGroup.Header
                  title={
                    <FormattedMessage
                      id="settings.localEnvironments.environment.cleanup.title"
                      defaultMessage="Cleanup script"
                      description="Title for the cleanup script section"
                    />
                  }
                />
                <SettingsGroup.Content>
                  <div className="text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.localEnvironments.environment.cleanup.description"
                      defaultMessage="This script will run before a worktree is deleted."
                      description="Description for the cleanup script input"
                    />
                  </div>
                  <SettingsSurface>
                    <div className="flex flex-col gap-2 p-3">
                      <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                        <FormattedMessage
                          id="settings.localEnvironments.environment.cleanup.script"
                          defaultMessage="Script"
                          description="Label for cleanup script input"
                        />
                      </div>
                      <div className="text-sm text-token-text-secondary">
                        <FormattedMessage
                          id="settings.localEnvironments.environment.cleanup.hint"
                          defaultMessage="Runs in the project root just before cleanup."
                          description="Description for cleanup script input"
                        />
                      </div>
                      <textarea
                        id="local-environment-cleanup-script"
                        className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none focus-visible:ring-2"
                        value={values.cleanupScript}
                        placeholder={CLEANUP_SCRIPT_PLACEHOLDER}
                        rows={6}
                        onChange={(event) => {
                          form.setFieldValue(
                            "cleanupScript",
                            event.target.value,
                          );
                        }}
                      />
                    </div>
                  </SettingsSurface>
                  <SettingsSurface>
                    <div className="flex flex-col gap-3 p-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                          <FormattedMessage
                            id="settings.localEnvironments.environment.cleanup.platformOverrides"
                            defaultMessage="Platform overrides"
                            description="Label for cleanup script platform overrides"
                          />
                        </div>
                        <div className="text-sm text-token-text-secondary">
                          <FormattedMessage
                            id="settings.localEnvironments.environment.cleanup.platformOverrides.description"
                            defaultMessage="Overrides the default cleanup script for specific OSes."
                            description="Description for cleanup script platform overrides"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-4">
                        {LIFECYCLE_PLATFORM_ORDER.map(
                          (platform): ReactElement | null => {
                            if (!values.cleanupPlatformVisibility[platform]) {
                              return null;
                            }
                            return (
                              <div
                                key={platform}
                                className="flex flex-col gap-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                                    {getPlatformLabel(platform)}
                                  </div>
                                  <Button
                                    color="ghost"
                                    size="toolbar"
                                    onClick={() => {
                                      handleRemoveLifecyclePlatform(
                                        "cleanup",
                                        platform,
                                      );
                                    }}
                                  >
                                    <FormattedMessage
                                      id="settings.localEnvironments.environment.cleanup.platformOverrides.remove"
                                      defaultMessage="Remove"
                                      description="Button label to remove a cleanup script override"
                                    />
                                  </Button>
                                </div>
                                <textarea
                                  id={`local-environment-cleanup-platform-script-${platform}`}
                                  className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none focus-visible:ring-2"
                                  value={
                                    values.cleanupPlatformScripts[platform] ??
                                    ""
                                  }
                                  placeholder={CLEANUP_SCRIPT_PLACEHOLDER}
                                  rows={6}
                                  onChange={(event) => {
                                    handleLifecyclePlatformScriptChange(
                                      "cleanup",
                                      platform,
                                      event.target.value,
                                    );
                                  }}
                                />
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2">
                        {LIFECYCLE_PLATFORM_ORDER.map(
                          (platform): ReactElement | null => {
                            const isVisible =
                              values.cleanupPlatformVisibility[platform];
                            if (isVisible) {
                              return null;
                            }
                            return (
                              <Button
                                key={platform}
                                color="secondary"
                                size="toolbar"
                                className="w-auto"
                                onClick={() => {
                                  handleAddLifecyclePlatform(
                                    "cleanup",
                                    platform,
                                  );
                                }}
                              >
                                <FormattedMessage
                                  id="settings.localEnvironments.environment.cleanup.platformOverrides.add"
                                  defaultMessage="Add {platform} cleanup script"
                                  description="Button label to add a platform-specific cleanup script"
                                  values={{
                                    platform: getPlatformLabel(platform),
                                  }}
                                />
                              </Button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </SettingsSurface>
                </SettingsGroup.Content>
              </SettingsGroup>

              <SettingsGroup>
                <SettingsGroup.Header
                  title={
                    <FormattedMessage
                      id="settings.localEnvironments.actions.title"
                      defaultMessage="Actions"
                      description="Title for local environment actions section"
                    />
                  }
                  actions={
                    <Button
                      color="secondary"
                      size="toolbar"
                      onClick={handleAddAction}
                    >
                      <FormattedMessage
                        id="settings.localEnvironments.actions.add"
                        defaultMessage="Add action"
                        description="Button label to add a local environment action"
                      />
                    </Button>
                  }
                />
                <SettingsGroup.Content className="gap-1">
                  <div className="text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.localEnvironments.environment.actions.description"
                      defaultMessage="These actions can run any command and will be displayed in the header."
                      description="Description for local environment actions summary"
                    />
                  </div>
                  {values.actions.length === 0 ? (
                    <SettingsSurface>
                      <div className="p-3 text-sm text-token-text-secondary">
                        <FormattedMessage
                          id="settings.localEnvironments.actions.empty"
                          defaultMessage="Add an action to run commands from the local toolbar."
                          description="Empty state for local environment actions"
                        />
                      </div>
                    </SettingsSurface>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {values.actions.map((action): ReactElement => {
                        const selectedIconOption =
                          iconOptions.find(
                            (option): boolean =>
                              option.value === (action.icon ?? "tool"),
                          ) ?? iconOptions[0];
                        const isPlatformSpecific = action.platform != null;
                        const selectedPlatform =
                          action.platform ?? defaultPlatform;

                        return (
                          <div
                            key={action.id}
                            className="flex flex-col gap-3 rounded-lg border border-token-border bg-token-input-background p-3"
                          >
                            <div className="flex flex-col gap-2">
                              <label
                                className="text-xs font-medium tracking-wide text-token-text-secondary uppercase"
                                htmlFor={`local-env-action-name-${action.id}`}
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
                                      aria-label={selectedIconOption.label}
                                    >
                                      {selectedIconOption.icon}
                                    </Button>
                                  }
                                >
                                  {iconOptions.map((option): ReactElement => {
                                    return (
                                      <Dropdown.Item
                                        key={option.value}
                                        onSelect={() => {
                                          handleUpdateAction(action.id, {
                                            icon: option.value,
                                          });
                                        }}
                                      >
                                        <span className="flex items-center gap-2">
                                          {option.icon}
                                          <span>{option.label}</span>
                                        </span>
                                      </Dropdown.Item>
                                    );
                                  })}
                                </BasicDropdown>
                                <div className="flex-1">
                                  <input
                                    id={`local-env-action-name-${action.id}`}
                                    className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-1.5 text-sm text-token-text-primary outline-none focus-visible:ring-2"
                                    value={action.name}
                                    onChange={(event) => {
                                      handleUpdateAction(action.id, {
                                        name: event.target.value,
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label
                                className="text-xs font-medium tracking-wide text-token-text-secondary uppercase"
                                htmlFor={`local-env-action-command-${action.id}`}
                              >
                                <FormattedMessage
                                  id="settings.localEnvironments.actions.item.command"
                                  defaultMessage="Action script"
                                  description="Label for local environment action script"
                                />
                              </label>
                              <textarea
                                id={`local-env-action-command-${action.id}`}
                                className="focus-visible:ring-token-focus w-full rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none focus-visible:ring-2"
                                value={action.command}
                                placeholder={ACTION_SCRIPT_PLACEHOLDER}
                                rows={4}
                                onChange={(event) => {
                                  handleUpdateAction(action.id, {
                                    command: event.target.value,
                                  });
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                                <div className="min-w-0">
                                  <div className="flex flex-col gap-2">
                                    <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
                                      <FormattedMessage
                                        id="settings.localEnvironments.actions.item.platforms"
                                        defaultMessage="Platforms"
                                        description="Label for local environment action platforms"
                                      />
                                    </div>
                                    <div className="text-xs text-token-text-secondary">
                                      <FormattedMessage
                                        id="settings.localEnvironments.actions.item.platforms.help"
                                        defaultMessage="Only run on a specific OS."
                                        description="Help text for action platforms selection"
                                      />
                                    </div>
                                    <div className="relative flex items-center gap-2 text-sm">
                                      <Checkbox
                                        id={`local-env-action-platform-specific-${action.id}`}
                                        checked={isPlatformSpecific}
                                        onCheckedChange={(nextChecked) => {
                                          if (nextChecked) {
                                            handleUpdateAction(action.id, {
                                              platform: selectedPlatform,
                                            });
                                            return;
                                          }
                                          handleUpdateAction(action.id, {
                                            platform: null,
                                          });
                                        }}
                                      />
                                      <label
                                        className="text-token-text-secondary"
                                        htmlFor={`local-env-action-platform-specific-${action.id}`}
                                      >
                                        <FormattedMessage
                                          id="settings.localEnvironments.actions.item.platforms.specific"
                                          defaultMessage="Platform specific"
                                          description="Label for enabling platform-specific action selection"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                {isPlatformSpecific ? (
                                  <div className="flex justify-start">
                                    <SegmentedToggle<LocalEnvironmentPlatform>
                                      selectedId={selectedPlatform}
                                      onSelect={(platform) => {
                                        handleUpdateAction(action.id, {
                                          platform,
                                        });
                                      }}
                                      ariaLabel={intl.formatMessage({
                                        id: "settings.localEnvironments.actions.item.platforms.selector",
                                        defaultMessage: "Platform selection",
                                        description:
                                          "Aria label for platform selection toggle",
                                      })}
                                      options={platformToggleOptions}
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex justify-end sm:justify-center">
                                <Tooltip
                                  tooltipContent={
                                    <FormattedMessage
                                      id="settings.localEnvironments.actions.item.tooltip.delete"
                                      defaultMessage="Delete"
                                      description="Tooltip for removing a local environment action"
                                    />
                                  }
                                >
                                  <Button
                                    aria-label={intl.formatMessage({
                                      id: "settings.localEnvironments.actions.item.button.delete",
                                      defaultMessage: "Delete",
                                      description:
                                        "Label for removing a local environment action",
                                    })}
                                    color="ghost"
                                    size="toolbar"
                                    onClick={() => {
                                      handleRemoveAction(action.id);
                                    }}
                                  >
                                    <TrashIcon className="icon-sm" />
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SettingsGroup.Content>
              </SettingsGroup>

              {showPreview ? (
                <SettingsGroup>
                  <SettingsGroup.Header
                    title={
                      <div className="flex items-center gap-2">
                        <FormattedMessage
                          id="settings.localEnvironments.preview.title"
                          defaultMessage="Preview"
                          description="Title for local environment file preview"
                        />
                        <span className="text-xs text-token-text-secondary">
                          <FormattedMessage
                            id="settings.localEnvironments.preview.devOnly"
                            defaultMessage="(DEV only)"
                            description="Label to mark the preview as dev-only"
                          />
                        </span>
                      </div>
                    }
                  />
                  <SettingsGroup.Content>
                    <SettingsSurface className="p-3">
                      <CodeSnippet
                        language="toml"
                        content={tomlPreview}
                        showActionBar
                        removeTopBorderRadius
                      />
                    </SettingsSurface>
                  </SettingsGroup.Content>
                </SettingsGroup>
              ) : null}
              {saveConfig.error ? (
                <div className="text-sm text-token-error-foreground">
                  <FormattedMessage
                    id="settings.localEnvironments.preview.saveError"
                    defaultMessage="Failed to save the file. ({error})"
                    description="Error message when saving local environment file fails"
                    values={{ error: saveConfig.error.message }}
                  />
                </div>
              ) : null}
              <div className="flex justify-end">
                <Tooltip
                  disabled={saveDisabledTooltip == null}
                  tooltipContent={saveDisabledTooltip}
                >
                  <span className="inline-flex">
                    <Button
                      color="primary"
                      size="toolbar"
                      disabled={isSaveDisabled}
                      onClick={handleSave}
                    >
                      <FormattedMessage
                        id="settings.localEnvironments.preview.save"
                        defaultMessage="Save"
                        description="Save button label for local environment file"
                      />
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

function getInitialFormValues({
  name,
  setupScript,
  setupPlatformScripts,
  cleanupScript,
  cleanupPlatformScripts,
  actions,
}: {
  name: string;
  setupScript: string;
  setupPlatformScripts: LocalEnvironmentLifecyclePlatformScripts;
  cleanupScript: string;
  cleanupPlatformScripts: LocalEnvironmentLifecyclePlatformScripts;
  actions: Array<LocalEnvironmentActionDraft>;
}): LocalEnvironmentFormValues {
  return {
    name,
    setupScript,
    setupPlatformScripts,
    setupPlatformVisibility: getInitialPlatformVisibility(setupPlatformScripts),
    cleanupScript,
    cleanupPlatformScripts,
    cleanupPlatformVisibility: getInitialPlatformVisibility(
      cleanupPlatformScripts,
    ),
    actions,
  };
}

function buildTomlPreview(
  values: LocalEnvironmentFormValues,
  version: number,
): string {
  return buildEnvironmentToml({
    version,
    name: values.name,
    setupScript: values.setupScript,
    setupPlatformScripts: getNonEmptyPlatformScripts(
      values.setupPlatformScripts,
    ),
    cleanupScript: values.cleanupScript,
    cleanupPlatformScripts: getNonEmptyPlatformScripts(
      values.cleanupPlatformScripts,
    ),
    actions: values.actions,
  });
}

function getSaveDisabledReason({
  values,
  isDirty,
  isSaving,
}: {
  values: LocalEnvironmentFormValues;
  isDirty: boolean;
  isSaving: boolean;
}): SaveDisabledReason | null {
  if (isSaving) {
    return "saving";
  } else if (values.name.length === 0) {
    return "missing-name";
  } else if (!isDirty) {
    return "no-changes";
  }
  return null;
}

function getSaveDisabledTooltip(
  disabledReason: SaveDisabledReason | null,
): ReactElement | null {
  if (disabledReason == null) {
    return null;
  } else if (disabledReason === "missing-name") {
    return (
      <FormattedMessage
        id="settings.localEnvironments.save.disabled.name"
        defaultMessage="Add an environment name to save."
        description="Tooltip shown when save is disabled because the name is missing"
      />
    );
  } else if (disabledReason === "no-changes") {
    return (
      <FormattedMessage
        id="settings.localEnvironments.save.disabled.noChanges"
        defaultMessage="No changes to save."
        description="Tooltip shown when save is disabled because there are no changes"
      />
    );
  }
  return (
    <FormattedMessage
      id="settings.localEnvironments.save.disabled.saving"
      defaultMessage="Saving…"
      description="Tooltip shown when save is disabled because a save is already in progress"
    />
  );
}

function getLifecyclePlatformState(
  values: LocalEnvironmentFormValues,
  scriptType: LocalEnvironmentLifecycleType,
): {
  scriptField: "setupPlatformScripts" | "cleanupPlatformScripts";
  scripts: LocalEnvironmentLifecyclePlatformScripts;
  visibilityField: "setupPlatformVisibility" | "cleanupPlatformVisibility";
  visibility: Record<LocalEnvironmentPlatform, boolean>;
} {
  if (scriptType === "cleanup") {
    return {
      scriptField: "cleanupPlatformScripts",
      scripts: values.cleanupPlatformScripts,
      visibilityField: "cleanupPlatformVisibility",
      visibility: values.cleanupPlatformVisibility,
    };
  }

  return {
    scriptField: "setupPlatformScripts",
    scripts: values.setupPlatformScripts,
    visibilityField: "setupPlatformVisibility",
    visibility: values.setupPlatformVisibility,
  };
}

function getDefaultActionPlatform(
  platform: string | undefined,
): LocalEnvironmentPlatform {
  if (platform === "darwin" || platform === "linux" || platform === "win32") {
    return platform;
  }
  return "darwin";
}

function getActionPlatformToggleOptions(intl: IntlShape): Array<{
  id: LocalEnvironmentPlatform;
  label: string;
}> {
  return [
    {
      id: "darwin",
      label: intl.formatMessage(platformLabels.darwin),
    },
    {
      id: "linux",
      label: intl.formatMessage(platformLabels.linux),
    },
    {
      id: "win32",
      label: intl.formatMessage(platformLabels.win32),
    },
  ];
}

function getNonEmptyPlatformScripts(
  scripts: LocalEnvironmentLifecyclePlatformScripts,
): LocalEnvironmentLifecyclePlatformScripts {
  const filtered: LocalEnvironmentLifecyclePlatformScripts = {};
  for (const platform of LIFECYCLE_PLATFORM_ORDER) {
    const script = scripts[platform];
    if (script && script.length > 0) {
      filtered[platform] = script;
    }
  }
  return filtered;
}

function getInitialPlatformVisibility(
  scripts: LocalEnvironmentLifecyclePlatformScripts,
): Record<LocalEnvironmentPlatform, boolean> {
  const visibility: Record<LocalEnvironmentPlatform, boolean> = {
    darwin: false,
    linux: false,
    win32: false,
  };
  for (const platform of LIFECYCLE_PLATFORM_ORDER) {
    const script = scripts[platform];
    if (script && script.length > 0) {
      visibility[platform] = true;
    }
  }
  return visibility;
}

function getPlatformLabel(platform: LocalEnvironmentPlatform): ReactElement {
  if (platform === "darwin") {
    return <FormattedMessage {...platformLabels.darwin} />;
  }
  if (platform === "linux") {
    return <FormattedMessage {...platformLabels.linux} />;
  }
  return <FormattedMessage {...platformLabels[platform]} />;
}
