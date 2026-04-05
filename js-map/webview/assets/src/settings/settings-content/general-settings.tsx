import { useQueryClient } from "@tanstack/react-query";
import {
  ConfigurationKeys,
  INTEGRATED_TERMINAL_SHELL_LABELS,
  type IntegratedTerminalShell,
  type ThreadDetailLevel,
} from "protocol";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import {
  BasicDropdown,
  Dropdown,
  DropdownSearchInput,
} from "@/components/dropdown";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { Toggle } from "@/components/toggle";
import { WithWindow } from "@/components/with-window";
import { useConfiguration } from "@/hooks/use-configuration";
import { useEnterBehavior } from "@/hooks/use-enter-behavior";
import { useFollowUpQueueMode } from "@/hooks/use-follow-up-queue-mode";
import { useIsAppsEnabled } from "@/hooks/use-is-apps-enabled";
import {
  THREAD_REALTIME_EXPERIMENTAL_FEATURE_NAME,
  THREAD_REALTIME_GATE,
  useIsThreadRealtimeEnabled,
} from "@/hooks/use-is-thread-realtime-enabled";
import { useOsInfo } from "@/hooks/use-os-info";
import { usePlatform } from "@/hooks/use-platform";
import { useWindowType } from "@/hooks/use-window-type";
import CheckIcon from "@/icons/check-md.svg";
import LaptopIcon from "@/icons/laptop.svg";
import MoonIcon from "@/icons/moon.svg";
import SunIcon from "@/icons/sun.svg";
import {
  ENGLISH_LANGUAGE,
  ENGLISH_OVERRIDE_LOCALE,
  getAvailableLocales,
  isEnglishLocaleCode,
  isLocaleOptionSelected,
  normalizeLocaleCode,
} from "@/intl/locale-resolver";
import { formatAccelerator } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import {
  useExperimentalFeatures,
  useSetExperimentalFeatureEnabled,
  useSetPluginsExperimentalFeatureEnabled,
} from "@/queries/experimental-features-queries";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import {
  useSetWindowsSandboxMode,
  useWindowsSandboxMode,
} from "@/queries/windows-sandbox-queries";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import {
  ChromeThemePreview,
  ChromeThemeRow,
} from "@/settings/settings-content/chrome-theme-row";
import { hotkeyWindowAcceleratorFromKeyboardEvent } from "@/settings/settings-content/hotkey-window-hotkey-utils";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import {
  SettingsDropdownTrigger,
  SettingsSectionTitleMessage,
} from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import {
  DEFAULT_THREAD_DETAIL_LEVEL,
  THREAD_DETAIL_LEVEL_STEPS_PROSE,
} from "@/settings/thread-detail-level";
import {
  useGate,
  useStatsigEventLogger,
  useStatsigLayer,
} from "@/statsig/statsig";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

import { NotificationsSettings } from "../notifications-settings";
import { SpeedSettingsRow } from "./speed-settings-row";

export type ThemePreference = "system" | "light" | "dark";

export const DEFAULT_SANS_FONT_SIZE = 13;
export const MIN_SANS_FONT_SIZE = 11;
export const MAX_SANS_FONT_SIZE = 16;
export const DEFAULT_CODE_FONT_SIZE = 12;
export const CODE_FONT_FAMILY_PLACEHOLDER =
  'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
export const MIN_CODE_FONT_SIZE = 8;
export const MAX_CODE_FONT_SIZE = 24;
const WINDOWS_INTEGRATED_TERMINAL_SHELL_OPTIONS: Array<IntegratedTerminalShell> =
  ["powershell", "commandPrompt", "gitBash", "wsl"];
let agentEnvironmentBeforeRestart: boolean | undefined;

export function GeneralSettings(): React.ReactElement {
  const isExperimentalSettingsEnabled = useGate(
    __statsigName("codex_app_experimental_settings"),
  );
  const isHotkeyWindowEnabled = useGate(
    __statsigName("codex-app-hotkey-window-enabled"),
  );

  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="general-settings" />}
    >
      <SettingsGroup>
        <SettingsGroup.Content>
          <SettingsSurface>
            <WithWindow electron>
              <DefaultOpenTargetRow />
            </WithWindow>
            <AgentEnvironmentRow />
            <WindowsIntegratedTerminalShellRow />
            <LanguageRow />
            <WithWindow electron>
              <ConversationDetailModeRow />
            </WithWindow>
            <WithWindow electron>
              {isHotkeyWindowEnabled ? <HotkeyWindowHotkeyRow /> : null}
            </WithWindow>
            <WithWindow electron>
              <PreventSleepWhileRunningRow />
            </WithWindow>
            <EnterBehaviorRow />
            <SpeedSettingsRow />
            <FollowUpQueueModeRow />
          </SettingsSurface>
        </SettingsGroup.Content>
      </SettingsGroup>

      <WithWindow electron>
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.general.notifications"
                defaultMessage="Notifications"
                description="Heading for notifications settings group"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              <NotificationsSettings />
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      </WithWindow>
      <WithWindow electron>
        {isExperimentalSettingsEnabled ? (
          <ExperimentalFeaturesSettingsGroup />
        ) : null}
      </WithWindow>
    </SettingsContentLayout>
  );
}

export function AppearanceSettingsContent(): React.ReactElement {
  return (
    <SettingsGroup>
      <SettingsGroup.Content>
        <SettingsSurface>
          <WithWindow electron>
            <ThemeRow />
            <div className="flex flex-col gap-2 p-1">
              <ChromeThemePreview />
              <ChromeThemeRow />
            </div>
            <UsePointerCursorsRow />
          </WithWindow>
          <SansFontRow />
          <CodeFontRow />
        </SettingsSurface>
      </SettingsGroup.Content>
    </SettingsGroup>
  );
}

