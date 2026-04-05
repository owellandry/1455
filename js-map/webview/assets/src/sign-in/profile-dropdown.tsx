import clsx from "clsx";
import { useAtom } from "jotai";
import { useScope } from "maitai";
import { createConversationId, type ConversationId } from "protocol";
import type React from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useMatch, useNavigate } from "react-router";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useAuth } from "@/auth/use-auth";
import { useAccounts, useCurrentAccount } from "@/codex-api";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import {
  BasicDropdown,
  BasicSubDropdown,
  Dropdown,
  DropdownItem,
} from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import {
  CHATGPT_PRICING_URL,
  CHATGPT_WORKSPACE_SETTINGS_URL,
  CODEX_CONFIG_BASIC_URL,
  CODEX_MCP_URL,
} from "@/constants/links";
import { DEFAULT_SETTINGS_SECTION } from "@/constants/settings-sections";
import { useActiveConversationId } from "@/hooks/use-active-conversation-id";
import { useEnterBehavior } from "@/hooks/use-enter-behavior";
import { useGlobalState } from "@/hooks/use-global-state";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { usePlatform } from "@/hooks/use-platform";
import { useWindowType } from "@/hooks/use-window-type";
import AppsIcon from "@/icons/apps.svg";
import BuildingIcon from "@/icons/building.svg";
import CodexIcon from "@/icons/codex.svg";
import EditIcon from "@/icons/edit.svg";
import KeyboardIcon from "@/icons/keyboard.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import LogOutIcon from "@/icons/log-out.svg";
import OpenAIBlossom from "@/icons/openai-blossom.svg";
import ProfileIcon from "@/icons/profile.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import SkillsIcon from "@/icons/skills.svg";
import StuffIcon from "@/icons/stuff.svg";
import UpgradePlusIcon from "@/icons/upgrade-plus.svg";
import { messageBus } from "@/message-bus";
import { useRateLimit } from "@/queries/usage-queries";
import { RateLimitSummary } from "@/rate-limits/rate-limit-summary";
import { AppScope } from "@/scopes/app-scope";
import { useGate } from "@/statsig/statsig";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import {
  filterRateLimitEntries,
  getRateLimitEntries,
  getRateLimitName,
  shouldSuppressRateLimitUpsell,
} from "@/utils/use-rate-limit";
import { useFetchFromVSCode } from "@/vscode-api";

import { useCollaborationMode } from "../composer/use-collaboration-mode";
import { LanguageDropdown } from "./language-dropdown";
import { OpenConfigTomlDropdownItem } from "./open-config-toml-dropdown-item";
import { OpenOnStartupDropdown } from "./open-on-startup-dropdown";
import { aProfileDropdownOpen } from "./profile-dropdown-atoms";
import { QueueFollowUpsDropdown } from "./queue-follow-ups-dropdown";
import { TodoCodeLensDropdown } from "./todo-codelens-dropdown";
import { shouldShowUpgradeCta } from "./upgrade-cta-eligibility";

