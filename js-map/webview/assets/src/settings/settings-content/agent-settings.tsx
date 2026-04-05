import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import { ConfigurationKeys, createGitCwd, type JsonValue } from "protocol";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router";

import {
  useAppServerConfigNotices,
  useDefaultAppServerManager,
} from "@/app-server/app-server-manager-hooks";
import {
  detectExternalAgentConfig,
  importExternalAgentConfig,
} from "@/app-server/requests/external-agent-config";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Markdown } from "@/components/markdown";
import { Spinner } from "@/components/spinner";
import { Alert } from "@/components/toaster/alert";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { WithWindow } from "@/components/with-window";
import { PermissionsModeDropdown } from "@/composer/permissions-mode-dropdown";
import { useIsScopedPermissionModesEnabled } from "@/composer/use-permissions-mode";
import { CODEX_CONFIG_BASIC_URL } from "@/constants/links";
import {
  getExternalAgentConfigItemTitle,
  sortExternalAgentConfigItems,
} from "@/external-agent-config/external-agent-config-utils";
import { useConfiguration } from "@/hooks/use-configuration";
import { useOsInfo } from "@/hooks/use-os-info";
import { useWindowType } from "@/hooks/use-window-type";
import AlertIcon from "@/icons/alert.svg";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import CheckIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import LockIcon from "@/icons/lock.svg";
import WarningIcon from "@/icons/warning.svg";
import {
  EFFECTIVE_CONFIG_QUERY_KEY,
  USER_CONFIG_QUERY_KEY,
  getFilePathForLayerSource,
  isManagedConfigLayerSource,
  resolveKeyOrigin,
  useConfigRequirements,
  useEffectiveConfig,
} from "@/queries/config-queries";
import { AppScope } from "@/scopes/app-scope";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { writeProjectConfigTomlValue } from "@/settings/settings-content/config-toml-writes";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { openConfigTomlMessages } from "@/sign-in/open-config-toml-messages";
import { useGate } from "@/statsig/statsig";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

type ScopeOption = {
  key: string;
  kind: "user" | "project" | "managed";
  label: string;
  subtext: string;
  filePath: string | null;
  expectedVersion: string | null;
  workspaceRoot: string | null;
  layer: AppServer.v2.ConfigLayer | null;
};

type ControlKey = "approval" | "sandbox" | "network";

type ScopeValues = {
  approvalPolicy: ApprovalOptionValue | null;
  sandboxMode: AppServer.v2.SandboxMode | null;
  networkAccess: boolean | null;
};

type ApprovalOptionValue = "untrusted" | "on-failure" | "on-request" | "never";

const APPROVAL_OPTIONS: Array<{
  value: ApprovalOptionValue;
  label: string;
  description: string;
}> = [
  {
    value: "untrusted",
    label: "Untrusted",
    description: "Always ask before taking action",
  },
  {
    value: "on-failure",
    label: "On failure",
    description: "Ask only when a command fails",
  },
  {
    value: "on-request",
    label: "On request",
    description: "Ask when escalation is requested",
  },
  {
    value: "never",
    label: "Never",
    description: "Run without asking for approval",
  },
];

const SANDBOX_OPTIONS: Array<{
  value: AppServer.v2.SandboxMode;
  label: string;
  description: string;
}> = [
  {
    value: "read-only",
    label: "Read only",
    description: "Can read files, but cannot edit them",
  },
  {
    value: "workspace-write",
    label: "Workspace write",
    description: "Can edit files, but only in this workspace",
  },
  {
    value: "danger-full-access",
    label: "Full access",
    description: "Can edit files outside this workspace",
  },
];