function ExperimentalFeaturesSettingsGroup(): React.ReactElement {
  const intl = useIntl();
  const [showRestartNotice, setShowRestartNotice] = useState(false);
  const isThreadRealtimeGateEnabled = useGate(THREAD_REALTIME_GATE);
  const isThreadRealtimeEnabled = useIsThreadRealtimeEnabled();
  const isAppsEnabled = useIsAppsEnabled();
  const { data: experimentalFeatures = [], isLoading } =
    useExperimentalFeatures();
  const setExperimentalFeatureEnabled = useSetExperimentalFeatureEnabled();
  const setPluginsExperimentalFeatureEnabled =
    useSetPluginsExperimentalFeatureEnabled();
  const betaExperimentalFeatures = experimentalFeatures.filter((feature) => {
    return (
      feature.stage === "beta" &&
      feature.name !== "multi_agent" &&
      feature.name !== "plugins" &&
      feature.name !== "plugin"
    );
  });
  const shouldShowThreadRealtimeSetting =
    isThreadRealtimeGateEnabled &&
    experimentalFeatures.some((feature) => {
      return (
        feature.name === THREAD_REALTIME_EXPERIMENTAL_FEATURE_NAME &&
        feature.stage !== "beta"
      );
    });
  const threadRealtimeDisplayName = intl.formatMessage({
    id: "settings.general.experimentalFeatures.threadRealtime.name",
    defaultMessage: "Realtime voice",
    description:
      "Name of the experimental feature that enables realtime voice mode in thread composers",
  });
  const threadRealtimeDescription = intl.formatMessage({
    id: "settings.general.experimentalFeatures.threadRealtime.description",
    defaultMessage:
      "Talk to Codex in real time from the thread composer. Restart Codex after changing this setting.",
    description:
      "Description of the experimental feature that enables realtime voice mode in thread composers",
  });
  const pluginsFeature = experimentalFeatures.find((feature) => {
    return feature.name === "plugins";
  });
  const pluginsFeatureEnabled = pluginsFeature?.enabled ?? false;
  const experimentalFeatureRows = [
    ...(isAppsEnabled
      ? [
          {
            key: "plugins",
            label: intl.formatMessage({
              id: "settings.general.experimentalFeatures.plugins.label",
              defaultMessage: "Plugins",
              description: "Label for the plugins experimental feature toggle",
            }),
            description:
              pluginsFeature?.description ??
              intl.formatMessage({
                id: "settings.general.experimentalFeatures.plugins.description",
                defaultMessage: "Enable the plugins experience in Codex.",
                description:
                  "Description for the plugins experimental feature toggle",
              }),
            enabled: pluginsFeatureEnabled,
            onChange: (nextEnabled: boolean): void => {
              setPluginsExperimentalFeatureEnabled.mutate(
                {
                  enabled: nextEnabled,
                },
                {
                  onSuccess: () => {
                    setShowRestartNotice(true);
                  },
                },
              );
            },
          },
        ]
      : []),
    ...betaExperimentalFeatures.map((feature) => {
      return {
        key: feature.name,
        label: feature.displayName ?? feature.name,
        description: feature.description ?? undefined,
        enabled: feature.enabled,
        onChange: (nextEnabled: boolean): void => {
          setExperimentalFeatureEnabled.mutate(
            {
              featureName: feature.name,
              enabled: nextEnabled,
            },
            {
              onSuccess: () => {
                setShowRestartNotice(true);
              },
            },
          );
        },
      };
    }),
  ];
  const isMutationPending =
    setExperimentalFeatureEnabled.isPending ||
    setPluginsExperimentalFeatureEnabled.isPending;
  const hasExperimentalRows =
    experimentalFeatureRows.length > 0 || shouldShowThreadRealtimeSetting;

  return (
    <SettingsGroup>
      <SettingsGroup.Header
        title={
          <FormattedMessage
            id="settings.general.experimentalFeatures"
            defaultMessage="Experimental features (Beta)"
            description="Heading for beta experimental features settings group"
          />
        }
        subtitle={
          showRestartNotice ? (
            <div className="mb-2 block font-medium text-token-error-foreground">
              <FormattedMessage
                id="settings.general.experimentalFeatures.restartNote"
                defaultMessage="Restart Codex to apply experimental feature changes"
                description="Notice shown after changing an experimental feature to indicate restart is required"
              />
            </div>
          ) : undefined
        }
      />
      <SettingsGroup.Content>
        <SettingsSurface>
          {isLoading ? (
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.general.experimentalFeatures.loading"
                  defaultMessage="Loading experimental features…"
                  description="Loading label for beta experimental features settings group"
                />
              }
              control={<span className="h-5 w-8" />}
            />
          ) : null}
          {!isLoading && !hasExperimentalRows ? (
            <SettingsRow
              label={
                <FormattedMessage
                  id="settings.general.experimentalFeatures.empty"
                  defaultMessage="No beta experimental features available."
                  description="Empty label for beta experimental features settings group"
                />
              }
              control={<span className="h-5 w-8" />}
            />
          ) : null}
          {experimentalFeatureRows.map((feature) => {
            return (
              <SettingsRow
                key={feature.key}
                label={feature.label}
                description={feature.description}
                control={
                  <Toggle
                    checked={feature.enabled}
                    disabled={isMutationPending}
                    onChange={feature.onChange}
                    ariaLabel={intl.formatMessage(
                      {
                        id: "settings.general.experimentalFeatures.toggle",
                        defaultMessage: "Toggle {featureName}",
                        description:
                          "Aria label for toggling a beta experimental feature",
                      },
                      { featureName: feature.label },
                    )}
                  />
                }
              />
            );
          })}
          {shouldShowThreadRealtimeSetting ? (
            <SettingsRow
              label={threadRealtimeDisplayName}
              description={threadRealtimeDescription}
              control={
                <Toggle
                  checked={isThreadRealtimeEnabled}
                  disabled={setExperimentalFeatureEnabled.isPending}
                  onChange={(nextEnabled) => {
                    setExperimentalFeatureEnabled.mutate(
                      {
                        featureName: THREAD_REALTIME_EXPERIMENTAL_FEATURE_NAME,
                        enabled: nextEnabled,
                      },
                      {
                        onSuccess: () => {
                          setShowRestartNotice(true);
                        },
                      },
                    );
                  }}
                  ariaLabel={intl.formatMessage(
                    {
                      id: "settings.general.experimentalFeatures.toggle",
                      defaultMessage: "Toggle {featureName}",
                      description:
                        "Aria label for toggling a beta experimental feature",
                    },
                    { featureName: threadRealtimeDisplayName },
                  )}
                />
              }
            />
          ) : null}
        </SettingsSurface>
      </SettingsGroup.Content>
    </SettingsGroup>
  );
}