export function ProfileDropdown({
  triggerButton,
}: {
  triggerButton?: React.ReactElement;
}): React.ReactElement {
  const [open, setOpen] = useAtom(aProfileDropdownOpen);
  const navigate = useNavigate();
  const mcpManager = useDefaultAppServerManager();
  const {
    email,
    userId,
    authMethod,
    planAtLogin,
    requiresAuth,
    isCopilotApiAvailable,
    openAIAuth,
    setAuthMethod,
  } = useAuth();
  const { data: accountsData } = useAccounts();
  const { data: account, isError: accountsError } = useCurrentAccount();
  const { setData: setUseCopilotAuth } = useGlobalState(
    "use-copilot-auth-if-available",
  );
  const isUsingChatGptAuth = authMethod === "chatgpt";
  const isUsingCopilotAuth = authMethod === "copilot";
  const isUsingApiKeyAuth = authMethod === "apikey";
  const isUsingOpenAIAuth = isUsingChatGptAuth || isUsingApiKeyAuth;
  const { data: accountInfo } = useFetchFromVSCode("account-info", {
    queryConfig: { enabled: isUsingChatGptAuth },
  });
  const plan = accountInfo?.plan ?? planAtLogin;
  const showUpgradeAccountButton = shouldShowUpgradeCta({
    authMethod,
    plan,
    currentAccount: account,
    accounts: accountsData?.accounts,
  });
  const showSwitchToOpenAIAuth = !isUsingOpenAIAuth && openAIAuth != null;
  const showSwitchToCopilot = !isUsingCopilotAuth && isCopilotApiAvailable;
  const showOpenAIAuthLoginOption =
    !isUsingOpenAIAuth && openAIAuth == null && requiresAuth;
  const showFullSettingsPage = useGate(
    __statsigName("codex_app_full_settings_layout"),
  );
  const showVsceFullSettings = useGate(
    __statsigName("codex_vsce_show_full_settings"),
  );
  const showMcpSettings = useGate(__statsigName("codex-vsce-mcp-setting"));
  const activeConversationIdFromRoute = useActiveConversationId();
  const remoteTaskMatch = useMatch("/remote/:taskId");
  const activeConversationId: ConversationId | null =
    activeConversationIdFromRoute ??
    (remoteTaskMatch?.params.taskId != null
      ? createConversationId(remoteTaskMatch.params.taskId)
      : null);
  const activeConversationCwd =
    activeConversationId != null
      ? (mcpManager.getConversation(activeConversationId)?.cwd ?? null)
      : null;
  const settingsNavigationState =
    activeConversationId != null
      ? { workspaceRoot: activeConversationCwd }
      : undefined;
  const { activeMode: activeCollaborationMode } =
    useCollaborationMode(activeConversationId);
  const selectedModel = activeCollaborationMode?.settings.model ?? null;
  const isPluginsEnabled = useIsPluginsEnabled();
  const windowType = useWindowType();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const rateLimitPayload = useRateLimit().data ?? null;
  const rateLimitEntries = getRateLimitEntries(rateLimitPayload);
  const rateLimitName = getRateLimitName(rateLimitPayload);
  const filteredRateLimitEntries = filterRateLimitEntries(rateLimitEntries, {
    activeLimitName: rateLimitName,
    selectedModel,
  });
  const suppressRateLimitUpsell = shouldSuppressRateLimitUpsell(
    rateLimitPayload,
    {
      activeLimitName: rateLimitName,
      selectedModel,
    },
  );
  const showRateLimit = filteredRateLimitEntries.some(
    (entry) =>
      !!entry.snapshot?.primary?.windowDurationMins ||
      !!entry.snapshot?.secondary?.windowDurationMins,
  );

  function isPersonalAccount(): boolean {
    return account?.structure?.toLowerCase() === "personal";
  }

  function isWorkspaceAccount(): boolean {
    return account?.structure?.toLowerCase() === "workspace";
  }

  // This replicates the logic used in the ChatGPT web client.
  const accountNameNode: React.ReactNode = isPersonalAccount() ? (
    <FormattedMessage
      id="codex.profileDropdown.personalAccountTitle"
      defaultMessage="Personal account"
      description="Label for a personal account"
    />
  ) : (
    (account?.name ?? (
      <FormattedMessage
        id="codex.profileDropdown.defaultAccountTitle"
        defaultMessage="Default account"
        description="Fallback label when a non-personal account has no display name"
      />
    ))
  );

  const accountIconUrl = account?.profile_picture_url ?? null;
  const [failedAccountIconUrl, setFailedAccountIconUrl] = useState<
    string | null
  >(null);

  const handleCopyUserId = async (): Promise<void> => {
    if (userId == null) {
      return;
    }

    try {
      await copyToClipboard(userId);
      scope.get(toast$).success(
        intl.formatMessage({
          id: "codex.profileDropdown.copyUserIdSuccess",
          defaultMessage: "Copied user ID",
          description:
            "Toast shown after copying the ChatGPT user ID from the profile dropdown",
        }),
      );
    } catch {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "codex.profileDropdown.copyUserIdError",
          defaultMessage: "Failed to copy user ID",
          description:
            "Toast shown when copying the ChatGPT user ID from the profile dropdown fails",
        }),
      );
    }
  };

  const openWorkspaceSettings = (): void => {
    setOpen(false);
    messageBus.dispatchMessage("open-in-browser", {
      url: CHATGPT_WORKSPACE_SETTINGS_URL,
    });
  };

  function AccountIcon(props: { className?: string }): React.ReactElement {
    if (accountIconUrl && accountIconUrl !== failedAccountIconUrl) {
      return (
        <img
          src={accountIconUrl}
          alt=""
          className={clsx("rounded-full", props.className)}
          onError={() => {
            setFailedAccountIconUrl(accountIconUrl);
          }}
        />
      );
    }
    return <SettingsCogIcon className={props.className} />;
  }

  const dropdownItemsAboveTheSeparator: Array<React.ReactElement> = [];

  // Start by showing current login status.
  if (isUsingChatGptAuth) {
    if (email) {
      dropdownItemsAboveTheSeparator.push(
        // Leave the item disabled. This feature is just to help with debugging
        <div
          key="email"
          onClick={() => {
            void handleCopyUserId();
          }}
        >
          <DropdownItem LeftIcon={ProfileIcon} disabled>
            {email}
          </DropdownItem>
        </div>,
      );
    }

    if (!accountsError) {
      dropdownItemsAboveTheSeparator.push(
        <DropdownItem key="account" LeftIcon={AccountIcon} disabled>
          {accountNameNode}
        </DropdownItem>,
      );
    }
    if (showUpgradeAccountButton) {
      dropdownItemsAboveTheSeparator.push(
        <DropdownItem
          key="upgrade-account"
          LeftIcon={UpgradePlusIcon}
          RightIcon={LinkExternalIcon}
          onClick={() => {
            setOpen(false);
            messageBus.dispatchMessage("open-in-browser", {
              url: CHATGPT_PRICING_URL,
            });
          }}
        >
          <FormattedMessage
            id="codex.profileDropdown.getPlus"
            defaultMessage="Upgrade for higher limits"
            description="Menu item in the profile dropdown to upgrade a free account for higher limits"
          />
        </DropdownItem>,
      );
    }
  } else if (isUsingApiKeyAuth) {
    dropdownItemsAboveTheSeparator.push(
      <DropdownItem key="api-key-auth" LeftIcon={ProfileIcon} disabled>
        <FormattedMessage
          id="codex.profileDropdown.apiKeyAuth"
          defaultMessage="Logged in with API key"
          description="Label indicating the user is authenticated with an API key"
        />
      </DropdownItem>,
    );
  }
  if (isUsingCopilotAuth) {
    dropdownItemsAboveTheSeparator.push(
      <DropdownItem key="copilot-auth" LeftIcon={ProfileIcon} disabled>
        <FormattedMessage
          id="codex.profileDropdown.copilotAuth"
          defaultMessage="Logged in with Copilot"
          description="Label indicating the user is authenticated with Copilot"
        />
      </DropdownItem>,
    );
  }

  // Show account switching options, if applicable.
  if (showSwitchToOpenAIAuth) {
    dropdownItemsAboveTheSeparator.push(
      <DropdownItem
        key="switch-to-openai"
        onClick={() => {
          setOpen(false);
          void setUseCopilotAuth(false);
          setAuthMethod(openAIAuth);
        }}
        LeftIcon={LogOutIcon}
      >
        <FormattedMessage
          id="codex.profileDropdown.switchToOpenAIAccount"
          defaultMessage="Use OpenAI account"
          description="Label showing the option to switch to OpenAI authentication"
        />
      </DropdownItem>,
    );
  } else if (showSwitchToCopilot) {
    dropdownItemsAboveTheSeparator.push(
      <DropdownItem
        key="switch-to-copilot"
        onClick={() => {
          setOpen(false);
          void setUseCopilotAuth(true);
          setAuthMethod("copilot");
        }}
        LeftIcon={LogOutIcon}
      >
        <FormattedMessage
          id="codex.profileDropdown.switchToCopilotAccount"
          defaultMessage="Use Copilot account"
          description="Label showing the option to switch to Copilot authentication"
        />
      </DropdownItem>,
    );
  }

  // Show options to log into other account types if not already using them.
  if (showOpenAIAuthLoginOption) {
    dropdownItemsAboveTheSeparator.push(
      <DropdownItem
        key="sign-in-openai"
        onClick={() => {
          setOpen(false);
          void navigate("/login");
        }}
        LeftIcon={OpenAIBlossom}
      >
        <FormattedMessage
          id="codex.profileDropdown.signInWithOpenAI"
          defaultMessage="Sign in with ChatGPT"
          description="Profile menu item to sign in with ChatGPT"
        />
      </DropdownItem>,
    );
  }

  return (
    <BasicDropdown
      open={open}
      onOpenChange={setOpen}
      contentWidth={windowType === "electron" ? "panel" : "menuWide"}
      triggerButton={
        triggerButton ?? (
          <Tooltip
            tooltipContent={
              <FormattedMessage
                id="codex.header.settingsTooltip"
                defaultMessage="Settings"
                description="Tooltip text for opening settings"
              />
            }
          >
            <Button color="ghost" size="icon">
              <SettingsCogIcon className="icon-xs" />
            </Button>
          </Tooltip>
        )
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-0">
        {dropdownItemsAboveTheSeparator}
        {dropdownItemsAboveTheSeparator.length > 0 && <Dropdown.Separator />}
        <WithWindow electron browser>
          {showFullSettingsPage && (
            <DropdownItem
              LeftIcon={SettingsCogIcon}
              onClick={() => {
                setOpen(false);
                void navigate(`/settings/${DEFAULT_SETTINGS_SECTION}`, {
                  state: settingsNavigationState,
                });
              }}
            >
              <FormattedMessage
                id="codex.profileDropdown.settingsPage"
                defaultMessage="Settings"
                description="Menu item to open Codex settings page"
              />
            </DropdownItem>
          )}
        </WithWindow>
        <WithWindow extension>
          {showVsceFullSettings ? (
            <>
              <DropdownItem
                LeftIcon={CodexIcon}
                onClick={() => {
                  setOpen(false);
                  messageBus.dispatchMessage("show-settings", {
                    section: DEFAULT_SETTINGS_SECTION,
                  });
                }}
              >
                <FormattedMessage
                  id="codex.profileDropdown.codexSettings"
                  defaultMessage="Codex settings"
                  description="Menu item to view Codex settings"
                />
              </DropdownItem>
              {showMcpSettings && authMethod !== "copilot" ? (
                <DropdownItem
                  LeftIcon={StuffIcon}
                  onClick={() => {
                    setOpen(false);
                    messageBus.dispatchMessage("show-settings", {
                      section: "mcp-settings",
                    });
                  }}
                >
                  <FormattedMessage
                    id="codex.profileDropdown.mcpShort"
                    defaultMessage="MCP"
                    description="Menu item to open Codex MCP settings page"
                  />
                </DropdownItem>
              ) : null}
              <DropdownItem
                LeftIcon={isPluginsEnabled ? AppsIcon : SkillsIcon}
                onClick={() => {
                  setOpen(false);
                  messageBus.dispatchMessage("show-settings", {
                    section: isPluginsEnabled
                      ? "plugins-settings"
                      : "skills-settings",
                  });
                }}
              >
                {isPluginsEnabled ? (
                  <FormattedMessage
                    id="codex.profileDropdown.pluginsDirectory"
                    defaultMessage="Plugins"
                    description="Menu item to view Plugins options"
                  />
                ) : (
                  <FormattedMessage
                    id="codex.profileDropdown.skillsShort"
                    defaultMessage="Skills"
                    description="Menu item to open Codex Skills settings page"
                  />
                )}
              </DropdownItem>
            </>
          ) : (
            <BasicSubDropdown
              trigger={
                <DropdownItem LeftIcon={CodexIcon}>
                  <FormattedMessage
                    id="codex.profileDropdown.codexSettings"
                    defaultMessage="Codex settings"
                    description="Menu item to view Codex settings"
                  />
                </DropdownItem>
              }
            >
              <div className="flex min-w-[160px] flex-col gap-1 p-1">
                <DropdownItem
                  LeftIcon={SettingsCogIcon}
                  onClick={() => {
                    setOpen(false);
                    messageBus.dispatchMessage("show-settings", {
                      section: "agent",
                    });
                  }}
                >
                  <FormattedMessage
                    id="codex.profileDropdown.openAgentSettings"
                    defaultMessage="Open Agent settings"
                    description="Menu item to open Codex Agent settings page"
                  />
                </DropdownItem>
                <DropdownItem
                  LeftIcon={LinkExternalIcon}
                  href={CODEX_CONFIG_BASIC_URL}
                >
                  <FormattedMessage
                    id="codex.profileDropdown.readDocs"
                    defaultMessage="Read docs"
                    description="Menu item to read MCP documentation"
                  />
                </DropdownItem>
                <OpenConfigTomlDropdownItem
                  onClick={() => {
                    setOpen(false);
                  }}
                />
              </div>
            </BasicSubDropdown>
          )}
        </WithWindow>
        <WithWindow extension>
          <BasicSubDropdown
            trigger={
              <DropdownItem LeftIcon={SettingsCogIcon}>
                <FormattedMessage
                  id="codex.profileDropdown.settings"
                  defaultMessage="IDE settings"
                  description="Menu item to view IDE settings options"
                />
              </DropdownItem>
            }
          >
            <div className="flex min-w-[160px] flex-col gap-1 p-1">
              <OpenOnStartupDropdown />
              <QueueFollowUpsDropdown />
              <EnterBehaviorDropdownItem />
              <TodoCodeLensDropdown />
              <DropdownItem
                LeftIcon={EditIcon}
                onClick={() => {
                  setOpen(false);
                  messageBus.dispatchMessage("open-extension-settings", {});
                }}
              >
                <FormattedMessage
                  id="codex.profileDropdown.openExtensionSettings"
                  defaultMessage="Open settings"
                  description="Menu item to open VS Code settings for this extension"
                />
              </DropdownItem>
            </div>
          </BasicSubDropdown>
        </WithWindow>
        <WithWindow extension>
          {showVsceFullSettings ? null : (
            <BasicSubDropdown
              trigger={
                <DropdownItem LeftIcon={StuffIcon}>
                  <FormattedMessage
                    id="codex.profileDropdown.mcp"
                    defaultMessage="MCP settings"
                    description="Menu item to view MCP options"
                  />
                </DropdownItem>
              }
            >
              <div className="flex min-w-[160px] flex-col gap-1 p-1">
                <DropdownItem LeftIcon={LinkExternalIcon} href={CODEX_MCP_URL}>
                  <FormattedMessage
                    id="codex.profileDropdown.readDocs"
                    defaultMessage="Read docs"
                    description="Menu item to read MCP documentation"
                  />
                </DropdownItem>
                <OpenConfigTomlDropdownItem
                  onClick={() => {
                    setOpen(false);
                  }}
                />
                {showMcpSettings && authMethod !== "copilot" ? (
                  <DropdownItem
                    LeftIcon={SettingsCogIcon}
                    onClick={() => {
                      setOpen(false);
                      messageBus.dispatchMessage("show-settings", {
                        section: "mcp-settings",
                      });
                    }}
                  >
                    <FormattedMessage
                      id="codex.profileDropdown.openMcpSettings"
                      defaultMessage="Open MCP settings"
                      description="Menu item to open Codex MCP settings page"
                    />
                  </DropdownItem>
                ) : null}
              </div>
            </BasicSubDropdown>
          )}
        </WithWindow>
        <WithWindow extension>
          {showVsceFullSettings ? null : (
            <BasicSubDropdown
              trigger={
                <DropdownItem
                  LeftIcon={isPluginsEnabled ? AppsIcon : SkillsIcon}
                >
                  {isPluginsEnabled ? (
                    <FormattedMessage
                      id="codex.profileDropdown.pluginsDirectory"
                      defaultMessage="Plugins"
                      description="Menu item to view Plugins options"
                    />
                  ) : (
                    <FormattedMessage
                      id="codex.profileDropdown.skills"
                      defaultMessage="Skills settings"
                      description="Menu item to view Skills options"
                    />
                  )}
                </DropdownItem>
              }
            >
              <div className="flex min-w-[160px] flex-col gap-1 p-1">
                <DropdownItem
                  LeftIcon={LinkExternalIcon}
                  href="https://developers.openai.com/codex/skills/"
                >
                  <FormattedMessage
                    id="codex.profileDropdown.readSkillsDocs"
                    defaultMessage="Read docs"
                    description="Menu item to read Skills documentation"
                  />
                </DropdownItem>
                <DropdownItem
                  LeftIcon={SettingsCogIcon}
                  onClick={() => {
                    setOpen(false);
                    messageBus.dispatchMessage("show-settings", {
                      section: isPluginsEnabled
                        ? "plugins-settings"
                        : "skills-settings",
                    });
                  }}
                >
                  {isPluginsEnabled ? (
                    <FormattedMessage
                      id="codex.profileDropdown.openPluginsDirectory"
                      defaultMessage="Open Plugins"
                      description="Menu item to open the Plugins settings page"
                    />
                  ) : (
                    <FormattedMessage
                      id="codex.profileDropdown.openSkillsSettings"
                      defaultMessage="Open Skills settings"
                      description="Menu item to open Codex Skills settings page"
                    />
                  )}
                </DropdownItem>
              </div>
            </BasicSubDropdown>
          )}
        </WithWindow>
        {isUsingChatGptAuth && isWorkspaceAccount() ? (
          <DropdownItem
            LeftIcon={BuildingIcon}
            RightIcon={LinkExternalIcon}
            onClick={openWorkspaceSettings}
          >
            <FormattedMessage
              id="codex.profileDropdown.workspaceSettings"
              defaultMessage="Workspace settings"
              description="Menu item to open ChatGPT workspace settings"
            />
          </DropdownItem>
        ) : null}
        <LanguageDropdown />
        <WithWindow extension>
          <DropdownItem
            LeftIcon={KeyboardIcon}
            onClick={() => {
              setOpen(false);
              messageBus.dispatchMessage("open-keyboard-shortcuts", {});
            }}
          >
            <FormattedMessage
              id="codex.profileDropdown.keyboardShortcuts"
              defaultMessage="Keyboard shortcuts"
              description="Menu item to open keyboard shortcuts filtered to this extension"
            />
          </DropdownItem>
        </WithWindow>
        {windowType === "electron" && showRateLimit && (
          <>
            <Dropdown.Separator />
            <RateLimitSummary
              rateLimits={filteredRateLimitEntries}
              activeLimitName={rateLimitName}
              suppressUpsell={suppressRateLimitUpsell}
              selectedModel={selectedModel}
              layout="compact"
            />
          </>
        )}
        {requiresAuth && (
          <DropdownItem
            onClick={async () => {
              setOpen(false);
              await setUseCopilotAuth(false);
              await mcpManager.logout();
              void navigate("/login");
            }}
            LeftIcon={LogOutIcon}
          >
            <FormattedMessage
              id="codex.profileDropdown.logOut"
              defaultMessage="Log out"
              description="Menu item to log out of ChatGPT"
            />
          </DropdownItem>
        )}
      </div>
    </BasicDropdown>
  );
}