export function AgentSettings(): React.ReactElement {
  const appServerManager = useDefaultAppServerManager();
  const configNotices = useAppServerConfigNotices();
  const intl = useIntl();
  const isExternalAgentImportEnabled = useGate(
    __statsigName("codex-app-external-agent-import-enabled"),
  );
  const isScopedPermissionModesEnabled = useIsScopedPermissionModesEnabled();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const noticeOpenFile = useNoticeOpenFile();
  const [selectedImportKeys, setSelectedImportKeys] = useState<
    Record<string, boolean>
  >({});
  const homeMigrationQuery = useQuery({
    queryKey: ["external-agent-config", "detect", "home"],
    staleTime: 0,
    enabled: isExternalAgentImportEnabled,
    queryFn: async () => {
      const response = await detectExternalAgentConfig(appServerManager, {
        includeHome: true,
      });
      return response.items.filter(
        (item) => item.cwd == null && item.itemType !== "MCP_SERVER_CONFIG",
      );
    },
  });
  const importHomeMigration = useMutation({
    mutationFn: (
      migrationItems: Array<AppServer.v2.ExternalAgentConfigMigrationItem>,
    ) => importExternalAgentConfig(appServerManager, { migrationItems }),
    onSuccess: async () => {
      await Promise.all([
        homeMigrationQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: getQueryKey("codex-agents-md"),
        }),
        queryClient.invalidateQueries({ queryKey: ["skills"] }),
      ]);
      scope
        .get(toast$)
        .success(
          <FormattedMessage
            id="settings.agent.importSettings.success"
            defaultMessage="Imported external settings"
            description="Toast shown after importing supported external settings into Codex"
          />,
        );
    },
    onError: () => {
      scope
        .get(toast$)
        .danger(
          <FormattedMessage
            id="settings.agent.importSettings.error"
            defaultMessage="Unable to import external settings"
            description="Toast shown when importing supported external settings fails"
          />,
        );
    },
  });
  const homeMigrationItems = useMemo(
    () => sortExternalAgentConfigItems(homeMigrationQuery.data ?? []),
    [homeMigrationQuery.data],
  );
  const isDetectingHomeMigration = homeMigrationQuery.isLoading;
  useEffect(() => {
    setSelectedImportKeys(
      Object.fromEntries(
        homeMigrationItems.map((item) => [getMigrationItemKey(item), true]),
      ),
    );
  }, [homeMigrationItems]);
  const selectedHomeMigrationItems = homeMigrationItems.filter(
    (item) => selectedImportKeys[getMigrationItemKey(item)] ?? false,
  );

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="agent" />}
      subtitle={
        <FormattedMessage
          id="settings.agent.configuration.subtitle.summary"
          defaultMessage="Configure approval policy and sandbox settings."
          description="Summary text for the configuration settings subtitle"
        />
      }
    >
      {isScopedPermissionModesEnabled ? (
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.agent.permissionsMode.groupTitle"
                defaultMessage="Permissions modes"
                description="Heading for the permissions mode section"
              />
            }
          />
          <SettingsSurface>
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.agent.permissionsMode.sectionTitle"
                  defaultMessage="Default permissions mode"
                  description="Heading for the permissions mode section"
                />
              }
              description={
                <FormattedMessage
                  id="settings.agent.permissionsMode.sectionDescription"
                  defaultMessage="Current global default for permissions mode. Active projects settings will override this."
                  description="Description for the permissions mode section"
                />
              }
              control={
                <PermissionsModeDropdown
                  conversationId={null}
                  appServerManagerOverride={null}
                />
              }
            />
          </SettingsSurface>
        </SettingsGroup>
      ) : null}
      <SettingsGroup>
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.agent.customConfig.sectionTitle"
              defaultMessage="Custom config.toml settings"
              description="Heading for the custom config.toml settings section"
            />
          }
          subtitle={
            <>
              <FormattedMessage
                id="settings.agent.customConfig.sectionSubtitle"
                defaultMessage="Advanced settings for fine-tuning control."
                description="Subtitle for the custom config.toml section explaining these are advanced settings."
              />{" "}
              <a
                className="text-token-text-primary hover:text-token-text-primary/80"
                href={CODEX_CONFIG_BASIC_URL}
                target="_blank"
                rel="noreferrer"
              >
                <FormattedMessage
                  id="settings.agent.configuration.subtitle.learnMore"
                  defaultMessage="Learn more."
                  description="Link text to learn more about configuration settings"
                />
              </a>
            </>
          }
        />
        <SettingsGroup.Content>
          {configNotices.map((configNotice, index) => (
            <Alert
              key={`${index}:${configNotice.kind}:${configNotice.summary}:${configNotice.path ?? ""}`}
              fullWidth
              icon={AlertIcon}
              level={configNotice.level}
              className={index === configNotices.length - 1 ? "mb-3" : "mb-2"}
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="min-w-0 text-sm text-token-text-primary">
                      <Markdown
                        cwd={null}
                        className="[&>p]:my-0"
                        textSize="text-sm"
                      >
                        {configNotice.summary}
                      </Markdown>
                    </div>
                    {configNotice.details != null &&
                    configNotice.details.length > 0 ? (
                      <div className="min-w-0 text-sm text-token-text-secondary">
                        <Markdown
                          cwd={null}
                          className="[&>p]:my-0"
                          textSize="text-sm"
                        >
                          {configNotice.details}
                        </Markdown>
                      </div>
                    ) : null}
                    {configNotice.path != null ? (
                      <div className="min-w-0 text-sm text-token-text-secondary">
                        <FormattedMessage
                          id="settings.agent.configuration.notice.fileContext"
                          defaultMessage="File: {path}{location}"
                          description="File path and optional location for a config or rules warning shown in settings"
                          values={{
                            path: <code>{configNotice.path}</code>,
                            location:
                              configNotice.range != null ? (
                                <FormattedMessage
                                  id="settings.agent.configuration.notice.fileLocationSuffix"
                                  defaultMessage=" (line {line}, column {column})"
                                  description="Suffix showing the line and column for a config warning in settings"
                                  values={{
                                    line: configNotice.range.start.line,
                                    column: configNotice.range.start.column,
                                  }}
                                />
                              ) : (
                                ""
                              ),
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  {configNotice.path != null ? (
                    <Button
                      color="secondary"
                      size="toolbar"
                      className="inline-flex w-fit shrink-0"
                      onClick={() => {
                        if (configNotice.path == null) {
                          return;
                        }
                        noticeOpenFile.open({
                          path: configNotice.path,
                          ...(configNotice.range != null
                            ? { range: configNotice.range }
                            : {}),
                        });
                      }}
                    >
                      <FormattedMessage
                        id="settings.agent.configuration.notice.openFile"
                        defaultMessage="Open file"
                        description="Button label to open the file associated with a config or rules warning"
                      />
                    </Button>
                  ) : null}
                </div>
              </div>
            </Alert>
          ))}

          <WithWindow electron>
            <ElectronConfigEditor />
          </WithWindow>

          <WithWindow extension browser>
            <SettingsSurface>
              <SettingsRow
                label={
                  <FormattedMessage
                    id="settings.agent.configuration.configToml"
                    defaultMessage="config.toml"
                    description="Label for config.toml open button"
                  />
                }
                description={
                  <>
                    <FormattedMessage
                      id="settings.agent.configuration.configToml.description"
                      defaultMessage="Edit your config to customize agent behavior"
                      description="Description for config.toml open row"
                    />{" "}
                    <span className="block" />
                    <FormattedMessage
                      id="settings.agent.configuration.configToml.restartNote"
                      defaultMessage="Restart Codex after editing to apply changes"
                      description="Note that config.toml changes require a restart"
                    />{" "}
                    <a
                      className="inline-flex items-center gap-1 text-token-text-secondary hover:text-token-text-primary"
                      href={CODEX_CONFIG_BASIC_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FormattedMessage
                        id="settings.agent.configuration.configToml.docs"
                        defaultMessage="Docs"
                        description="Link label for config documentation"
                      />
                      <LinkExternalIcon className="icon-xxs" />
                    </a>
                  </>
                }
                control={<OpenConfigTomlButton />}
              />
              <OpenSourceLicensesRow />
            </SettingsSurface>
          </WithWindow>
        </SettingsGroup.Content>
      </SettingsGroup>
      {isExternalAgentImportEnabled ? (
        <SettingsGroup className="gap-2">
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.agent.importSettings.sectionTitle"
                defaultMessage="Import external agent config"
                description="Heading for the inline external agent config import section"
              />
            }
            subtitle={
              <FormattedMessage
                id="settings.agent.importSettings.sectionSubtitle"
                defaultMessage="Detect and import migratable settings from another agent."
                description="Subtitle for the inline external agent config import section"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              {isDetectingHomeMigration ? (
                <SettingsRow
                  label={
                    <FormattedMessage
                      id="settings.agent.importSettings.loadingLabel"
                      defaultMessage="Checking for imports"
                      description="Label shown while home-scoped external config migration items are loading"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="settings.agent.importSettings.detectingDescription"
                      defaultMessage="Checking for compatible external settings, AGENTS.md, and skills"
                      description="Description shown while home-scoped external config migration items are loading"
                    />
                  }
                  control={<Spinner className="h-4 w-4" />}
                />
              ) : homeMigrationItems.length === 0 ? (
                <SettingsRow
                  label={
                    <FormattedMessage
                      id="settings.agent.importSettings.emptyLabel"
                      defaultMessage="No imports found"
                      description="Label shown when no home-scoped external config migration items are available"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="settings.agent.importSettings.emptyDescription"
                      defaultMessage="No external settings were found. You're all caught up!"
                      description="Description for the import settings row when no home-scoped external config items are available"
                    />
                  }
                  control={
                    <Button color="secondary" size="toolbar" disabled>
                      <FormattedMessage
                        id="settings.agent.importSettings.emptyAction"
                        defaultMessage="Apply selected"
                        description="Disabled action label when no home-scoped external config items are available"
                      />
                    </Button>
                  }
                />
              ) : (
                <>
                  {homeMigrationItems.map((item) => (
                    <SettingsRow
                      key={getMigrationItemKey(item)}
                      label={getExternalAgentConfigItemTitle(intl, item)}
                      description={item.description}
                      control={
                        <Checkbox
                          className="h-4 w-4 rounded-[3px]"
                          checked={
                            selectedImportKeys[getMigrationItemKey(item)] ??
                            false
                          }
                          disabled={importHomeMigration.isPending}
                          onCheckedChange={(nextChecked: boolean) => {
                            setSelectedImportKeys((prev) => ({
                              ...prev,
                              [getMigrationItemKey(item)]: nextChecked,
                            }));
                          }}
                        />
                      }
                    />
                  ))}
                  <SettingsRow
                    label={
                      <FormattedMessage
                        id="settings.agent.importSettings.summaryLabel"
                        defaultMessage="{count} selected"
                        description="Summary label for selected home-scoped external config migration items"
                        values={{ count: selectedHomeMigrationItems.length }}
                      />
                    }
                    description={
                      <FormattedMessage
                        id="settings.agent.importSettings.summaryDescription"
                        defaultMessage="Import selected config. Restart Codex to apply all changes."
                        description="Summary description for the inline external agent config import section"
                      />
                    }
                    control={
                      <Button
                        color="secondary"
                        size="toolbar"
                        loading={importHomeMigration.isPending}
                        disabled={selectedHomeMigrationItems.length === 0}
                        onClick={() => {
                          void importHomeMigration.mutateAsync(
                            selectedHomeMigrationItems,
                          );
                        }}
                      >
                        <FormattedMessage
                          id="settings.agent.importSettings.applySelected"
                          defaultMessage="Apply selected"
                          description="Button label to apply selected home-scoped external config migration items"
                        />
                      </Button>
                    }
                  />
                </>
              )}
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      ) : null}
    </SettingsContentLayout>
  );
}

function ElectronConfigEditor(): React.ReactElement {
  const appServerManager = useDefaultAppServerManager();
  const intl = useIntl();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedScopeKey, setSelectedScopeKey] = useState<string | null>(null);
  const [pendingControl, setPendingControl] = useState<ControlKey | null>(null);
  const [errorByControl, setErrorByControl] = useState<
    Partial<Record<ControlKey, string>>
  >({});
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const workspaceRootFromState = getWorkspaceRootFromSettingsState(
    location.state,
  );
  const workspaceRoot = workspaceRootFromState.hasValue
    ? workspaceRootFromState.workspaceRoot
    : (workspaceRoots?.roots?.[0] ?? null);
  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  const { data: effectiveConfigData, isPending: isEffectiveConfigPending } =
    useEffectiveConfig(workspaceRoot);
  const { data: configRequirementsData, isPending: isRequirementsPending } =
    useConfigRequirements();
  const openFile = useMutationFromVSCode("open-file");

  const effectiveConfig = effectiveConfigData?.config ?? null;
  const configLayers = effectiveConfigData?.layers ?? null;
  const configOrigins = effectiveConfigData?.origins ?? null;
  const requirements = configRequirementsData?.requirements ?? null;
  const userLayer =
    configLayers?.find((layer) => layer.name.type === "user") ?? null;
  const managedLayer =
    configLayers?.find((layer) => isManagedConfigLayerSource(layer.name)) ??
    null;
  const userConfigPath =
    codexHomeData?.codexHome != null
      ? `${codexHomeData.codexHome}/config.toml`
      : null;
  const scopeOptions: Array<ScopeOption> = [
    ...collectProjectScopeOptions(configLayers, intl),
    {
      key: "user",
      kind: "user",
      label: intl.formatMessage({
        id: "settings.agent.configuration.scope.user",
        defaultMessage: "User config",
        description:
          "Label for the user config scope in configuration settings",
      }),
      subtext: "~/.codex/config.toml",
      filePath:
        userLayer != null
          ? getFilePathForLayerSource(userLayer.name)
          : userConfigPath,
      expectedVersion: userLayer?.version ?? null,
      workspaceRoot: null,
      layer: userLayer,
    },
    ...(managedLayer != null
      ? [
          {
            key: "managed",
            kind: "managed" as const,
            label: intl.formatMessage({
              id: "settings.agent.configuration.scope.managed",
              defaultMessage: "Admin config",
              description:
                "Label for the admin config scope in configuration settings",
            }),
            subtext: intl.formatMessage({
              id: "settings.agent.configuration.scope.managedDescription",
              defaultMessage: "Managed by admin policy",
              description:
                "Subtext for the admin config scope in configuration settings",
            }),
            filePath: getFilePathForLayerSource(managedLayer.name),
            expectedVersion: managedLayer.version,
            workspaceRoot: null,
            layer: managedLayer,
          },
        ]
      : []),
  ];
  const preferredScopeKey =
    workspaceRoot != null
      ? `project:${workspaceRoot}`
      : (scopeOptions[0]?.key ?? null);
  const selectedScope =
    scopeOptions.find((scope) => scope.key === selectedScopeKey) ??
    scopeOptions.find((scope) => scope.key === preferredScopeKey) ??
    scopeOptions[0] ??
    null;
  const { data: openInTargets } = useFetchFromVSCode("open-in-targets", {
    params: {
      cwd:
        selectedScope?.workspaceRoot != null
          ? createGitCwd(selectedScope.workspaceRoot)
          : workspaceRoot != null
            ? createGitCwd(workspaceRoot)
            : null,
    },
    queryConfig: {
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
      enabled: true,
    },
  });
  const selectedScopeValues = getScopeValues(
    selectedScope?.layer?.config ?? null,
  );
  const effectiveApprovalPolicy =
    toApprovalOptionValue(effectiveConfig?.approval_policy ?? null) ??
    "on-request";
  const effectiveSandboxMode =
    effectiveConfig?.sandbox_mode != null
      ? effectiveConfig.sandbox_mode
      : "read-only";
  const showInheritedNetworkAccess =
    selectedScopeValues.sandboxMode == null &&
    effectiveSandboxMode === "workspace-write";
  const showNetworkAccessRow =
    selectedScopeValues.sandboxMode === "workspace-write" ||
    showInheritedNetworkAccess;
  const currentApprovalPolicy =
    selectedScopeValues.approvalPolicy ?? effectiveApprovalPolicy;
  const currentSandboxMode =
    selectedScopeValues.sandboxMode ?? effectiveSandboxMode;
  const currentNetworkAccess =
    selectedScopeValues.networkAccess ??
    effectiveConfig?.sandbox_workspace_write?.network_access ??
    false;
  const approvalOrigin =
    configOrigins != null
      ? resolveKeyOrigin(configOrigins, "approval_policy", ["approvalPolicy"])
      : null;
  const sandboxOrigin =
    configOrigins != null
      ? resolveKeyOrigin(configOrigins, "sandbox_mode")
      : null;
  const networkOrigin =
    configOrigins != null
      ? resolveKeyOrigin(configOrigins, "sandbox_workspace_write", [
          "network_access",
        ])
      : null;
  const projectDisabledReason =
    selectedScope?.kind === "project"
      ? (selectedScope.layer?.disabledReason ?? null)
      : null;
  const selectedScopeLockReason = getScopeLockReason(selectedScope, intl);
  const approvalOptions = APPROVAL_OPTIONS.filter((option) =>
    requirements?.allowedApprovalPolicies == null ||
    requirements.allowedApprovalPolicies.length === 0
      ? true
      : requirements.allowedApprovalPolicies.includes(option.value),
  );
  const sandboxOptions = SANDBOX_OPTIONS.filter((option) =>
    requirements?.allowedSandboxModes == null ||
    requirements.allowedSandboxModes.length === 0
      ? true
      : requirements.allowedSandboxModes.includes(option.value),
  );

  async function writeValue(
    control: ControlKey,
    keyPath: string,
    value: AppServer.v2.ConfigEdit["value"],
  ): Promise<void> {
    if (selectedScope == null || selectedScope.filePath == null) {
      return;
    }
    if (pendingControl != null) {
      return;
    }

    setPendingControl(control);
    setErrorByControl((current) => ({ ...current, [control]: undefined }));

    try {
      if (selectedScope.kind === "project") {
        // App-server config writes currently only support the user config, so
        // project config edits fall back to a narrow local TOML write.
        await writeProjectConfigTomlValue({
          filePath: selectedScope.filePath,
          keyPath,
          value,
        });
      } else {
        await appServerManager.writeConfigValue({
          keyPath,
          value,
          mergeStrategy: "upsert",
          filePath: selectedScope.filePath,
          expectedVersion: selectedScope.expectedVersion,
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: EFFECTIVE_CONFIG_QUERY_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: USER_CONFIG_QUERY_KEY,
        }),
      ]);
    } catch (error) {
      setErrorByControl((current) => ({
        ...current,
        [control]: error instanceof Error ? error.message : "Unable to save",
      }));
    } finally {
      setPendingControl(null);
    }
  }

  const isLoading = isEffectiveConfigPending || isRequirementsPending;
  const approvalLockReason = getControlLockReason({
    intl,
    scopeLockReason: selectedScopeLockReason,
    origin: approvalOrigin,
    selectedScope,
    hasOptions: approvalOptions.length > 0,
    restrictedMessage: intl.formatMessage({
      id: "settings.agent.configuration.approval.restricted",
      defaultMessage: "Approval policy is restricted by this installation.",
      description:
        "Restriction message for approval policy in configuration settings",
    }),
  });
  const sandboxLockReason = getControlLockReason({
    intl,
    scopeLockReason: selectedScopeLockReason,
    origin: sandboxOrigin,
    selectedScope,
    hasOptions: sandboxOptions.length > 0,
    restrictedMessage: intl.formatMessage({
      id: "settings.agent.configuration.sandbox.restricted",
      defaultMessage: "Sandbox mode is restricted by this installation.",
      description:
        "Restriction message for sandbox mode in configuration settings",
    }),
  });
  const networkLockReason = getControlLockReason({
    intl,
    scopeLockReason: selectedScopeLockReason,
    origin: networkOrigin,
    selectedScope,
    hasOptions: true,
    restrictedMessage: "",
  });
  const controlsDisabled =
    isLoading || pendingControl != null || projectDisabledReason != null;

  return (
    <SettingsGroup>
      <SettingsGroup.Header
        title={
          <BasicDropdown
            align="start"
            contentClassName="w-[240px]"
            disabled={scopeOptions.length === 0}
            triggerButton={
              <Button
                color="secondary"
                size="toolbar"
                className="w-[240px] justify-between"
                disabled={scopeOptions.length === 0}
              >
                <span className="min-w-0 truncate text-left">
                  {selectedScope?.label ??
                    intl.formatMessage({
                      id: "settings.agent.configuration.scope.loading",
                      defaultMessage: "Loading…",
                      description:
                        "Fallback label while config scope options are loading",
                    })}
                </span>
                <ChevronIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
              </Button>
            }
          >
            {scopeOptions.map((scopeOption) => (
              <Dropdown.Item
                key={scopeOption.key}
                RightIcon={
                  selectedScope?.key === scopeOption.key ? CheckIcon : undefined
                }
                onSelect={() => {
                  setSelectedScopeKey(scopeOption.key);
                  setErrorByControl({});
                }}
                SubText={
                  <div className="pt-1 text-sm text-token-text-secondary">
                    {scopeOption.subtext}
                  </div>
                }
              >
                <span className="truncate text-sm">{scopeOption.label}</span>
              </Dropdown.Item>
            ))}
          </BasicDropdown>
        }
        actions={
          <Button
            color="secondary"
            size="toolbar"
            disabled={selectedScope?.filePath == null}
            onClick={() => {
              if (selectedScope?.filePath == null) {
                return;
              }
              openFile.mutate({
                path: selectedScope.filePath,
                cwd:
                  selectedScope.workspaceRoot != null
                    ? createGitCwd(selectedScope.workspaceRoot)
                    : null,
                target: openInTargets?.preferredTarget,
              });
            }}
          >
            <FormattedMessage
              id="settings.agent.configuration.scope.open"
              defaultMessage="Open config.toml"
              description="Button label to open the selected config file"
            />
            <ArrowTopRightIcon className="icon-2xs" />
          </Button>
        }
      />
      <SettingsGroup.Content>
        <SettingsSurface>
          {projectDisabledReason != null ? (
            <div className="flex items-start gap-2 p-3">
              <WarningIcon className="icon-xs mt-0.5 shrink-0 text-token-editor-warning-foreground" />
              <div className="text-sm text-token-text-secondary">
                {projectDisabledReason}
              </div>
            </div>
          ) : null}
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.agent.configuration.approval.label"
                defaultMessage="Approval policy"
                description="Label for approval policy in configuration settings"
              />
            }
            description={
              <ControlDescription
                error={errorByControl.approval}
                lockReason={approvalLockReason}
              >
                <FormattedMessage
                  id="settings.agent.configuration.approval.definition"
                  defaultMessage="Choose when Codex asks for approval"
                  description="Definition for approval policy in configuration settings"
                />
              </ControlDescription>
            }
            control={
              <BasicDropdown
                align="end"
                contentClassName="w-[320px]"
                disabled={controlsDisabled || approvalLockReason != null}
                triggerButton={
                  <Button
                    color="secondary"
                    size="toolbar"
                    className="h-auto min-h-[52px] w-[320px] justify-between px-3 py-2"
                    disabled={controlsDisabled || approvalLockReason != null}
                  >
                    <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                      <span className="truncate text-sm">
                        {getApprovalOption(currentApprovalPolicy)?.label ??
                          currentApprovalPolicy}
                      </span>
                      <span className="truncate text-sm text-token-text-secondary">
                        {getApprovalOption(currentApprovalPolicy)
                          ?.description ?? ""}
                      </span>
                    </span>
                    <ChevronIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
                  </Button>
                }
              >
                {approvalOptions.map((option) => (
                  <Dropdown.Item
                    key={option.value}
                    RightIcon={
                      option.value === currentApprovalPolicy
                        ? CheckIcon
                        : undefined
                    }
                    onSelect={() => {
                      void writeValue(
                        "approval",
                        "approval_policy",
                        option.value,
                      );
                    }}
                    SubText={
                      <div className="pt-1 text-sm text-token-text-secondary">
                        {option.description}
                      </div>
                    }
                  >
                    <span className="text-sm">{option.label}</span>
                  </Dropdown.Item>
                ))}
              </BasicDropdown>
            }
          />
          <SettingsRow
            label={
              <FormattedMessage
                id="settings.agent.configuration.sandbox.label"
                defaultMessage="Sandbox settings"
                description="Label for sandbox settings in configuration settings"
              />
            }
            description={
              <ControlDescription
                error={errorByControl.sandbox}
                lockReason={sandboxLockReason}
              >
                <FormattedMessage
                  id="settings.agent.configuration.sandbox.definition"
                  defaultMessage="Choose how much Codex can do when running commands"
                  description="Definition for sandbox settings in configuration settings"
                />
              </ControlDescription>
            }
            control={
              <BasicDropdown
                align="end"
                contentClassName="w-[320px]"
                disabled={controlsDisabled || sandboxLockReason != null}
                triggerButton={
                  <Button
                    color="secondary"
                    size="toolbar"
                    className="h-auto min-h-[52px] w-[320px] justify-between px-3 py-2"
                    disabled={controlsDisabled || sandboxLockReason != null}
                  >
                    <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                      <span className="truncate text-sm">
                        {getSandboxOption(currentSandboxMode)?.label ??
                          currentSandboxMode}
                      </span>
                      <span className="truncate text-sm text-token-text-secondary">
                        {getSandboxOption(currentSandboxMode)?.description ??
                          ""}
                      </span>
                    </span>
                    <ChevronIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
                  </Button>
                }
              >
                {sandboxOptions.map((option) => (
                  <Dropdown.Item
                    key={option.value}
                    RightIcon={
                      option.value === currentSandboxMode
                        ? CheckIcon
                        : undefined
                    }
                    onSelect={() => {
                      void writeValue("sandbox", "sandbox_mode", option.value);
                    }}
                    SubText={
                      <div className="pt-1 text-sm text-token-text-secondary">
                        {option.description}
                      </div>
                    }
                  >
                    <span className="text-sm">{option.label}</span>
                  </Dropdown.Item>
                ))}
              </BasicDropdown>
            }
          />
          {showNetworkAccessRow ? (
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.agent.configuration.network.label"
                  defaultMessage="Allow network access"
                  description="Label for network access in configuration settings"
                />
              }
              description={
                <ControlDescription
                  error={errorByControl.network}
                  lockReason={networkLockReason}
                >
                  <FormattedMessage
                    id="settings.agent.configuration.network.definition"
                    defaultMessage="Allow network access when the sandbox is set to workspace write"
                    description="Definition for network access in configuration settings"
                  />
                </ControlDescription>
              }
              control={
                <Toggle
                  checked={currentNetworkAccess}
                  disabled={controlsDisabled || networkLockReason != null}
                  onChange={(next) => {
                    void writeValue(
                      "network",
                      "sandbox_workspace_write.network_access",
                      next,
                    );
                  }}
                  ariaLabel={intl.formatMessage({
                    id: "settings.agent.configuration.network.ariaLabel",
                    defaultMessage: "Allow network access",
                    description:
                      "Aria label for network access toggle in configuration settings",
                  })}
                />
              }
            />
          ) : null}
        </SettingsSurface>
      </SettingsGroup.Content>
    </SettingsGroup>
  );
}