export function HotkeyWindowHotkeyRow(): React.ReactElement | null {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const windowType = useWindowType();
  const isSupported = windowType === "electron";
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: hotkeyState } = useFetchFromVSCode(
    "hotkey-window-hotkey-state",
    {
      queryConfig: { enabled: isSupported },
    },
  );
  const setHotkey = useMutationFromVSCode("hotkey-window-set-hotkey", {
    onSuccess: (response) => {
      const queryKey = getQueryKey("hotkey-window-hotkey-state");
      queryClient.setQueryData(queryKey, response.state);
      void invalidateQueriesAndBroadcast(queryKey);
    },
  });

  const applyHotkey = useCallback(
    async (hotkey: string | null): Promise<void> => {
      setErrorMessage(null);
      try {
        const response = await setHotkey.mutateAsync({ hotkey });
        if (!response.success) {
          setErrorMessage(response.error);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : intl.formatMessage({
                id: "settings.general.experimentalFeatures.hotkeyWindowHotkey.errorGeneric",
                defaultMessage: "Failed to update Popout Window hotkey.",
                description:
                  "Fallback error shown when hotkey window hotkey update fails",
              }),
        );
      }
    },
    [intl, setHotkey],
  );

  if (!isSupported || hotkeyState?.supported === false) {
    return null;
  }

  const configuredHotkey = hotkeyState?.configuredHotkey ?? null;
  const hotkeyLabel =
    configuredHotkey == null
      ? intl.formatMessage({
          id: "settings.general.experimentalFeatures.hotkeyWindowHotkey.off",
          defaultMessage: "Off",
          description: "Status label when hotkey window hotkey is disabled",
        })
      : formatAccelerator(configuredHotkey);

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.experimentalFeatures.hotkeyWindowHotkey.label"
          defaultMessage="Popout Window hotkey"
          description="Label for hotkey window hotkey setting"
        />
      }
      description={
        <div className="flex flex-col gap-1">
          <FormattedMessage
            id="settings.general.experimentalFeatures.hotkeyWindowHotkey.description"
            defaultMessage="Set a global shortcut for Popout Window. Leave unset to keep it off."
            description="Description for hotkey window hotkey setting"
          />
          {errorMessage ? (
            <span className="text-token-error-foreground">{errorMessage}</span>
          ) : null}
        </div>
      }
      control={
        isCapturing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              readOnly
              value={intl.formatMessage({
                id: "settings.general.experimentalFeatures.hotkeyWindowHotkey.capturePrompt",
                defaultMessage: "Press shortcut",
                description:
                  "Prompt shown while capturing hotkey window hotkey input",
              })}
              onBlur={() => {
                setIsCapturing(false);
              }}
              onKeyDown={(event): void => {
                if (event.repeat) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                if (event.key === "Escape") {
                  setIsCapturing(false);
                  return;
                }
                const accelerator = hotkeyWindowAcceleratorFromKeyboardEvent(
                  event.nativeEvent,
                );
                if (accelerator == null) {
                  return;
                }
                setIsCapturing(false);
                void applyHotkey(accelerator);
              }}
              aria-label={intl.formatMessage({
                id: "settings.general.experimentalFeatures.hotkeyWindowHotkey.captureAriaLabel",
                defaultMessage: "Popout Window hotkey capture",
                description:
                  "Aria label for hotkey window hotkey capture input",
              })}
              className="h-9 w-36 rounded-md border border-token-input-border bg-token-input-background px-2 text-sm text-token-input-foreground transition-colors outline-none focus:border-token-focus-border"
            />
            <Button
              color="ghost"
              size="toolbar"
              onMouseDown={(event): void => {
                event.preventDefault();
              }}
              onClick={() => {
                setIsCapturing(false);
              }}
            >
              <FormattedMessage
                id="settings.general.experimentalFeatures.hotkeyWindowHotkey.cancel"
                defaultMessage="Cancel"
                description="Button label to cancel hotkey window hotkey capture"
              />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="min-w-20 text-right text-sm text-token-text-secondary">
              {hotkeyLabel}
            </span>
            <Button
              color="secondary"
              size="toolbar"
              disabled={setHotkey.isPending}
              onClick={() => {
                setErrorMessage(null);
                setIsCapturing(true);
              }}
            >
              {configuredHotkey == null ? (
                <FormattedMessage
                  id="settings.general.experimentalFeatures.hotkeyWindowHotkey.set"
                  defaultMessage="Set"
                  description="Button label to set hotkey window hotkey"
                />
              ) : (
                <FormattedMessage
                  id="settings.general.experimentalFeatures.hotkeyWindowHotkey.change"
                  defaultMessage="Change"
                  description="Button label to change hotkey window hotkey"
                />
              )}
            </Button>
            {configuredHotkey != null ? (
              <Button
                color="ghost"
                size="toolbar"
                disabled={setHotkey.isPending}
                onClick={() => {
                  void applyHotkey(null);
                }}
              >
                <FormattedMessage
                  id="settings.general.experimentalFeatures.hotkeyWindowHotkey.clear"
                  defaultMessage="Clear"
                  description="Button label to clear hotkey window hotkey"
                />
              </Button>
            ) : null}
          </div>
        )
      }
    />
  );
}

