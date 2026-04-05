import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import FolderIcon from "@/icons/folder.svg";
import PlusIcon from "@/icons/plus.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsSurface } from "@/settings/settings-surface";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import {
  getDefaultLocalEnvironmentConfigPath,
  getNextLocalEnvironmentConfigPath,
} from "@/utils/local-environments";
import { normalizePath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

export function LocalEnvironmentWorkspaceSelection({
  groups,
  isLoading,
  onAddWorkspace,
  onCreateEnvironment,
  onSelectEnvironment,
}: {
  groups: Array<RepositoryTaskGroups>;
  isLoading: boolean;
  onAddWorkspace: () => void;
  onCreateEnvironment: (workspaceRoot: string, configPath: string) => void;
  onSelectEnvironment: (workspaceRoot: string, configPath: string) => void;
}): ReactElement {
  return (
    <SettingsGroup className="gap-2">
      <SettingsGroup.Header
        title={
          <FormattedMessage
            id="settings.localEnvironments.workspaceSelect.title"
            defaultMessage="Select a project"
            description="Title for the workspace selection step"
          />
        }
        actions={
          <Button color="secondary" size="toolbar" onClick={onAddWorkspace}>
            <FormattedMessage
              id="settings.localEnvironments.workspace.add"
              defaultMessage="Add project"
              description="Button label to add a new workspace"
            />
          </Button>
        }
      />
      <SettingsGroup.Content>
        <div className="flex flex-col gap-2">
          <LocalEnvironmentWorkspaceSelectionContent
            groups={groups}
            isLoading={isLoading}
            onAddWorkspace={onAddWorkspace}
            onCreateEnvironment={onCreateEnvironment}
            onSelectEnvironment={onSelectEnvironment}
          />
        </div>
      </SettingsGroup.Content>
    </SettingsGroup>
  );
}

function LocalEnvironmentWorkspaceSelectionContent({
  groups,
  isLoading,
  onAddWorkspace,
  onCreateEnvironment,
  onSelectEnvironment,
}: {
  groups: Array<RepositoryTaskGroups>;
  isLoading: boolean;
  onAddWorkspace: () => void;
  onCreateEnvironment: (workspaceRoot: string, configPath: string) => void;
  onSelectEnvironment: (workspaceRoot: string, configPath: string) => void;
}): ReactElement {
  const intl = useIntl();

  if (isLoading) {
    return (
      <SettingsSurface>
        <div className="flex items-center gap-2 p-3 text-sm text-token-text-secondary">
          <Spinner className="icon-xs" />
          <FormattedMessage
            id="settings.localEnvironments.workspaceSelect.loading"
            defaultMessage="Loading projects."
            description="Loading message while workspace options are fetched"
          />
        </div>
      </SettingsSurface>
    );
  }

  if (groups.length === 0) {
    return (
      <SettingsSurface>
        <div className="flex flex-col gap-3 p-3 text-sm text-token-text-secondary">
          <FormattedMessage
            id="settings.localEnvironments.workspaceSelect.empty"
            defaultMessage="No projects yet. Add one to configure local environments."
            description="Empty state when no workspace roots are available"
          />
          <div>
            <Button color="primary" size="toolbar" onClick={onAddWorkspace}>
              <FormattedMessage
                id="settings.localEnvironments.workspace.add"
                defaultMessage="Add project"
                description="Button label to add a new workspace"
              />
            </Button>
          </div>
        </div>
      </SettingsSurface>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="list"
      aria-label={intl.formatMessage({
        id: "settings.localEnvironments.workspaceSelect.listLabel",
        defaultMessage: "Available projects",
        description: "Aria label for the workspace selection list",
      })}
    >
      {groups.map((group): ReactElement => {
        return (
          <LocalEnvironmentWorkspaceGroupCard
            key={group.path}
            group={group}
            onCreateEnvironment={onCreateEnvironment}
            onSelectEnvironment={onSelectEnvironment}
          />
        );
      })}
    </div>
  );
}

function LocalEnvironmentWorkspaceGroupCard({
  group,
  onCreateEnvironment,
  onSelectEnvironment,
}: {
  group: RepositoryTaskGroups;
  onCreateEnvironment: (workspaceRoot: string, configPath: string) => void;
  onSelectEnvironment: (workspaceRoot: string, configPath: string) => void;
}): ReactElement {
  const intl = useIntl();
  const {
    data: environments = [],
    isLoading: environmentsLoading,
    error: environmentsError,
  } = useFetchFromVSCode("local-environments", {
    params: { workspaceRoot: group.path },
    select: (data) => data.environments,
  });
  const defaultEnvironmentConfigPath =
    getDefaultLocalEnvironmentConfigPath(environments);
  const codexWorktree = group.isCodexWorktree;
  const WorkspaceIcon = codexWorktree ? WorktreeIcon : FolderIcon;
  const ownerLabel = group.repositoryData?.ownerRepo?.owner ?? null;
  const showLoading = environmentsLoading;
  const hasError = environmentsError != null;
  const hasEnvironments = environments.length > 0;
  const environmentActionLabel = intl.formatMessage({
    id: "settings.localEnvironments.workspaceSelect.viewAction",
    defaultMessage: "View",
    description: "Action label to view a local environment",
  });
  const addEnvironmentLabel = intl.formatMessage({
    id: "settings.localEnvironments.workspaceSelect.addLabel",
    defaultMessage: "Add environment",
    description: "Aria label for add environment button",
  });
  const nextEnvironmentConfigPath = getNextLocalEnvironmentConfigPath(
    environments,
    group.path,
  );
  const loadingLabel = intl.formatMessage({
    id: "settings.localEnvironments.workspaceSelect.loadingLabel",
    defaultMessage: "Loading environment",
    description: "Label for environment row while loading",
  });
  const errorLabel = intl.formatMessage({
    id: "settings.localEnvironments.workspaceSelect.errorLabel",
    defaultMessage: "Environment needs attention",
    description: "Label for environment row when environment data fails",
  });

  return (
    <SettingsSurface className="p-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          className="flex min-w-0 items-center gap-3 text-left"
          type="button"
          onClick={(): void => {
            if (defaultEnvironmentConfigPath == null) {
              return;
            }
            onSelectEnvironment(group.path, defaultEnvironmentConfigPath);
          }}
        >
          <WorkspaceIcon className="icon-sm shrink-0 text-token-text-secondary" />
          <div className="flex min-w-0 items-center gap-2 text-sm text-token-text-primary">
            <span className="truncate font-medium">{group.label}</span>
            {ownerLabel ? (
              <span className="truncate text-token-text-secondary">
                {ownerLabel}
              </span>
            ) : null}
          </div>
        </button>
        <Button
          className="w-9 justify-center"
          aria-label={addEnvironmentLabel}
          color="secondary"
          size="toolbar"
          onClick={() => {
            onCreateEnvironment(group.path, nextEnvironmentConfigPath);
          }}
        >
          <PlusIcon className="icon-sm" />
        </Button>
      </div>
      {showLoading || hasError || hasEnvironments ? (
        <div className="border-t border-token-border">
          {showLoading ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-token-text-secondary">
                <Spinner className="icon-xs" />
                <span>{loadingLabel}</span>
              </div>
            </div>
          ) : hasError ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-token-error-foreground">
                <span>{errorLabel}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-token-border">
              {environments.map((environment): ReactElement => {
                const fileName = getEnvironmentFileName(environment.configPath);
                const hasName =
                  environment.type === "success" &&
                  environment.environment?.name != null &&
                  environment.environment.name.length > 0;
                const primaryLabel = hasName
                  ? environment.environment.name
                  : fileName;
                const showErrorLabel = environment.type === "error";
                const showSecondaryLabel =
                  showErrorLabel || (hasName && fileName !== primaryLabel);
                const secondaryLabel = showSecondaryLabel ? fileName : null;
                return (
                  <div
                    key={environment.configPath}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <button
                      className="flex min-w-0 flex-1 text-left"
                      type="button"
                      onClick={(): void => {
                        onSelectEnvironment(group.path, environment.configPath);
                      }}
                    >
                      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                        <span
                          className={
                            showErrorLabel
                              ? "text-token-error-foreground"
                              : "text-token-text-primary"
                          }
                        >
                          {showErrorLabel ? errorLabel : primaryLabel}
                        </span>
                        {secondaryLabel ? (
                          <span className="text-xs text-token-description-foreground">
                            {secondaryLabel}
                          </span>
                        ) : null}
                      </div>
                    </button>
                    <Button
                      color="ghost"
                      size="toolbar"
                      onClick={(): void => {
                        onSelectEnvironment(group.path, environment.configPath);
                      }}
                    >
                      {environmentActionLabel}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </SettingsSurface>
  );
}

function getEnvironmentFileName(configPath: string): string {
  const normalized = normalizePath(configPath);
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}