function ControlDescription({
  children,
  error,
  lockReason,
}: {
  children: React.ReactNode;
  error?: string;
  lockReason?: string | null;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <div>{children}</div>
      {lockReason != null ? (
        <div className="inline-flex items-center gap-1 text-sm text-token-editor-warning-foreground">
          <LockIcon className="icon-2xs" />
          <span>{lockReason}</span>
        </div>
      ) : null}
      {error != null ? (
        <div className="text-sm text-token-error-foreground">{error}</div>
      ) : null}
    </div>
  );
}

function OpenSourceLicensesRow(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.openSourceLicenses.rowLabel"
          defaultMessage="Open source licenses"
          description="Label for the open source licenses row"
        />
      }
      description={
        <FormattedMessage
          id="settings.openSourceLicenses.rowDescription"
          defaultMessage="Third-party notices for bundled dependencies"
          description="Description for the open source licenses row"
        />
      }
      control={
        <Button
          color="secondary"
          size="toolbar"
          onClick={(): void => {
            void navigate("/settings/open-source-licenses");
          }}
        >
          <FormattedMessage
            id="settings.openSourceLicenses.view"
            defaultMessage="View"
            description="Button label to open the open source licenses page"
          />
        </Button>
      }
    />
  );
}

function getMigrationItemKey(
  item: AppServer.v2.ExternalAgentConfigMigrationItem,
): string {
  return `${item.itemType}:${item.cwd ?? "home"}`;
}