function DefaultOpenTargetRow(): React.ReactElement {
  const windowType = useWindowType();
  const isSupported = windowType === "electron";
  const queryClient = useQueryClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();

  const { data } = useFetchFromVSCode("open-in-targets", {
    params: { cwd: null },
    queryConfig: {
      enabled: isSupported,
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    },
  });

  const setPreference = useMutationFromVSCode("set-preferred-app", {
    onSuccess: (_resp, variables) => {
      const queryKey = getQueryKey("open-in-targets", { cwd: null });
      queryClient.setQueryData(queryKey, (prev) =>
        prev ? { ...prev, preferredTarget: variables.target } : prev,
      );
      void invalidateQueriesAndBroadcast(queryKey);
    },
  });

  const targets = data?.targets ?? [];
  const current =
    data?.preferredTarget ??
    targets.find((target) => target.default)?.id ??
    null;

  const availableOptions = targets.filter(
    (target) => target.available !== false,
  );
  const selected = availableOptions.find((target) => target.id === current);

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.ide.defaultOpenTarget.label"
          defaultMessage="Default open destination"
          description="Label for default open-in target setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.ide.defaultOpenTarget.description"
          defaultMessage="Where files and folders open by default"
          description="Description for default open-in target setting"
        />
      }
      control={
        <BasicDropdown
          contentWidth="menuFixed"
          triggerButton={
            <SettingsDropdownTrigger
              disabled={!isSupported || availableOptions.length === 0}
            >
              {selected ? (
                <DropdownRow icon={selected.icon} label={selected.label} />
              ) : (
                <FormattedMessage
                  id="settings.ide.defaultOpenTarget.placeholder"
                  defaultMessage="No targets found"
                  description="Placeholder for default open-in target select"
                />
              )}
            </SettingsDropdownTrigger>
          }
          disabled={!isSupported || availableOptions.length === 0}
          align="end"
        >
          <div className="max-h-80 overflow-y-auto">
            {availableOptions.map((target) => (
              <Dropdown.Item
                key={target.id}
                onSelect={() => {
                  setPreference.mutate({ target: target.id });
                }}
              >
                <DropdownRow icon={target.icon} label={target.label} />
              </Dropdown.Item>
            ))}
          </div>
        </BasicDropdown>
      }
    />
  );
}

function WindowsIntegratedTerminalShellRow(): React.ReactElement | null {
  const { platform } = usePlatform();
  const windowType = useWindowType();
  const isSupported = windowType === "electron" && platform === "windows";

  const { data: shellOptions, isLoading: isLoadingShellOptions } =
    useFetchFromVSCode("terminal-shell-options", {
      queryConfig: {
        enabled: isSupported,
        staleTime: QUERY_STALE_TIME.ONE_MINUTE,
      },
    });
  const {
    data: configuredShell,
    setData,
    isLoading: isLoadingConfiguration,
  } = useConfiguration(ConfigurationKeys.INTEGRATED_TERMINAL_SHELL, {
    enabled: isSupported,
  });

  if (!isSupported) {
    return null;
  }

  const availableShells = shellOptions?.availableShells ?? [];
  const options = WINDOWS_INTEGRATED_TERMINAL_SHELL_OPTIONS.filter(
    (shellOption) => {
      if (shellOption === "gitBash" || shellOption === "wsl") {
        return availableShells.includes(shellOption);
      }

      return true;
    },
  );
  const selectedValue = configuredShell ?? "powershell";
  const selectedOption =
    options.find((option) => option === selectedValue) ?? options[0];
  const isDisabled =
    isLoadingShellOptions || isLoadingConfiguration || selectedOption == null;

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.openIn.integratedTerminalShell.label"
          defaultMessage="Integrated terminal shell"
          description="Label for integrated terminal shell setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.openIn.integratedTerminalShell.description"
          defaultMessage="Choose which shell opens in the integrated terminal."
          description="Description for integrated terminal shell setting"
        />
      }
      control={
        <BasicDropdown
          triggerButton={
            <SettingsDropdownTrigger disabled={isDisabled}>
              {selectedOption ? (
                <IntegratedTerminalShellLabel value={selectedOption} />
              ) : (
                <FormattedMessage
                  id="settings.openIn.integratedTerminalShell.unavailable"
                  defaultMessage="No shells available"
                  description="Placeholder shown when no integrated terminal shell options are available"
                />
              )}
            </SettingsDropdownTrigger>
          }
          align="end"
          disabled={isDisabled}
        >
          <div className="w-[220px] max-w-xs">
            {options.map((option) => (
              <Dropdown.Item
                key={option}
                onSelect={() => {
                  void setData(option);
                }}
                RightIcon={selectedValue === option ? CheckIcon : undefined}
              >
                <span className="text-sm">
                  <IntegratedTerminalShellLabel value={option} />
                </span>
              </Dropdown.Item>
            ))}
          </div>
        </BasicDropdown>
      }
    />
  );
}

