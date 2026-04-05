import type { LocalEnvironment, LocalEnvironmentPlatform } from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { CodeSnippet } from "@/components/code-snippet";
import { platformLabels } from "@/settings/settings-content/local-environments/platform-labels";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSurface } from "@/settings/settings-surface";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";

import { ActionIcon } from "./local-environment-action-icon";
import { LocalEnvironmentSetupEnvVarsDialog } from "./local-environment-setup-env-vars-dialog";
import { LocalEnvironmentWorkspaceCard } from "./local-environment-workspace-card";

export function LocalEnvironmentOverview({
  workspaceRoot,
  workspaceGroup,
  configExists,
  initialEnvironment,
  parseErrorMessage,
  readErrorMessage,
  onEdit,
}: {
  workspaceRoot: string;
  workspaceGroup: RepositoryTaskGroups | null;
  configExists: boolean;
  initialEnvironment: LocalEnvironment | null;
  parseErrorMessage: string | null;
  readErrorMessage: string | null;
  onEdit: () => void;
}): ReactElement {
  const hasEnvironment = configExists && initialEnvironment != null;
  const actionItems = initialEnvironment?.actions ?? [];
  const setupScript = initialEnvironment?.setup.script ?? "";
  const cleanupScript = initialEnvironment?.cleanup?.script ?? "";
  const setupDarwinScript = initialEnvironment?.setup.darwin?.script ?? "";
  const setupLinuxScript = initialEnvironment?.setup.linux?.script ?? "";
  const setupWindowsScript = initialEnvironment?.setup.win32?.script ?? "";
  const cleanupDarwinScript = initialEnvironment?.cleanup?.darwin?.script ?? "";
  const cleanupLinuxScript = initialEnvironment?.cleanup?.linux?.script ?? "";
  const cleanupWindowsScript = initialEnvironment?.cleanup?.win32?.script ?? "";
  const hasSetupOverrides =
    setupDarwinScript.length > 0 ||
    setupLinuxScript.length > 0 ||
    setupWindowsScript.length > 0;
  const hasCleanupOverrides =
    cleanupDarwinScript.length > 0 ||
    cleanupLinuxScript.length > 0 ||
    cleanupWindowsScript.length > 0;

  return (
    <div className="flex flex-col gap-[var(--padding-panel)]">
      <SettingsGroup>
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.localEnvironments.workspace.title"
              defaultMessage="Project"
              description="Title for the workspace summary section"
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
          {hasEnvironment && initialEnvironment ? (
            <>
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
                    <span className="text-sm text-token-text-secondary">
                      {initialEnvironment.name}
                    </span>
                  }
                />
              </SettingsSurface>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                    <LocalEnvironmentSetupEnvVarsDialog />
                  </div>
                </div>
                <CodeSnippet
                  language="bash"
                  content={setupScript}
                  shouldWrapCode
                  codeContainerClassName="max-h-40"
                />
                {hasSetupOverrides ? (
                  <div className="flex flex-col gap-3">
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
                    {setupDarwinScript.length > 0 ? (
                      <SetupPlatformOverride
                        platform="darwin"
                        script={setupDarwinScript}
                      />
                    ) : null}
                    {setupLinuxScript.length > 0 ? (
                      <SetupPlatformOverride
                        platform="linux"
                        script={setupLinuxScript}
                      />
                    ) : null}
                    {setupWindowsScript.length > 0 ? (
                      <SetupPlatformOverride
                        platform="win32"
                        script={setupWindowsScript}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-token-text-primary">
                    <FormattedMessage
                      id="settings.localEnvironments.environment.cleanup.summaryTitle"
                      defaultMessage="Cleanup script"
                      description="Label for environment cleanup script input"
                    />
                  </div>
                  <div className="text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.localEnvironments.environment.cleanup.summaryDescription"
                      defaultMessage="This script will run before a worktree is deleted."
                      description="Description for environment cleanup script summary"
                    />
                  </div>
                </div>
                {cleanupScript.length > 0 ? (
                  <CodeSnippet
                    language="bash"
                    content={cleanupScript}
                    shouldWrapCode
                    codeContainerClassName="max-h-40"
                  />
                ) : (
                  <SettingsSurface>
                    <div className="p-3 text-sm text-token-text-secondary">
                      <FormattedMessage
                        id="settings.localEnvironments.environment.cleanup.empty"
                        defaultMessage="No cleanup script configured."
                        description="Empty state for the cleanup script summary"
                      />
                    </div>
                  </SettingsSurface>
                )}
                {hasCleanupOverrides ? (
                  <div className="flex flex-col gap-3">
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
                    {cleanupDarwinScript.length > 0 ? (
                      <SetupPlatformOverride
                        platform="darwin"
                        script={cleanupDarwinScript}
                      />
                    ) : null}
                    {cleanupLinuxScript.length > 0 ? (
                      <SetupPlatformOverride
                        platform="linux"
                        script={cleanupLinuxScript}
                      />
                    ) : null}
                    {cleanupWindowsScript.length > 0 ? (
                      <SetupPlatformOverride
                        platform="win32"
                        script={cleanupWindowsScript}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-token-text-primary">
                    <FormattedMessage
                      id="settings.localEnvironments.environment.actionsLabel"
                      defaultMessage="Actions"
                      description="Label for actions count in local environment summary"
                    />
                  </div>
                  <div className="text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.localEnvironments.environment.actions.description"
                      defaultMessage="These actions can run any command and will be displayed in the header."
                      description="Description for local environment actions summary"
                    />
                  </div>
                </div>
                <SettingsSurface>
                  <div className="flex flex-col gap-2 p-3">
                    {actionItems.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {actionItems.map((action, index): ReactElement => {
                          return (
                            <div
                              key={`${action.name}-${index}`}
                              className="flex items-center gap-2 text-sm text-token-text-secondary"
                            >
                              <span className="text-token-text-secondary">
                                <ActionIcon icon={action.icon ?? "tool"} />
                              </span>
                              <span>{action.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-token-text-secondary">
                        <FormattedMessage
                          id="settings.localEnvironments.actions.empty"
                          defaultMessage="Add an action to run commands from the local toolbar."
                          description="Empty state for local environment actions"
                        />
                      </div>
                    )}
                  </div>
                </SettingsSurface>
              </div>
            </>
          ) : (
            <SettingsSurface>
              <div className="p-3 text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.localEnvironments.environment.empty"
                  defaultMessage="No local environment is configured for this project yet."
                  description="Empty state when no local environment is configured"
                />
              </div>
            </SettingsSurface>
          )}
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
      <div className="flex justify-end">
        <Button color="primary" size="toolbar" onClick={onEdit}>
          {hasEnvironment ? (
            <FormattedMessage
              id="settings.localEnvironments.environment.edit"
              defaultMessage="Edit local environment"
              description="Button label to edit a local environment"
            />
          ) : (
            <FormattedMessage
              id="settings.localEnvironments.environment.create"
              defaultMessage="Create local environment"
              description="Button label to create a local environment"
            />
          )}
        </Button>
      </div>
    </div>
  );
}

function getSetupPlatformLabel(
  platform: LocalEnvironmentPlatform,
): ReactElement {
  if (platform === "darwin") {
    return <FormattedMessage {...platformLabels.darwin} />;
  } else if (platform === "linux") {
    return <FormattedMessage {...platformLabels.linux} />;
  } else {
    return <FormattedMessage {...platformLabels.win32} />;
  }
}

function SetupPlatformOverride({
  platform,
  script,
}: {
  platform: LocalEnvironmentPlatform;
  script: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
        {getSetupPlatformLabel(platform)}
      </div>
      <CodeSnippet
        language="bash"
        content={script}
        shouldWrapCode
        codeContainerClassName="max-h-40"
      />
    </div>
  );
}