function OpenConfigTomlButton(): React.ReactElement {
  const { data: osInfo } = useOsInfo();
  const { data: runInWslEnabled } = useConfiguration(
    ConfigurationKeys.RUN_CODEX_IN_WSL,
  );
  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  const noticeOpenFile = useNoticeOpenFile();

  const usingWslConfigToml =
    osInfo?.platform === "win32" && osInfo?.hasWsl && runInWslEnabled;
  const configPath =
    codexHomeData?.codexHome != null
      ? `${codexHomeData.codexHome}/config.toml`
      : null;
  const label = usingWslConfigToml ? (
    <FormattedMessage {...openConfigTomlMessages.openConfigTomlWsl} />
  ) : (
    <FormattedMessage {...openConfigTomlMessages.openConfigToml} />
  );

  return (
    <Button
      color="secondary"
      size="toolbar"
      className="inline-flex w-fit"
      onClick={() => {
        if (configPath == null) {
          return;
        }
        noticeOpenFile.open({ path: configPath });
      }}
      disabled={configPath == null}
    >
      {label}
    </Button>
  );
}

function useNoticeOpenFile(): {
  open: (notice: {
    path: string;
    range?: { start: { line: number; column: number } };
  }) => void;
} {
  const windowType = useWindowType();
  const { data: openInTargets } = useFetchFromVSCode("open-in-targets", {
    params: { cwd: null },
    queryConfig: {
      enabled: windowType === "electron",
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    },
  });
  const openFile = useMutationFromVSCode("open-file");
  const preferredTarget = openInTargets?.preferredTarget ?? undefined;

  return {
    open: (notice): void => {
      openFile.mutate({
        path: notice.path,
        cwd: null,
        target: preferredTarget,
        ...(notice.range != null
          ? {
              line: notice.range.start.line,
              column: notice.range.start.column,
            }
          : {}),
      });
    },
  };
}