function AgentEnvironmentRow(): React.ReactElement | null {
  const { data: osInfo } = useOsInfo();
  const supportsRunningInWsl =
    osInfo?.platform === "win32" &&
    osInfo?.hasWsl &&
    osInfo?.isVsCodeRunningInsideWsl === false;
  const { data: windowsSandboxMode } = useWindowsSandboxMode();
  const setWindowsSandboxMode = useSetWindowsSandboxMode();
  const {
    data: runCodexInWsl,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.RUN_CODEX_IN_WSL, {
    enabled: supportsRunningInWsl,
  });

  if (!supportsRunningInWsl || runCodexInWsl === undefined) {
    return null;
  }
  if (agentEnvironmentBeforeRestart == null) {
    agentEnvironmentBeforeRestart = runCodexInWsl;
  }

  const options: Array<{
    value: boolean;
    label: React.ReactElement;
    description: React.ReactElement;
  }> = [
    {
      value: false,
      label: (
        <FormattedMessage
          id="settings.agentEnvironment.windowsNative"
          defaultMessage="Windows native"
          description="Option label for running the agent natively on Windows"
        />
      ),
      description: (
        <FormattedMessage
          id="settings.agentEnvironment.windowsNative.description"
          defaultMessage="Run the agent directly in Windows"
          description="Description for the Windows native agent environment option"
        />
      ),
    },
    {
      value: true,
      label: (
        <FormattedMessage
          id="settings.agentEnvironment.wsl"
          defaultMessage="Windows Subsystem for Linux"
          description="Option label for running the agent inside WSL"
        />
      ),
      description: (
        <FormattedMessage
          id="settings.agentEnvironment.wsl.description"
          defaultMessage="Run the agent inside WSL"
          description="Description for the WSL agent environment option"
        />
      ),
    },
  ];
  const selected =
    options.find((option) => option.value === runCodexInWsl) ?? options[0];
  const currentEnvironment =
    options.find((option) => option.value === agentEnvironmentBeforeRestart) ??
    selected;
  const showRestartDisclaimer = runCodexInWsl !== agentEnvironmentBeforeRestart;

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.agentEnvironment.label"
          defaultMessage="Agent environment"
          description="Label for the agent environment setting"
        />
      }
      description={
        <>
          <FormattedMessage
            id="settings.agentEnvironment.description"
            defaultMessage="Choose where the agent runs on Windows"
            description="Description for the agent environment setting"
          />
          {showRestartDisclaimer ? (
            <>
              <span className="block" />
              <span className="text-token-error-foreground">
                <FormattedMessage
                  id="settings.agentEnvironment.restartNotice"
                  defaultMessage="Restart Codex to apply this change. The agent is still running in {currentEnvironment}."
                  description="Notice shown when the selected agent environment differs from the current pre-restart environment"
                  values={{
                    currentEnvironment: currentEnvironment.label,
                  }}
                />
              </span>
            </>
          ) : null}
        </>
      }
      control={
        <BasicDropdown
          triggerButton={
            <SettingsDropdownTrigger
              disabled={isLoading || setWindowsSandboxMode.isPending}
            >
              {selected.label}
            </SettingsDropdownTrigger>
          }
          disabled={isLoading || setWindowsSandboxMode.isPending}
          align="end"
        >
          <div className="w-[320px] max-w-xs space-y-1">
            {options.map((option) => (
              <Dropdown.Item
                key={String(option.value)}
                onSelect={() => {
                  void (async (): Promise<void> => {
                    if (option.value && windowsSandboxMode != null) {
                      await setWindowsSandboxMode.mutateAsync(null);
                    }
                    await setData(option.value);
                  })();
                }}
                RightIcon={
                  runCodexInWsl === option.value ? CheckIcon : undefined
                }
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm">{option.label}</span>
                  <span className="text-xs text-token-text-secondary">
                    {option.description}
                  </span>
                </div>
              </Dropdown.Item>
            ))}
          </div>
        </BasicDropdown>
      }
    />
  );
}

function IntegratedTerminalShellLabel({
  value,
}: {
  value: IntegratedTerminalShell;
}): React.ReactElement {
  return <>{INTEGRATED_TERMINAL_SHELL_LABELS[value]}</>;
}

function ConversationDetailModeRow(): React.ReactElement {
  const { data, setData, isLoading } = useConfiguration(
    ConfigurationKeys.CONVERSATION_DETAIL_MODE,
  );
  const mode = data ?? DEFAULT_THREAD_DETAIL_LEVEL;
  const options: Array<{
    value: ThreadDetailLevel;
    label: React.ReactElement;
    description: React.ReactElement;
  }> = [
    {
      value: THREAD_DETAIL_LEVEL_STEPS_PROSE,
      label: (
        <FormattedMessage
          id="settings.conversationDetail.steps"
          defaultMessage="Steps"
          description="Label for steps-only conversation detail setting"
        />
      ),
      description: (
        <FormattedMessage
          id="settings.conversationDetail.steps.description"
          defaultMessage="Hide commands and outputs"
          description="Description for steps-only conversation detail setting"
        />
      ),
    },
    {
      value: "STEPS_COMMANDS",
      label: (
        <FormattedMessage
          id="settings.conversationDetail.stepsWithCommands"
          defaultMessage="Steps with code commands"
          description="Label for steps with code commands conversation detail setting"
        />
      ),
      description: (
        <FormattedMessage
          id="settings.conversationDetail.stepsWithCommands.description"
          defaultMessage="Show commands, collapse output"
          description="Description for steps with code commands conversation detail setting"
        />
      ),
    },
    {
      value: "STEPS_EXECUTION",
      label: (
        <FormattedMessage
          id="settings.conversationDetail.stepsWithOutput"
          defaultMessage="Steps with code output"
          description="Label for steps with code output conversation detail setting"
        />
      ),
      description: (
        <FormattedMessage
          id="settings.conversationDetail.stepsWithOutput.description"
          defaultMessage="Show commands and expand output"
          description="Description for steps with code output conversation detail setting"
        />
      ),
    },
  ];

  const selected =
    options.find((option) => option.value === mode) ??
    options.find((option) => option.value === DEFAULT_THREAD_DETAIL_LEVEL) ??
    options[0];

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.threadDetail.label"
          defaultMessage="Thread detail"
          description="Label for thread detail level setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.threadDetail.description"
          defaultMessage="Choose how much command output to show in threads"
          description="Description for thread detail level setting"
        />
      }
      control={
        <BasicDropdown
          triggerButton={
            <SettingsDropdownTrigger disabled={isLoading}>
              {selected.label}
            </SettingsDropdownTrigger>
          }
          align="end"
        >
          <div className="w-[260px] max-w-xs space-y-1">
            {options.map((option) => (
              <Dropdown.Item
                key={option.value}
                onSelect={() => {
                  void setData(option.value);
                }}
                RightIcon={mode === option.value ? CheckIcon : undefined}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm">{option.label}</span>
                  <span className="text-xs text-token-text-secondary">
                    {option.description}
                  </span>
                </div>
              </Dropdown.Item>
            ))}
          </div>
        </BasicDropdown>
      }
    />
  );
}

