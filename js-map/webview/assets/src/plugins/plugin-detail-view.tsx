import type * as AppServer from "app-server-types";
import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import gradientBackground from "@/assets/gradient.png";
import { CardTile } from "@/components/card-tile";
import { ConnectorLogo } from "@/components/connector-logo";
import { InlineChip } from "@/components/inline-chip";
import { LargeEmptyState } from "@/components/large-empty-state";
import {
  SectionedPageLayout,
  SectionedPageSection,
} from "@/components/sectioned-page";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import ConnectedAppsIcon from "@/icons/connected-apps.svg";
import EmptyStatePuzzlePieceIcon from "@/icons/empty-state-puzzle-piece.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import MpcIcon from "@/icons/mcp.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import SkillsIcon from "@/icons/skills.svg";
import { LoadingPage } from "@/loading-page/loading-page";
import { AppCard } from "@/skills/app-card";
import { formatSkillTitle } from "@/skills/format-skill-title";
import { getRepoRootForSkillPath } from "@/skills/plugins-page-utils";
import { SkillCard } from "@/skills/skill-card";

import { getMarketplaceDisplayLabel } from "./plugins-page-selectors";

const messages = defineMessages({
  capabilities: {
    id: "plugins.detail.information.capabilities",
    defaultMessage: "Capabilities",
    description: "Label for plugin capabilities on the detail page",
  },
  category: {
    id: "plugins.detail.information.category",
    defaultMessage: "Category",
    description: "Label for plugin category on the detail page",
  },
  developer: {
    id: "plugins.detail.information.developer",
    defaultMessage: "Developer",
    description: "Label for plugin developer on the detail page",
  },
  descriptionSection: {
    id: "plugins.detail.description",
    defaultMessage: "Description",
    description: "Section title for plugin description on the detail page",
  },
  information: {
    id: "plugins.detail.information",
    defaultMessage: "Information",
    description: "Section title for plugin information on the detail page",
  },
  includesSection: {
    id: "plugins.detail.includes",
    defaultMessage: "Includes",
    description: "Section title for plugin apps and skills on the detail page",
  },
  mcpServerBadge: {
    id: "plugins.detail.includes.mcpServerBadge",
    defaultMessage: "MCP server",
    description:
      "Muted label shown next to an included MCP server title on the plugin detail page",
  },
  missing: {
    id: "plugins.detail.missing",
    defaultMessage: "Plugin not found",
    description: "Not found title on the plugin detail page",
  },
  missingDescription: {
    id: "plugins.detail.missingDescription",
    defaultMessage:
      "This plugin could not be loaded from its marketplace entry.",
    description: "Not found description on the plugin detail page",
  },
  privacyPolicy: {
    id: "plugins.detail.information.privacyPolicy",
    defaultMessage: "Privacy Policy",
    description: "Label for plugin privacy policy on the detail page",
  },
  website: {
    id: "plugins.detail.information.website",
    defaultMessage: "Website",
    description: "Label for plugin website on the detail page",
  },
  errorTitle: {
    id: "plugins.detail.errorTitle",
    defaultMessage: "Failed to load plugin",
    description: "Error title shown on the plugin detail page",
  },
  termsOfService: {
    id: "plugins.detail.information.termsOfService",
    defaultMessage: "Terms of service",
    description: "Label for plugin terms of service on the detail page",
  },
});