function collectProjectScopeOptions(
  layers: AppServer.v2.ConfigReadResponse["layers"] | null,
  intl: ReturnType<typeof useIntl>,
): Array<ScopeOption> {
  if (layers == null) {
    return [];
  }

  const projectScopes: Array<ScopeOption> = [];
  for (const layer of layers) {
    if (layer.name.type !== "project") {
      continue;
    }

    const workspaceRoot = getWorkspaceRootFromDotCodexFolder(
      layer.name.dotCodexFolder,
    );
    projectScopes.push({
      key: `project:${workspaceRoot ?? layer.name.dotCodexFolder}`,
      kind: "project",
      label: intl.formatMessage(
        {
          id: "settings.agent.configuration.scope.project",
          defaultMessage: "{repoName} project config",
          description:
            "Label for a project config scope in configuration settings",
        },
        {
          repoName: getWorkspaceLabel(
            workspaceRoot ?? layer.name.dotCodexFolder,
          ),
        },
      ),
      subtext:
        getFilePathForLayerSource(layer.name) ?? layer.name.dotCodexFolder,
      filePath: getFilePathForLayerSource(layer.name),
      expectedVersion: layer.version,
      workspaceRoot,
      layer,
    });
  }

  return projectScopes;
}

function getWorkspaceRootFromSettingsState(state: unknown): {
  hasValue: boolean;
  workspaceRoot: string | null;
} {
  if (
    typeof state !== "object" ||
    state == null ||
    !("workspaceRoot" in state)
  ) {
    return { hasValue: false, workspaceRoot: null };
  }

  const workspaceRoot = state.workspaceRoot;
  if (workspaceRoot == null) {
    return { hasValue: true, workspaceRoot: null };
  }
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    return { hasValue: false, workspaceRoot: null };
  }

  return { hasValue: true, workspaceRoot };
}