function DropdownRow({
  icon,
  label,
}: {
  icon?: string;
  label: React.ReactNode;
}): React.ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      {icon ? (
        <img
          alt={typeof label === "string" ? label : ""}
          src={icon}
          className="icon-sm"
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function LanguageRow(): React.ReactElement | null {
  const intl = useIntl();
  const layer = useStatsigLayer(__statsigName("codex-i18n"));
  const isEnabled = layer?.get("enable_i18n", true);
  const [languageQuery, setLanguageQuery] = useState("");
  const { logEventWithStatsig } = useStatsigEventLogger();

  const {
    data: localeOverride,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.LOCALE_OVERRIDE, {
    enabled: isEnabled,
  });

  const localeOptions = useMemo(
    () =>
      [
        {
          code: ENGLISH_OVERRIDE_LOCALE,
          label: getLocaleDisplayName(
            ENGLISH_OVERRIDE_LOCALE,
            ENGLISH_OVERRIDE_LOCALE,
          ),
          localizedLabel: getLocaleDisplayName(ENGLISH_LANGUAGE, intl.locale),
        },
        ...getAvailableLocales().map((definition) => ({
          code: definition.locale,
          label: getLocaleDisplayName(definition.locale, definition.locale),
          localizedLabel: getLocaleDisplayName(definition.locale, intl.locale),
        })),
      ].sort((first, second) => first.label.localeCompare(second.label)),
    [intl.locale],
  );

  const normalizedOverride = normalizeLocaleCode(localeOverride);
  const selected =
    localeOptions.find((option) =>
      isLocaleOptionSelected(option.code, localeOverride),
    ) ?? null;
  const filteredLocales = useMemo(() => {
    const query = languageQuery.trim().toLowerCase();
    if (!query) {
      return localeOptions;
    }
    return localeOptions.filter((option) => {
      return (
        option.label.toLowerCase().includes(query) ||
        option.localizedLabel.toLowerCase().includes(query)
      );
    });
  }, [languageQuery, localeOptions]);

  if (!isEnabled) {
    return null;
  }

  const logSelection = (selection: string | null): void => {
    logEventWithStatsig("codex_i18n_language_selected", {
      selection: selection ?? "auto",
      surface: "settings",
    });
  };

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.ide.language.label"
          defaultMessage="Language"
          description="Label for language setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.ide.language.description"
          defaultMessage="Language for the app UI"
          description="Description for language setting"
        />
      }
      control={
        <BasicDropdown
          contentWidth="menuWide"
          disabled={localeOptions.length === 0}
          align="end"
          triggerButton={
            <SettingsDropdownTrigger disabled={localeOptions.length === 0}>
              {selected
                ? selected.label
                : intl.formatMessage({
                    id: "settings.ide.language.auto",
                    defaultMessage: "Auto Detect",
                    description: "Fallback label for auto language detect",
                  })}
            </SettingsDropdownTrigger>
          }
        >
          <div className="pb-1">
            <DropdownSearchInput
              value={languageQuery}
              onChange={(event) => setLanguageQuery(event.target.value)}
              placeholder={intl.formatMessage({
                id: "settings.ide.language.search",
                defaultMessage: "Search languages",
                description: "Search placeholder for language picker",
              })}
            />
          </div>
          <Dropdown.Item
            disabled={isLoading}
            RightIcon={normalizedOverride == null ? CheckIcon : undefined}
            onSelect={() => {
              void (async (): Promise<void> => {
                try {
                  await setData(null);
                  logSelection(null);
                } catch {
                  // Silently ignore failures; optimistic update is rolled back by useConfiguration.
                }
              })();
            }}
          >
            <FormattedMessage
              id="settings.ide.language.autoOption"
              defaultMessage="Auto Detect"
              description="Auto detect language option"
            />
          </Dropdown.Item>
          <div className="max-h-80 overflow-y-auto">
            {filteredLocales.map((option) => {
              const isSelected = isLocaleOptionSelected(
                option.code,
                localeOverride,
              );
              return (
                <Dropdown.Item
                  key={option.code}
                  disabled={isLoading}
                  RightIcon={isSelected ? CheckIcon : undefined}
                  onSelect={() => {
                    void (async (): Promise<void> => {
                      try {
                        const selectedCode = isEnglishLocaleCode(option.code)
                          ? ENGLISH_OVERRIDE_LOCALE
                          : option.code;
                        await setData(selectedCode);
                        logSelection(selectedCode);
                      } catch {
                        // Silently ignore failures; optimistic update is rolled back by useConfiguration.
                      }
                    })();
                  }}
                >
                  {/* fmt: allow raw labels for Intl.DisplayNames output */}
                  {/* oxlint-disable formatjs/no-literal-string-in-jsx */}
                  <span className="truncate">
                    {option.label}
                    {option.localizedLabel !== option.label
                      ? ` • ${option.localizedLabel}`
                      : ""}
                  </span>
                  {/* oxlint-enable formatjs/no-literal-string-in-jsx */}
                </Dropdown.Item>
              );
            })}
          </div>
        </BasicDropdown>
      }
    />
  );
}