function EnterBehaviorDropdownItem(): React.ReactElement {
  const scope = useScope(AppScope);
  const intl = useIntl();
  const { enterBehavior, setEnterBehavior, isLoading } = useEnterBehavior();
  const { modifierSymbol } = usePlatform();
  const requiresCmdEnterForMultiline = enterBehavior === "cmdIfMultiline";

  return (
    <DropdownItem
      disabled={isLoading}
      LeftIcon={({ className }) => (
        <Checkbox
          className={clsx("pointer-events-none", className)}
          checked={requiresCmdEnterForMultiline}
          disabled={isLoading}
        />
      )}
      onSelect={async (event) => {
        event.preventDefault();
        try {
          await setEnterBehavior(
            requiresCmdEnterForMultiline ? "enter" : "cmdIfMultiline",
          );
        } catch {
          scope.get(toast$).danger(
            intl.formatMessage({
              id: "codex.profileDropdown.enterBehaviorError",
              defaultMessage: "Failed to update setting",
              description:
                "Error message when failed to update enter behavior setting",
            }),
          );
        }
      }}
    >
      <FormattedMessage
        id="codex.profileDropdown.enterBehavior"
        defaultMessage="{modifierSymbol} + enter to send long prompts"
        description="Checkbox label that toggles whether multiline prompts require cmd+enter to send"
        values={{ modifierSymbol }}
      />
    </DropdownItem>
  );
}