function getWorkspaceRootFromDotCodexFolder(
  dotCodexFolder: string,
): string | null {
  if (dotCodexFolder.endsWith("/.codex")) {
    return dotCodexFolder.slice(0, -"/.codex".length);
  }
  if (dotCodexFolder.endsWith("\\.codex")) {
    return dotCodexFolder.slice(0, -"\\.codex".length);
  }
  return null;
}

function getWorkspaceLabel(workspaceRoot: string): string {
  return workspaceRoot.split(/[/\\]/).at(-1) || workspaceRoot;
}

function getScopeValues(value: JsonValue): ScopeValues {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      approvalPolicy: null,
      sandboxMode: null,
      networkAccess: null,
    };
  }

  const approvalPolicy = value.approval_policy;
  const sandboxMode = value.sandbox_mode;
  const sandboxWorkspaceWrite = value.sandbox_workspace_write;

  return {
    approvalPolicy: toApprovalOptionValue(approvalPolicy ?? null),
    sandboxMode:
      sandboxMode === "read-only" ||
      sandboxMode === "workspace-write" ||
      sandboxMode === "danger-full-access"
        ? sandboxMode
        : null,
    networkAccess:
      sandboxWorkspaceWrite != null &&
      typeof sandboxWorkspaceWrite === "object" &&
      !Array.isArray(sandboxWorkspaceWrite) &&
      typeof sandboxWorkspaceWrite.network_access === "boolean"
        ? sandboxWorkspaceWrite.network_access
        : null,
  };
}