function ThemeRow(): React.ReactElement {
  const intl = useIntl();
  const {
    data: themePreference,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.APPEARANCE_THEME);
  const selectedTheme: ThemePreference = themePreference ?? "system";

  const handleSelect = useCallback(
    (preference: ThemePreference): void => {
      if (isLoading) {
        return;
      }

      void setData(preference);
    },
    [isLoading, setData],
  );

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.appearance.theme"
          defaultMessage="Theme"
          description="Label for theme selector in appearance settings"
        />
      }
      description={
        <FormattedMessage
          id="settings.general.appearance.theme.description"
          defaultMessage="Use light, dark, or match your system"
          description="Description for theme selector in appearance settings"
        />
      }
      control={
        <SegmentedToggle<ThemePreference>
          selectedId={selectedTheme}
          onSelect={handleSelect}
          options={[
            {
              id: "light",
              label: (
                <ThemeOption
                  icon={<SunIcon className="icon-sm" />}
                  label={
                    <FormattedMessage
                      id="settings.general.appearance.theme.light"
                      defaultMessage="Light"
                      description="Light theme option"
                    />
                  }
                />
              ),
              ariaLabel: intl.formatMessage({
                id: "settings.general.appearance.theme.light",
                defaultMessage: "Light",
                description: "Light theme option",
              }),
            },
            {
              id: "dark",
              label: (
                <ThemeOption
                  icon={<MoonIcon className="icon-sm" />}
                  label={
                    <FormattedMessage
                      id="settings.general.appearance.theme.dark"
                      defaultMessage="Dark"
                      description="Dark theme option"
                    />
                  }
                />
              ),
              ariaLabel: intl.formatMessage({
                id: "settings.general.appearance.theme.dark",
                defaultMessage: "Dark",
                description: "Dark theme option",
              }),
            },
            {
              id: "system",
              label: (
                <ThemeOption
                  icon={<LaptopIcon className="icon-sm" />}
                  label={
                    <FormattedMessage
                      id="settings.general.appearance.theme.system"
                      defaultMessage="System"
                      description="System theme option"
                    />
                  }
                />
              ),
              ariaLabel: intl.formatMessage({
                id: "settings.general.appearance.theme.system",
                defaultMessage: "System",
                description: "System theme option",
              }),
            },
          ]}
        />
      }
    />
  );
}

function UsePointerCursorsRow(): React.ReactElement {
  const intl = useIntl();
  const {
    data: usePointerCursors,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.USE_POINTER_CURSORS);

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.appearance.usePointerCursors.label"
          defaultMessage="Use pointer cursors"
          description="Label for pointer cursor interaction setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.general.appearance.usePointerCursors.description"
          defaultMessage="Change the cursor to a pointer when hovering over interactive elements"
          description="Description for pointer cursor interaction setting"
        />
      }
      control={
        <Toggle
          checked={usePointerCursors === true}
          disabled={isLoading}
          onChange={(next) => {
            void setData(next);
          }}
          ariaLabel={intl.formatMessage({
            id: "settings.general.appearance.usePointerCursors.label",
            defaultMessage: "Use pointer cursors",
            description: "Label for pointer cursor interaction setting",
          })}
        />
      }
    />
  );
}

function FollowUpQueueModeRow(): React.ReactElement {
  const intl = useIntl();
  const { mode, setMode, isLoading } = useFollowUpQueueMode();
  const invertFollowUpShortcutLabel = formatAccelerator(
    "CmdOrCtrl+Shift+Enter",
  );

  const handleSelect = useCallback(
    (mode: "queue" | "steer"): void => {
      if (isLoading) {
        return;
      }

      void setMode(mode);
    },
    [isLoading, setMode],
  );

  return (
    <SettingsRow
      className="gap-6"
      label={
        <FormattedMessage
          id="settings.general.followUpQueueMode.label"
          defaultMessage="Follow-up behavior"
          description="Label for follow-up queue mode setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.general.followUpQueueMode.description"
          defaultMessage="Queue follow-ups while Codex runs or steer the current run. Press {invertFollowUpShortcutLabel} to do the opposite for one message."
          description="Description for follow-up queue mode setting"
          values={{ invertFollowUpShortcutLabel }}
        />
      }
      control={
        <SegmentedToggle<"queue" | "steer">
          selectedId={mode}
          onSelect={handleSelect}
          options={[
            {
              id: "queue",
              label: (
                <FormattedMessage
                  id="settings.general.followUpQueueMode.queue"
                  defaultMessage="Queue"
                  description="Queue follow-up option label"
                />
              ),
              ariaLabel: intl.formatMessage({
                id: "settings.general.followUpQueueMode.queue",
                defaultMessage: "Queue",
                description: "Queue follow-up option label",
              }),
            },
            {
              id: "steer",
              label: (
                <FormattedMessage
                  id="settings.general.followUpQueueMode.interrupt"
                  defaultMessage="Steer"
                  description="Steer follow-up option label"
                />
              ),
              ariaLabel: intl.formatMessage({
                id: "settings.general.followUpQueueMode.interrupt",
                defaultMessage: "Steer",
                description: "Steer follow-up option label",
              }),
            },
          ]}
        />
      }
    />
  );
}

function ThemeOption({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
}): React.ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="text-sm">{label}</span>
    </span>
  );
}

function SansFontRow(): React.ReactElement | null {
  const windowType = useWindowType();
  const isSupported = windowType === "electron";
  const intl = useIntl();

  const {
    data: sansFontSize,
    setData: setSansFontSize,
    isLoading: isFontSizeLoading,
  } = useConfiguration(ConfigurationKeys.SANS_FONT_SIZE, {
    enabled: isSupported,
  });
  const effectiveSansFontSize = sansFontSize ?? DEFAULT_SANS_FONT_SIZE;
  const isLoading = isFontSizeLoading;

  const commitFontSize = useCallback(
    (input: HTMLInputElement): void => {
      const fontSize = Number.parseFloat(input.value);
      if (Number.isNaN(fontSize)) {
        input.value = String(effectiveSansFontSize);
        return;
      }

      input.value = String(fontSize);
      if (fontSize === effectiveSansFontSize) {
        return;
      }

      void setSansFontSize(fontSize);
    },
    [effectiveSansFontSize, setSansFontSize],
  );

  if (!isSupported) {
    return null;
  }

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.appearance.sansFontSize.row"
          defaultMessage="UI font size"
          description="Label for UI font size setting"
        />
      }
      description={
        <FormattedMessage
          id="settings.general.appearance.sansFontSize.row.description"
          defaultMessage="Adjust the base size used for the Codex UI"
          description="Description for UI font size setting"
        />
      }
      control={
        <div className="flex items-center gap-2">
          <input
            key={effectiveSansFontSize}
            className="focus-visible:ring-token-focus h-token-button-composer w-16 rounded-lg border border-token-border bg-token-input-background px-2 py-0 text-right text-sm text-token-text-primary shadow-sm outline-none focus-visible:ring-2"
            type="number"
            min={MIN_SANS_FONT_SIZE}
            max={MAX_SANS_FONT_SIZE}
            step={1}
            disabled={isLoading}
            defaultValue={effectiveSansFontSize}
            onBlur={(event): void => {
              commitFontSize(event.currentTarget);
            }}
            onKeyDown={(event): void => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitFontSize(event.currentTarget);
              }
            }}
            aria-label={intl.formatMessage({
              id: "settings.general.appearance.sansFontSize",
              defaultMessage: "Sans font size",
              description: "Label for sans font size setting",
            })}
          />
          <span className="text-sm text-token-text-secondary">
            {intl.formatMessage({
              id: "settings.general.appearance.sansFontSize.units",
              defaultMessage: "px",
              description: "Unit label for sans font size setting",
            })}
          </span>
        </div>
      }
    />
  );
}

