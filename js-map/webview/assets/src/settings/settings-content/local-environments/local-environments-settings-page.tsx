import type { ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useSearchParams } from "react-router";

import { CODEX_GUIDES_ENVIRONMENTS_URL } from "@/constants/links";
import { openLocalProjectPicker } from "@/project-setup/open-project-setup-dialog";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { useWorkspaceGroups } from "@/sidebar/use-repository-task-groups";
import { getDefaultLocalEnvironmentConfigPath } from "@/utils/local-environments";
import { useFetchFromVSCode } from "@/vscode-api";

import { LocalEnvironmentBreadcrumb } from "./local-environment-breadcrumb";
import { LocalEnvironmentEditor } from "./local-environment-editor";
import { LocalEnvironmentOverview } from "./local-environment-overview";
import { LocalEnvironmentWorkspaceSelection } from "./local-environment-workspace-selection";

export function LocalEnvironmentsSettings(): ReactElement {
  const [searchParams] = useSearchParams();
  const initialWorkspaceRoot = searchParams.get("workspaceRoot");
  const initialConfigPath = searchParams.get("configPath");
  const initialMode = searchParams.get("mode");
  const {
    data: workspaceRootOptionsResponse,
    isLoading: workspaceRootOptionsLoading,
  } = useFetchFromVSCode("workspace-root-options");
  const workspaceRootOptions = workspaceRootOptionsResponse?.roots ?? [];

  const workspaceGroups = useWorkspaceGroups();
  const localWorkspaceGroups = workspaceGroups.filter((group) => {
    return group.projectKind === "local";
  });

  const [selectedWorkspaceRoot, setSelectedWorkspaceRoot] = useState<
    string | null
  >(initialWorkspaceRoot);
  const [selectedEnvironmentConfigPath, setSelectedEnvironmentConfigPath] =
    useState<string | null>(initialConfigPath);
  const [isEditing, setIsEditing] = useState<boolean>(initialMode === "edit");
  const autoSelectedWorkspaceRoot =
    __STORYBOOK__ && workspaceRootOptions.length === 1
      ? workspaceRootOptions[0]
      : null;
  const rawWorkspaceRoot = selectedWorkspaceRoot ?? autoSelectedWorkspaceRoot;
  const resolvedWorkspaceRoot =
    rawWorkspaceRoot != null && workspaceRootOptions.includes(rawWorkspaceRoot)
      ? rawWorkspaceRoot
      : null;
  const selectedWorkspaceGroup =
    resolvedWorkspaceRoot != null
      ? (localWorkspaceGroups.find(
          (group): boolean => group.path === resolvedWorkspaceRoot,
        ) ?? null)
      : null;
  const showWorkspaceSelection = resolvedWorkspaceRoot == null;

  const handleAddWorkspace = (): void => {
    openLocalProjectPicker();
  };

  const handleChangeWorkspace = (): void => {
    setSelectedWorkspaceRoot(null);
    setSelectedEnvironmentConfigPath(null);
    setIsEditing(false);
  };

  const handleStartEditing = (): void => {
    setIsEditing(true);
  };

  const handleExitEditing = (): void => {
    setIsEditing(false);
  };

  const handleSelectEnvironmentForWorkspace = (
    workspaceRoot: string,
    configPath: string,
  ): void => {
    setSelectedWorkspaceRoot(workspaceRoot);
    setSelectedEnvironmentConfigPath(configPath);
    setIsEditing(false);
  };

  const handleCreateEnvironmentForWorkspace = (
    workspaceRoot: string,
    configPath: string,
  ): void => {
    setSelectedWorkspaceRoot(workspaceRoot);
    setSelectedEnvironmentConfigPath(configPath);
    setIsEditing(true);
  };

  const {
    data: environments = [],
    isLoading: environmentsLoading,
    error: environmentsError,
  } = useFetchFromVSCode("local-environments", {
    params: {
      workspaceRoot: resolvedWorkspaceRoot ?? "",
    },
    queryConfig: {
      enabled: !showWorkspaceSelection && resolvedWorkspaceRoot != null,
    },
    select: (data) => data.environments,
  });
  const defaultEnvironmentConfigPath =
    getDefaultLocalEnvironmentConfigPath(environments);
  const resolvedEnvironmentConfigPath =
    selectedEnvironmentConfigPath ?? defaultEnvironmentConfigPath ?? null;

  const {
    data: configData,
    isLoading: configLoading,
    error: configError,
  } = useFetchFromVSCode("local-environment-config", {
    params: {
      configPath: resolvedEnvironmentConfigPath ?? "",
    },
    queryConfig: {
      enabled:
        !showWorkspaceSelection &&
        resolvedWorkspaceRoot != null &&
        resolvedEnvironmentConfigPath != null,
    },
  });

  const {
    data: environmentResult,
    error: environmentError,
    isLoading: environmentLoading,
  } = useFetchFromVSCode("local-environment", {
    params: {
      configPath: configData?.configPath ?? "",
    },
    queryConfig: {
      enabled:
        !showWorkspaceSelection &&
        resolvedWorkspaceRoot != null &&
        !!configData?.exists,
    },
  });

  const initialEnvironment =
    environmentResult?.environment.type === "success"
      ? environmentResult.environment.environment
      : null;
  const parseErrorMessage =
    environmentResult?.environment.type === "error"
      ? environmentResult.environment.error.message
      : null;
  const readErrorMessage =
    configError?.message ??
    environmentError?.message ??
    environmentsError?.message ??
    null;
  const backSlot =
    resolvedWorkspaceRoot != null ? (
      <LocalEnvironmentBreadcrumb
        workspaceRoot={resolvedWorkspaceRoot}
        workspaceGroup={selectedWorkspaceGroup}
        mode={isEditing ? "edit" : undefined}
        onBack={isEditing ? handleExitEditing : handleChangeWorkspace}
      />
    ) : null;
  const isEnvironmentLoading =
    environmentsLoading || configLoading || environmentLoading;

  if (showWorkspaceSelection) {
    return (
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="local-environments" />}
        subtitle={
          <FormattedMessage
            id="settings.localEnvironments.workspaceSelect.description"
            defaultMessage="Local environments tell Codex how to set up worktrees for a project. {learnMore}"
            description="Description for the workspace selection step"
            values={{
              learnMore: (
                <a
                  className="inline-flex items-center gap-1 text-base text-token-text-link-foreground"
                  href={CODEX_GUIDES_ENVIRONMENTS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FormattedMessage
                    id="settings.localEnvironments.workspaceSelect.learnMore"
                    defaultMessage="Learn more."
                    description="Link label for local environments docs"
                  />
                </a>
              ),
            }}
          />
        }
      >
        <LocalEnvironmentWorkspaceSelection
          groups={localWorkspaceGroups}
          isLoading={workspaceRootOptionsLoading}
          onAddWorkspace={handleAddWorkspace}
          onCreateEnvironment={handleCreateEnvironmentForWorkspace}
          onSelectEnvironment={handleSelectEnvironmentForWorkspace}
        />
      </SettingsContentLayout>
    );
  }

  if (isEnvironmentLoading) {
    return (
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="local-environments" />}
        backSlot={backSlot}
      >
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.localEnvironments.loading.title"
                defaultMessage="Loading local environments"
                description="Loading state title for local environments settings"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              <div className="p-3 text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.localEnvironments.loading.body"
                  defaultMessage="Fetching your project configuration."
                  description="Loading state body for local environments settings"
                />
              </div>
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      </SettingsContentLayout>
    );
  }

  if (!configData || resolvedWorkspaceRoot == null) {
    return (
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="local-environments" />}
        backSlot={backSlot}
      >
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.localEnvironments.unavailable.title"
                defaultMessage="Local environments unavailable"
                description="Title for missing local environment config state"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              <div className="p-3 text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.localEnvironments.unavailable.body"
                  defaultMessage="We could not load local environment settings for this project."
                  description="Body text for missing local environment config state"
                />
              </div>
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      </SettingsContentLayout>
    );
  }

  if (isEditing) {
    return (
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="local-environments" />}
        backSlot={backSlot}
      >
        <LocalEnvironmentEditor
          workspaceRoot={resolvedWorkspaceRoot}
          workspaceGroup={selectedWorkspaceGroup}
          configPath={configData.configPath}
          configExists={configData.exists}
          initialEnvironment={initialEnvironment}
          parseErrorMessage={parseErrorMessage}
          readErrorMessage={readErrorMessage}
          onExitEdit={handleExitEditing}
        />
      </SettingsContentLayout>
    );
  }

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="local-environments" />}
      backSlot={backSlot}
    >
      <LocalEnvironmentOverview
        workspaceRoot={resolvedWorkspaceRoot}
        workspaceGroup={selectedWorkspaceGroup}
        configExists={configData.exists}
        initialEnvironment={initialEnvironment}
        parseErrorMessage={parseErrorMessage}
        readErrorMessage={readErrorMessage}
        onEdit={handleStartEditing}
      />
    </SettingsContentLayout>
  );
}