function getScopeLockReason(
  scope: ScopeOption | null,
  intl: ReturnType<typeof useIntl>,
): string | null {
  if (scope == null) {
    return intl.formatMessage({
      id: "settings.agent.configuration.scope.unavailable",
      defaultMessage: "Config scope unavailable.",
      description:
        "Message shown when no config scope is available in configuration settings",
    });
  }
  if (scope.filePath == null) {
    return intl.formatMessage({
      id: "settings.agent.configuration.scope.readOnly",
      defaultMessage: "This config source cannot be edited here.",
      description:
        "Message shown when the selected config scope cannot be edited",
    });
  }
  return null;
}

function getControlLockReason({
  intl,
  scopeLockReason,
  origin,
  selectedScope,
  hasOptions,
  restrictedMessage,
}: {
  intl: ReturnType<typeof useIntl>;
  scopeLockReason: string | null;
  origin: AppServer.v2.ConfigLayerMetadata | null;
  selectedScope: ScopeOption | null;
  hasOptions: boolean;
  restrictedMessage: string;
}): string | null {
  if (scopeLockReason != null) {
    return scopeLockReason;
  }
  if (!hasOptions) {
    return restrictedMessage;
  }
  if (
    selectedScope?.kind !== "managed" &&
    origin != null &&
    isManagedConfigLayerSource(origin.name)
  ) {
    return intl.formatMessage({
      id: "settings.agent.configuration.control.managed",
      defaultMessage: "This value is managed by admin policy.",
      description:
        "Message shown when a configuration control is managed by admin policy",
    });
  }
  return null;
}

function getApprovalOption(
  value: ApprovalOptionValue,
): (typeof APPROVAL_OPTIONS)[number] | null {
  return APPROVAL_OPTIONS.find((option) => option.value === value) ?? null;
}

function getSandboxOption(
  value: AppServer.v2.SandboxMode,
): (typeof SANDBOX_OPTIONS)[number] | null {
  return SANDBOX_OPTIONS.find((option) => option.value === value) ?? null;
}

function toApprovalOptionValue(value: JsonValue): ApprovalOptionValue | null {
  return value === "untrusted" ||
    value === "on-failure" ||
    value === "on-request" ||
    value === "never"
    ? value
    : null;
}