function CodeFontRow(): React.ReactElement {
  const intl = useIntl();

  const { data: codeFontSize, setData: setCodeFontSize } = useConfiguration(
    ConfigurationKeys.CODE_FONT_SIZE,
  );
  const effectiveCodeFontSize = codeFontSize ?? DEFAULT_CODE_FONT_SIZE;

  const commitFontSize = useCallback(
    (input: HTMLInputElement): void => {
      const fontSize = Number.parseFloat(input.value);
      if (Number.isNaN(fontSize)) {
        input.value = String(effectiveCodeFontSize);
        return;
      }

      input.value = String(fontSize);
      if (fontSize === effectiveCodeFontSize) {
        return;
      }

      void setCodeFontSize(fontSize);
    },
    [effectiveCodeFontSize, setCodeFontSize],
  );

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.appearance.codeFontSize.row"
          defaultMessage="Code font size"
          description="Label for code font size controls"
        />
      }
      description={
        <FormattedMessage
          id="settings.general.appearance.codeFontSize.row.description"
          defaultMessage="Adjust the base size used for code across chats and diffs"
          description="Description for code font size controls"
        />
      }
      control={
        <div className="flex items-center gap-2">
          <input
            key={effectiveCodeFontSize}
            className="focus-visible:ring-token-focus h-token-button-composer w-16 rounded-lg border border-token-border bg-token-input-background px-2 py-0 text-right text-sm text-token-text-primary shadow-sm outline-none focus-visible:ring-2"
            type="number"
            min={MIN_CODE_FONT_SIZE}
            max={MAX_CODE_FONT_SIZE}
            step={1}
            defaultValue={effectiveCodeFontSize}
            onBlur={(event): void => {
              commitFontSize(event.currentTarget);
            }}
            onKeyDown={(event): void => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitFontSize(event.currentTarget);
              }
            }}
            aria-label={intl.formatMessage({
              id: "settings.general.appearance.codeFontSize",
              defaultMessage: "Code font size",
              description: "Label for code font size setting",
            })}
          />
          <span className="text-sm text-token-text-secondary">
            {intl.formatMessage({
              id: "settings.general.appearance.codeFontSize.units",
              defaultMessage: "px",
              description: "Unit label for code font size setting",
            })}
          </span>
        </div>
      }
    />
  );
}

function EnterBehaviorRow(): React.ReactElement {
  const { enterBehavior, setEnterBehavior, isLoading } = useEnterBehavior();
  const { modifierSymbol } = usePlatform();
  const requiresCmdEnterForMultiline = enterBehavior === "cmdIfMultiline";

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.enterBehavior.label"
          defaultMessage="Require {modifierSymbol} + enter to send long prompts"
          description="Label for the enter key behavior toggle"
          values={{ modifierSymbol }}
        />
      }
      description={
        <FormattedMessage
          id="settings.general.enterBehavior.description"
          defaultMessage="When enabled, multiline prompts require {modifierSymbol} + enter to send."
          description="Description for the enter key behavior toggle"
          values={{ modifierSymbol }}
        />
      }
      control={
        <Toggle
          checked={requiresCmdEnterForMultiline}
          disabled={isLoading}
          onChange={(nextChecked) => {
            void setEnterBehavior(nextChecked ? "cmdIfMultiline" : "enter");
          }}
        />
      }
    />
  );
}

function PreventSleepWhileRunningRow(): React.ReactElement | null {
  const windowType = useWindowType();
  const { platform } = usePlatform();
  const isSupported = windowType === "electron" && platform !== "windows";
  const intl = useIntl();

  const {
    data: preventSleepWhileRunning,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.PREVENT_SLEEP_WHILE_RUNNING, {
    enabled: isSupported,
  });

  if (!isSupported) {
    return null;
  }

  return (
    <SettingsRow
      label={
        <FormattedMessage
          id="settings.general.power.preventSleepWhileRunning.label"
          defaultMessage="Prevent sleep while running"
          description="Label for preventing mac sleep while a thread runs"
        />
      }
      description={
        <FormattedMessage
          id="settings.general.power.preventSleepWhileRunning.description"
          defaultMessage="Keep your computer awake while Codex is running a thread."
          description="Description for preventing sleep while a thread runs"
        />
      }
      control={
        <Toggle
          checked={preventSleepWhileRunning ?? false}
          disabled={isLoading}
          onChange={(next) => {
            void setData(next);
          }}
          ariaLabel={intl.formatMessage({
            id: "settings.general.power.preventSleepWhileRunning.label",
            defaultMessage: "Prevent sleep while running",
            description: "Label for preventing mac sleep while a thread runs",
          })}
        />
      }
    />
  );
}

function getLocaleDisplayName(locale: string, displayLocale: string): string {
  try {
    const displayNames = new Intl.DisplayNames([displayLocale], {
      type: "language",
      languageDisplay: "standard",
    });
    return displayNames.of(locale) ?? locale;
  } catch {
    return locale;
  }
}