type PluginDetailReadyState = {
  appInstallBlockedReasonsById: Partial<
    Record<string, "disabled-by-admin" | "connector-unavailable" | null>
  >;
  actions?: ReactNode;
  apps: Array<AppServer.v2.AppInfo>;
  installedSkills: Array<AppServer.v2.SkillMetadata>;
  installBlockedReason: "disabled-by-admin" | "connector-unavailable" | null;
  isPromptInstallBlocked: boolean;
  isAppConnectPending: (appId: string) => boolean;
  updatingAppId: string | null;
  isUpdatingEnabled: boolean;
  isUninstalling: boolean;
  onActivatePrompt: (defaultPrompt: string | null) => void;
  onInstallApp: (app: AppServer.v2.AppInfo) => Promise<void>;
  onOpenAppTools: (app: AppServer.v2.AppInfo) => void;
  onOpenAppUrl: (url: string | null) => void;
  onSetAppEnabled: (params: {
    appId: string;
    enabled: boolean;
  }) => Promise<void>;
  onSkillsUpdated: () => void;
  mcpServers: Array<
    | {
        kind: "app";
        app: AppServer.v2.AppInfo;
      }
    | {
        configKey: string | null;
        kind: "config";
        enabled: boolean;
        installed: boolean;
        name: string;
      }
  >;
  onOpenMcpSettings: () => void;
  onToggleMcpServerEnabled: (serverName: string, nextEnabled: boolean) => void;
  plugin: AppServer.v2.PluginDetail;
  state: "ready";
  unavailableSkills: Array<AppServer.v2.SkillSummary>;
  workspaceRoots: Array<string>;
};

export function PluginDetailView(
  props:
    | {
        errorMessage: string | null;
        state: "error";
      }
    | {
        state: "loading";
      }
    | {
        state: "missing";
      }
    | PluginDetailReadyState,
): ReactElement {
  const intl = useIntl();
  const sectionDescriptors =
    props.state !== "ready"
      ? []
      : getPluginDetailSections({
          hasDescription: getPluginDetailBodyDescription(props.plugin) != null,
          hasInformation: getPluginInformationRows(props.plugin).length > 0,
          hasIncludes:
            props.apps.length > 0 ||
            props.mcpServers.length > 0 ||
            props.installedSkills.length > 0 ||
            props.unavailableSkills.length > 0,
        });

  return (
    <SectionedPageLayout
      ariaLabel={intl.formatMessage({
        id: "plugins.detail.sectionsNav",
        defaultMessage: "Plugin sections",
        description:
          "Accessible label for the section navigation on the plugin detail page",
      })}
      contentInnerClassName="flex min-h-full flex-col gap-8 browser:p-panel electron:p-panel extension:px-20"
      disableScrollFade
      showNav={false}
      sections={sectionDescriptors}
    >
      {props.state === "loading" ? (
        <LoadingPage fillParent debugName="PluginDetailView" />
      ) : props.state === "error" ? (
        <PluginDetailEmptyState
          title={<FormattedMessage {...messages.errorTitle} />}
          description={props.errorMessage ?? undefined}
        />
      ) : props.state === "missing" ? (
        <PluginDetailEmptyState
          title={<FormattedMessage {...messages.missing} />}
          description={<FormattedMessage {...messages.missingDescription} />}
        />
      ) : (
        <PluginDetailContent {...props} />
      )}
    </SectionedPageLayout>
  );
}

function PluginDetailContent({
  state: _state,
  appInstallBlockedReasonsById,
  actions,
  apps,
  installedSkills,
  installBlockedReason,
  isPromptInstallBlocked,
  isAppConnectPending,
  updatingAppId,
  isUpdatingEnabled,
  isUninstalling,
  onActivatePrompt,
  onInstallApp,
  onOpenAppTools,
  onOpenAppUrl,
  onSetAppEnabled,
  onSkillsUpdated,
  mcpServers,
  onOpenMcpSettings,
  onToggleMcpServerEnabled,
  plugin,
  unavailableSkills,
  workspaceRoots,
}: PluginDetailReadyState): ReactElement {
  const displayName = getPluginDetailDisplayName(plugin);
  const subtitle = getPluginDetailSubtitle(plugin);
  const description = getPluginDetailBodyDescription(plugin);
  const defaultPrompts = (plugin.summary.interface?.defaultPrompt ?? [])
    .map((prompt) => prompt.trim())
    .filter((prompt) => prompt.length > 0);
  const informationRows = getPluginInformationRows(plugin);
  const isPromptActionPending = isUpdatingEnabled || isUninstalling;

  return (
    <>
      <section className="flex flex-col gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-token-border-default bg-transparent p-0">
            <ConnectorLogo
              alt={displayName}
              className="size-full object-contain"
              logoUrl={plugin.summary.interface?.logo}
              fallback={
                <ConnectedAppsIcon className="icon-lg text-token-text-secondary" />
              }
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 self-stretch">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="heading-dialog min-w-0 flex-1 font-semibold break-words text-token-foreground">
                {displayName}
              </div>
              {actions != null ? (
                <div className="flex shrink-0 items-start gap-2 md:pt-1">
                  {actions}
                </div>
              ) : null}
            </div>
            {subtitle ? (
              <div className="text-lg text-token-text-secondary">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {defaultPrompts.length > 0 ? (
          <div className="relative flex justify-center overflow-hidden rounded-2xl px-4 py-12 shadow-[inset_0_0_0_1px_var(--color-token-border-default)] sm:px-8">
            <img
              src={gradientBackground}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-token-bg-primary/70" />
            <div className="relative flex w-full max-w-[640px] flex-col items-center gap-4">
              {defaultPrompts.map((defaultPrompt, index) => (
                <div
                  key={`${defaultPrompt}-${index}`}
                  className="flex w-full justify-center"
                >
                  <Tooltip
                    tooltipContent={
                      installBlockedReason === "connector-unavailable" ? (
                        <FormattedMessage
                          id="plugins.install.connectorUnavailable"
                          defaultMessage="App unavailable"
                          description="Tooltip shown when plugin install is unavailable because the plugin's apps are not available in the current app directory"
                        />
                      ) : (
                        <FormattedMessage
                          id="plugins.install.disabledByAdmin"
                          defaultMessage="Disabled by admin"
                          description="Tooltip shown when plugin install is unavailable because all included connectors are disabled by admin"
                        />
                      )
                    }
                    disabled={!isPromptInstallBlocked}
                  >
                    <div
                      aria-disabled={isPromptInstallBlocked}
                      className={clsx(
                        "max-w-[77%] rounded-2xl bg-token-bg-primary/75 p-2 break-words shadow-[0_0_0_1px_var(--color-token-border-default)] [&_.contain-inline-size]:[contain:initial]",
                        isPromptInstallBlocked
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      )}
                      onClick={
                        isPromptInstallBlocked
                          ? undefined
                          : (): void => {
                              onActivatePrompt(defaultPrompt);
                            }
                      }
                      onKeyDown={
                        isPromptInstallBlocked
                          ? undefined
                          : (event): void => {
                              if (event.key !== "Enter" && event.key !== " ") {
                                return;
                              }
                              event.preventDefault();
                              onActivatePrompt(defaultPrompt);
                            }
                      }
                      role="button"
                      tabIndex={
                        isPromptActionPending || isPromptInstallBlocked ? -1 : 0
                      }
                    >
                      <div className="break-words [&_.contain-inline-size]:[contain:initial]">
                        <InlineChip
                          text={displayName}
                          icon={
                            <ConnectorLogo
                              alt={displayName}
                              className="rounded-xs"
                              logoUrl={plugin.summary.interface?.logo}
                              fallback={<ConnectedAppsIcon />}
                            />
                          }
                          interactive={!isPromptInstallBlocked}
                          colorVariant="success"
                        />
                        <span>{defaultPrompt}</span>
                      </div>
                    </div>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {description ? (
          <SectionedPageSection
            id="plugin-description"
            showDivider={false}
            title={null}
          >
            <div className="max-w-4xl [padding-inline-start:var(--sectioned-page-leading-inset,0.5rem)] text-token-text-primary">
              {description}
            </div>
          </SectionedPageSection>
        ) : null}
      </section>
      {apps.length > 0 ||
      mcpServers.length > 0 ||
      installedSkills.length > 0 ||
      unavailableSkills.length > 0 ? (
        <SectionedPageSection
          id="plugin-includes"
          showDivider={false}
          title={<FormattedMessage {...messages.includesSection} />}
        >
          <PluginIncludesList
            appInstallBlockedReasonsById={appInstallBlockedReasonsById}
            apps={apps}
            installedSkills={installedSkills}
            isAppConnectPending={isAppConnectPending}
            mcpServers={mcpServers}
            onInstallApp={onInstallApp}
            onOpenMcpSettings={onOpenMcpSettings}
            onOpenAppTools={onOpenAppTools}
            onOpenAppUrl={onOpenAppUrl}
            onSetAppEnabled={onSetAppEnabled}
            pluginInstalled={plugin.summary.installed}
            onSkillsUpdated={onSkillsUpdated}
            onToggleMcpServerEnabled={onToggleMcpServerEnabled}
            unavailableSkills={unavailableSkills}
            updatingAppId={updatingAppId}
            workspaceRoots={workspaceRoots}
          />
        </SectionedPageSection>
      ) : null}
      {informationRows.length > 0 ? (
        <SectionedPageSection
          id="plugin-information"
          showDivider={false}
          title={<FormattedMessage {...messages.information} />}
        >
          <PluginDetailList>
            {informationRows.map((row) => (
              <PluginInformationRow
                key={row.key}
                label={row.label}
                value={row.value}
              />
            ))}
          </PluginDetailList>
        </SectionedPageSection>
      ) : null}
    </>
  );
}

function PluginMcpServerCard({
  badges,
  enabled,
  installed,
  name,
  onOpenSettings,
  onToggleEnabled,
}: {
  badges?: Array<ReactNode>;
  enabled: boolean;
  installed: boolean;
  name: string;
  onOpenSettings: () => void;
  onToggleEnabled: (nextEnabled: boolean) => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 rounded-2xl p-2.5",
        installed && !enabled && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-token-bg-primary">
          <MpcIcon className="icon-sm text-token-text-secondary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-token-text-primary">
            {getPluginMcpServerTitle(name)}
          </div>
          {badges != null && badges.length > 0 ? (
            <div className="mt-0.5 flex items-center gap-1">{badges}</div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip
          tooltipContent={
            installed ? (
              <FormattedMessage
                id="plugins.detail.mcp.settings"
                defaultMessage="Open MCP settings"
                description="Tooltip label for the settings button on an MCP server card in plugin detail"
              />
            ) : (
              <FormattedMessage
                id="plugins.detail.mcp.setup"
                defaultMessage="Set up in MCP settings"
                description="Tooltip label for the settings button when an MCP server still needs to be configured"
              />
            )
          }
        >
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md bg-transparent"
            aria-label={intl.formatMessage(
              installed
                ? {
                    id: "plugins.detail.mcp.settings",
                    defaultMessage: "Open MCP settings",
                    description:
                      "Aria label for the settings button on an MCP server card in plugin detail",
                  }
                : {
                    id: "plugins.detail.mcp.setup",
                    defaultMessage: "Set up in MCP settings",
                    description:
                      "Aria label for the settings button when an MCP server still needs to be configured",
                  },
            )}
            onClick={onOpenSettings}
          >
            <SettingsCogIcon className="icon-sm" />
          </button>
        </Tooltip>
        {installed ? (
          <Tooltip
            tooltipContent={
              enabled ? (
                <FormattedMessage
                  id="plugins.detail.mcp.disable"
                  defaultMessage="Disable MCP server"
                  description="Tooltip label for disabling an MCP server from the plugin detail page"
                />
              ) : (
                <FormattedMessage
                  id="plugins.detail.mcp.enable"
                  defaultMessage="Enable MCP server"
                  description="Tooltip label for enabling an MCP server from the plugin detail page"
                />
              )
            }
          >
            <Toggle
              checked={enabled}
              ariaLabel={intl.formatMessage({
                id: "plugins.detail.mcp.toggleAria",
                defaultMessage: "Toggle MCP server enabled state",
                description:
                  "Accessible label for the MCP server enablement toggle on the plugin detail page",
              })}
              onChange={onToggleEnabled}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

function PluginIncludesList({
  appInstallBlockedReasonsById,
  apps,
  installedSkills,
  isAppConnectPending,
  mcpServers,
  onInstallApp,
  onOpenMcpSettings,
  onOpenAppTools,
  onOpenAppUrl,
  onSetAppEnabled,
  pluginInstalled,
  onSkillsUpdated,
  onToggleMcpServerEnabled,
  unavailableSkills,
  updatingAppId,
  workspaceRoots,
}: {
  appInstallBlockedReasonsById: Partial<
    Record<string, "disabled-by-admin" | "connector-unavailable" | null>
  >;
  apps: Array<AppServer.v2.AppInfo>;
  installedSkills: Array<AppServer.v2.SkillMetadata>;
  isAppConnectPending: (appId: string) => boolean;
  mcpServers: Array<
    | {
        kind: "app";
        app: AppServer.v2.AppInfo;
      }
    | {
        configKey: string | null;
        kind: "config";
        enabled: boolean;
        installed: boolean;
        name: string;
      }
  >;
  onInstallApp: (app: AppServer.v2.AppInfo) => Promise<void>;
  onOpenMcpSettings: () => void;
  onOpenAppTools: (app: AppServer.v2.AppInfo) => void;
  onOpenAppUrl: (url: string | null) => void;
  onSetAppEnabled: (params: {
    appId: string;
    enabled: boolean;
  }) => Promise<void>;
  pluginInstalled: boolean;
  onSkillsUpdated: () => void;
  onToggleMcpServerEnabled: (serverName: string, nextEnabled: boolean) => void;
  unavailableSkills: Array<AppServer.v2.SkillSummary>;
  updatingAppId: string | null;
  workspaceRoots: Array<string>;
}): ReactElement {
  const appBadge = (
    <span
      key="app-badge"
      className="text-sm font-normal text-token-text-secondary"
    >
      <FormattedMessage
        id="plugins.detail.includes.appBadge"
        defaultMessage="App"
        description="Muted label shown next to an included app title on the plugin detail page"
      />
    </span>
  );
  const skillBadge = (
    <span
      key="skill-badge"
      className="text-sm font-normal text-token-text-secondary"
    >
      <FormattedMessage
        id="plugins.detail.includes.skillBadge"
        defaultMessage="Skill"
        description="Muted label shown next to an included skill title on the plugin detail page"
      />
    </span>
  );
  const mcpServerBadge = (
    <span
      key="mcp-server-badge"
      className="text-sm font-normal text-token-text-secondary"
    >
      <FormattedMessage {...messages.mcpServerBadge} />
    </span>
  );

  return (
    <PluginDetailList>
      {apps.map((app) => (
        <div key={`app-${app.id}`}>
          <AppCard
            app={app}
            badges={[appBadge]}
            cardIcon={getPluginIncludeIcon(
              <ConnectedAppsIcon className="icon-sm" />,
            )}
            cardIconContainer={false}
            className="h-16 !cursor-pointer hover:bg-transparent"
            installBlockedReason={
              appInstallBlockedReasonsById[app.id] === "disabled-by-admin"
                ? "disabled-by-admin"
                : null
            }
            installedStateAction={pluginInstalled ? "toggle" : "check"}
            manageAction="menu"
            isConnectingApp={isAppConnectPending(app.id)}
            showInstallAction={pluginInstalled}
            updatingAppId={updatingAppId}
            onInstallApp={onInstallApp}
            onOpenAppTools={onOpenAppTools}
            onOpenAppUrl={onOpenAppUrl}
            onSetAppEnabled={onSetAppEnabled}
          />
        </div>
      ))}
      {mcpServers.map((server) => (
        <div
          key={
            server.kind === "app"
              ? `mcp-app-${server.app.id}`
              : `mcp-config-${server.name}`
          }
        >
          {server.kind === "app" ? (
            <AppCard
              app={server.app}
              badges={[mcpServerBadge]}
              cardIcon={getPluginIncludeIcon(<MpcIcon className="icon-sm" />)}
              cardIconContainer={false}
              className="h-16 !cursor-pointer hover:bg-transparent"
              installedStateAction={pluginInstalled ? "toggle" : "check"}
              manageAction="menu"
              isConnectingApp={isAppConnectPending(server.app.id)}
              showInstallAction={pluginInstalled}
              updatingAppId={updatingAppId}
              onInstallApp={onInstallApp}
              onOpenAppTools={onOpenAppTools}
              onOpenAppUrl={onOpenAppUrl}
              onSetAppEnabled={onSetAppEnabled}
            />
          ) : (
            <PluginMcpServerCard
              badges={[mcpServerBadge]}
              enabled={server.enabled}
              installed={server.installed}
              name={server.name}
              onOpenSettings={onOpenMcpSettings}
              onToggleEnabled={(nextEnabled): void => {
                if (server.configKey != null) {
                  onToggleMcpServerEnabled(server.configKey, nextEnabled);
                }
              }}
            />
          )}
        </div>
      ))}
      {installedSkills.map((skill) => (
        <div key={`installed-skill-${skill.path}`}>
          <SkillCard
            cardIcon={getPluginIncludeIcon(<SkillsIcon className="icon-sm" />)}
            cardIconContainer={false}
            cardClassName="h-16 hover:bg-transparent"
            displayName={getPluginSkillTitle(skill)}
            installedStateAction="toggle"
            showModalUninstall={false}
            onSkillsUpdated={onSkillsUpdated}
            repoRoot={
              skill.scope === "repo"
                ? getRepoRootForSkillPath({
                    roots: workspaceRoots,
                    skillPath: skill.path,
                  })
                : null
            }
            scopeBadges={[skillBadge]}
            skill={skill}
          />
        </div>
      ))}
      {unavailableSkills.map((skill) => (
        <div key={`skill-${skill.path}`}>
          <PluginIncludeCard
            badges={[skillBadge]}
            description={skill.shortDescription ?? skill.description}
            icon={getPluginIncludeIcon(<SkillsIcon className="icon-sm" />)}
            title={getPluginSkillTitle(skill)}
          />
        </div>
      ))}
    </PluginDetailList>
  );
}

function PluginDetailEmptyState({
  description,
  title,
}: {
  description?: ReactNode;
  title: ReactNode;
}): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8">
      <LargeEmptyState
        title={title}
        description={description}
        illustration={
          <EmptyStatePuzzlePieceIcon
            aria-hidden
            className="h-20 w-auto text-token-input-placeholder-foreground"
          />
        }
      />
    </div>
  );
}

function PluginIncludeCard({
  badges,
  description,
  icon,
  title,
}: {
  badges?: Array<ReactNode>;
  description: string | null;
  icon: ReactElement;
  title: string;
}): ReactElement {
  return (
    <CardTile
      className="h-16 justify-center border-none hover:bg-transparent"
      description={description ?? undefined}
      descriptionClassName="line-clamp-1"
      icon={icon}
      iconContainer={false}
      badges={badges}
      title={title}
    />
  );
}

function getPluginIncludeIcon(icon: ReactElement): ReactElement {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-token-border-default text-token-text-secondary">
      {icon}
    </span>
  );
}

function PluginDetailList({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="divide-y divide-token-border-default overflow-hidden rounded-2xl border border-token-border-default">
      {children}
    </div>
  );
}

function PluginInformationRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}): ReactElement {
  return (
    <div className="grid h-16 items-center gap-1 px-4 py-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
      <div className="text-token-text-secondary">{label}</div>
      <div className="min-w-0 text-token-text-primary">{value}</div>
    </div>
  );
}

function getPluginInformationRows(plugin: AppServer.v2.PluginDetail): Array<{
  key: string;
  label: ReactNode;
  value: ReactNode;
}> {
  const rows: Array<{
    key: string;
    label: ReactNode;
    value: ReactNode;
  }> = [];

  const categoryValue = getPluginCategoryLabel(plugin);
  if (categoryValue) {
    rows.push({
      key: "category",
      label: <FormattedMessage {...messages.category} />,
      value: categoryValue,
    });
  }

  const capabilities = plugin.summary.interface?.capabilities ?? [];
  if (capabilities.length > 0) {
    rows.push({
      key: "capabilities",
      label: <FormattedMessage {...messages.capabilities} />,
      value: capabilities.join(", "),
    });
  }

  const developerName = plugin.summary.interface?.developerName?.trim();
  if (developerName) {
    rows.push({
      key: "developer",
      label: <FormattedMessage {...messages.developer} />,
      value: developerName,
    });
  }

  if (plugin.summary.interface?.websiteUrl) {
    rows.push({
      key: "website",
      label: <FormattedMessage {...messages.website} />,
      value: (
        <PluginInformationLink
          ariaLabel="Website"
          href={plugin.summary.interface.websiteUrl}
        />
      ),
    });
  }

  if (plugin.summary.interface?.privacyPolicyUrl) {
    rows.push({
      key: "privacyPolicy",
      label: <FormattedMessage {...messages.privacyPolicy} />,
      value: (
        <PluginInformationLink
          ariaLabel="Privacy Policy"
          href={plugin.summary.interface.privacyPolicyUrl}
        />
      ),
    });
  }

  if (plugin.summary.interface?.termsOfServiceUrl) {
    rows.push({
      key: "termsOfService",
      label: <FormattedMessage {...messages.termsOfService} />,
      value: (
        <PluginInformationLink
          ariaLabel="Terms of service"
          href={plugin.summary.interface.termsOfServiceUrl}
        />
      ),
    });
  }

  return rows;
}

function getPluginDetailSections({
  hasDescription,
  hasInformation,
  hasIncludes,
}: {
  hasDescription: boolean;
  hasInformation: boolean;
  hasIncludes: boolean;
}): Array<{
  id: string;
  title: ReactNode;
}> {
  const sections: Array<{
    id: string;
    title: ReactNode;
  }> = [];

  if (hasDescription) {
    sections.push({
      id: "plugin-description",
      title: <FormattedMessage {...messages.descriptionSection} />,
    });
  }

  if (hasIncludes) {
    sections.push({
      id: "plugin-includes",
      title: <FormattedMessage {...messages.includesSection} />,
    });
  }

  if (hasInformation) {
    sections.push({
      id: "plugin-information",
      title: <FormattedMessage {...messages.information} />,
    });
  }

  return sections;
}

function PluginInformationLink({
  ariaLabel,
  href,
}: {
  ariaLabel: string;
  href: string;
}): ReactElement {
  return (
    <a
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 text-token-link"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <LinkExternalIcon className="icon-sm" />
    </a>
  );
}

function getPluginCategoryLabel(
  plugin: AppServer.v2.PluginDetail,
): string | null {
  const values = [
    plugin.marketplaceName.trim().length > 0
      ? getMarketplaceDisplayLabel(plugin.marketplaceName)
      : null,
    plugin.summary.interface?.category?.trim() || null,
  ].filter((value): value is string => value != null);

  if (values.length === 0) {
    return null;
  }

  return values.join(", ");
}

function getPluginDetailDisplayName(plugin: AppServer.v2.PluginDetail): string {
  return plugin.summary.interface?.displayName ?? plugin.summary.name;
}

function getPluginSkillTitle(
  skill: AppServer.v2.SkillMetadata | AppServer.v2.SkillSummary,
): string {
  const displayName = skill.interface?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const nameWithoutPluginPrefix = skill.name.split(":").pop();
  return formatSkillTitle(nameWithoutPluginPrefix || skill.name);
}

function getPluginMcpServerTitle(name: string): string {
  if (name.length === 0) {
    return name;
  }

  return `${name[0].toUpperCase()}${name.slice(1)}`;
}

function getPluginDetailSubtitle(
  plugin: AppServer.v2.PluginDetail,
): string | null {
  return (
    plugin.summary.interface?.shortDescription ?? plugin.description ?? null
  );
}

function getPluginDetailBodyDescription(
  plugin: AppServer.v2.PluginDetail,
): string | null {
  return (
    plugin.summary.interface?.longDescription ??
    plugin.description ??
    plugin.summary.interface?.shortDescription ??
    null
  );
}
