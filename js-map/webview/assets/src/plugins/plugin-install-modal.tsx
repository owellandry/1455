import type { components } from "@oai/sa-server-client";
import { useQuery } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ConnectorLogo } from "@/components/connector-logo";
import { Dialog } from "@/components/dialog";
import { DialogBody } from "@/components/dialog-layout";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import AppsIcon from "@/icons/apps.svg";
import OpenAIBlossomIcon from "@/icons/openai-blossom.svg";
import { messageBus } from "@/message-bus";
import { usePluginDetail } from "@/queries/plugin-detail-queries";
import { formatSkillTitle } from "@/skills/format-skill-title";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { CodexRequest } from "@/utils/request";

import { getPluginDisplayName } from "./get-plugin-display-name";
import { usePluginDisabledByAdmin } from "./use-plugin-disabled-by-admin";
import type { PluginInstallSession } from "./use-plugin-install-flow";
import type { InstalledPlugin } from "./use-plugins";

type ConnectorTos = components["schemas"]["ConnectorTos"];
type ConnectorTosBlurb = components["schemas"]["ConnectorTosBlurb"];
type ToolPersonalizationMode = components["schemas"]["ToolPersonalizationMode"];
type PluginInstallDisclosureData = {
  blurbs: Array<Pick<ConnectorTosBlurb, "title" | "description">>;
  personalizationToggles: Array<{
    appId: string;
    appName: string;
    blurb: Pick<ConnectorTosBlurb, "title" | "description">;
    defaultMode: ToolPersonalizationMode;
  }>;
};

const PRODUCT_SKU_HEADER_KEY = "OAI-Product-Sku";
const CONNECTOR_SETTING_PRODUCT_SKU = "CONNECTOR_SETTING";
const DESCRIPTION_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

export function PluginInstallModal({
  isInstalling = false,
  onConnectRequiredApp,
  onInstall,
  onOpenChange,
  session,
}: {
  isInstalling?: boolean;
  onConnectRequiredApp: (appId: string) => Promise<void>;
  onInstall: (
    appPersonalizationModes: Record<string, ToolPersonalizationMode>,
  ) => Promise<void>;
  onOpenChange: (nextOpen: boolean) => void;
  session: PluginInstallSession;
}): ReactElement | null {
  const [personalizationDraft, setPersonalizationDraft] = useState<{
    modes: Record<string, ToolPersonalizationMode>;
    pluginId: string;
  } | null>(null);
  const { blockedReason, isLoading: isPluginInstallBlockedLoading } =
    usePluginDisabledByAdmin(
      session.kind === "details"
        ? {
            marketplacePath: session.plugin.marketplacePath,
            pluginName: session.plugin.plugin.name,
          }
        : {},
    );
  const isPluginInstallBlocked = blockedReason != null;
  const { plugin: pluginDetail } = usePluginDetail({
    marketplacePath:
      session.kind === "closed" ? null : session.plugin.marketplacePath,
    pluginName: session.kind === "closed" ? null : session.plugin.plugin.name,
    enabled: session.kind !== "closed",
  });
  const pluginDetailApps =
    session.kind === "closed" ? [] : (pluginDetail?.apps ?? []);
  const { data: disclosureData, isPending: isLoadingDisclosureData } = useQuery(
    {
      queryKey: [
        "plugins",
        "install-modal",
        "disclosure",
        pluginDetailApps.map((app) => app.id),
      ],
      enabled: session.kind === "details" && pluginDetailApps.length > 0,
      staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
      queryFn: async (): Promise<PluginInstallDisclosureData> => {
        const disclosures = await Promise.all(
          pluginDetailApps.map(async (app) => {
            const connectorTos = await CodexRequest.safeGet(
              "/aip/connectors/{connector_id}/tos",
              {
                parameters: {
                  path: {
                    connector_id: app.id,
                  },
                },
                additionalHeaders: {
                  [PRODUCT_SKU_HEADER_KEY]: CONNECTOR_SETTING_PRODUCT_SKU,
                },
              },
            );

            return {
              app,
              connectorTos,
            };
          }),
        );

        const blurbs = getUniqueDisclosureBlurbs(
          disclosures.flatMap(({ connectorTos }) => connectorTos.blurbs),
        );
        const personalizationToggles: PluginInstallDisclosureData["personalizationToggles"] =
          disclosures.flatMap(({ app, connectorTos }) => {
            if (connectorTos.personalization_toggle_blurb == null) {
              return [];
            }

            return [
              {
                appId: app.id,
                appName: app.name,
                blurb: connectorTos.personalization_toggle_blurb,
                defaultMode:
                  connectorTos.personalization_default ?? "NO_PERSONALIZATION",
              },
            ];
          });

        return {
          blurbs,
          personalizationToggles,
        };
      },
    },
  );

  if (session.kind === "closed") {
    return null;
  }
  const phase = session.kind === "needsApps" ? "needsApps" : "details";
  const plugin = session.plugin;
  const appPersonalizationDraftModes =
    personalizationDraft?.pluginId === plugin.plugin.id
      ? personalizationDraft.modes
      : {};
  const personalizationToggles =
    pluginDetail?.summary.authPolicy === "ON_INSTALL"
      ? (disclosureData?.personalizationToggles ?? [])
      : [];
  // If disclosure loading fails, do not apply connector defaults the user never saw.
  const appPersonalizationModes = getResolvedAppPersonalizationModes({
    draftModes: appPersonalizationDraftModes,
    personalizationToggles,
  });
  const isLoadingInstallDisclosure =
    phase === "details" &&
    pluginDetailApps.length > 0 &&
    isLoadingDisclosureData;

  return (
    <Dialog
      open={true}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isInstalling) {
          return;
        }
        if (!nextOpen) {
          setPersonalizationDraft(null);
        }
        onOpenChange(nextOpen);
      }}
      shouldIgnoreClickOutside={isInstalling}
      showDialogClose={!isInstalling}
      size="wide"
      contentClassName="max-h-[calc(100vh-4rem)] overflow-hidden"
    >
      <DialogBody className="max-h-[calc(100vh-4rem)] gap-6 overflow-y-auto px-6 pt-8 pb-6">
        <PluginInstallHero phase={phase} plugin={plugin} />

        {phase === "details" ? (
          <PluginInstallDetailsCard
            appPersonalizationModes={appPersonalizationModes}
            disclosureData={disclosureData}
            isLoadingDisclosureData={isLoadingDisclosureData}
            onAppPersonalizationModeChange={({ appId, mode }): void => {
              setPersonalizationDraft({
                modes: {
                  ...appPersonalizationDraftModes,
                  [appId]: mode,
                },
                pluginId: plugin.plugin.id,
              });
            }}
            plugin={plugin}
            pluginDetail={pluginDetail}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <PluginSummaryCard plugin={plugin} />
            <PluginRequiredAppsSection
              onConnectRequiredApp={onConnectRequiredApp}
              requiredApps={
                session.kind === "needsApps" ? session.requiredApps : []
              }
            />
          </div>
        )}

        {phase === "details" ? (
          <Tooltip
            tooltipContent={
              blockedReason === "connector-unavailable" ? (
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
            disabled={!isPluginInstallBlocked}
          >
            <div className="flex w-full">
              <Button
                color="primary"
                size="large"
                className="w-full justify-center"
                disabled={
                  isPluginInstallBlocked ||
                  isPluginInstallBlockedLoading ||
                  isLoadingInstallDisclosure
                }
                loading={isInstalling}
                onClick={() => {
                  void onInstall(appPersonalizationModes);
                }}
              >
                {isInstalling ? (
                  <FormattedMessage
                    id="plugins.installModal.installing"
                    defaultMessage="Installing {pluginName}"
                    description="Button label in the plugin install modal while installation is in progress"
                    values={{
                      pluginName: getPluginDisplayName(plugin),
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="plugins.installModal.install"
                    defaultMessage="Install {pluginName}"
                    description="Install button label in the plugin install modal"
                    values={{
                      pluginName: getPluginDisplayName(plugin),
                    }}
                  />
                )}
              </Button>
            </div>
          </Tooltip>
        ) : null}
      </DialogBody>
    </Dialog>
  );
}

function PluginInstallHero({
  phase,
  plugin,
}: {
  phase: "details" | "needsApps";
  plugin: InstalledPlugin;
}): ReactElement {
  const developerName = plugin.plugin.interface?.developerName?.trim();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-sm">
          <OpenAIBlossomIcon className="size-12" />
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-token-border-default" />
          <span className="size-1.5 rounded-full bg-token-border-default" />
          <span className="size-1.5 rounded-full bg-token-border-default" />
        </span>
        <span className="bg-token-surface-tertiary flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-token-border-default shadow-sm">
          <ConnectorLogo
            alt={getPluginDisplayName(plugin)}
            className="size-full object-contain"
            logoUrl={plugin.logoPath}
            fallback={
              <AppsIcon className="icon-md text-token-text-secondary" />
            }
          />
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="heading-dialog font-semibold">
          {phase === "details" ? (
            <FormattedMessage
              id="plugins.installModal.title"
              defaultMessage="Install {pluginName}"
              description="Title shown in the plugin install modal before installation starts"
              values={{
                pluginName: getPluginDisplayName(plugin),
              }}
            />
          ) : (
            <FormattedMessage
              id="plugins.installModal.finishSetup.title"
              defaultMessage="Finish setting up {pluginName}"
              description="Title shown in the plugin install modal when additional app connections are required"
              values={{
                pluginName: getPluginDisplayName(plugin),
              }}
            />
          )}
        </div>
        {developerName ? (
          <div className="text-sm text-token-text-secondary">
            <FormattedMessage
              id="plugins.installModal.developedBy"
              defaultMessage="Developed by {developerName}"
              description="Developer subtitle shown in the plugin install modal"
              values={{
                developerName,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PluginInstallDetailsCard({
  appPersonalizationModes,
  disclosureData,
  isLoadingDisclosureData,
  onAppPersonalizationModeChange,
  plugin,
  pluginDetail,
}: {
  appPersonalizationModes: Record<string, ToolPersonalizationMode>;
  disclosureData?: PluginInstallDisclosureData;
  isLoadingDisclosureData: boolean;
  onAppPersonalizationModeChange: (params: {
    appId: string;
    mode: ToolPersonalizationMode;
  }) => void;
  plugin: InstalledPlugin;
  pluginDetail: AppServer.v2.PluginDetail | null;
}): ReactElement {
  const description = getPluginLongDescription(plugin);
  const capabilities = plugin.plugin.interface?.capabilities ?? [];
  const includesApps = (pluginDetail?.apps.length ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-token-border-default px-4 py-2">
      {!includesApps ? <PluginSummarySection plugin={plugin} /> : null}

      {!includesApps && description ? (
        <PluginInfoSection>
          <div className="text-sm font-medium text-token-text-primary">
            <FormattedMessage
              id="plugins.installModal.about"
              defaultMessage="About"
              description="Section title for the plugin description in the plugin install modal"
            />
          </div>
          <div className="max-h-40 overflow-y-auto pr-1 text-sm text-token-text-secondary">
            {description}
          </div>
        </PluginInfoSection>
      ) : null}

      {!includesApps && pluginDetail != null ? (
        <PluginInstallContentsSection pluginDetail={pluginDetail} />
      ) : null}

      {!includesApps && capabilities.length > 0 ? (
        <PluginInfoSection>
          <div className="text-sm font-medium text-token-text-primary">
            <FormattedMessage
              id="plugins.installModal.capabilities"
              defaultMessage="Capabilities"
              description="Section title for the capability list in the plugin install modal"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <Badge
                key={capability}
                className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary"
              >
                {capability}
              </Badge>
            ))}
          </div>
        </PluginInfoSection>
      ) : null}

      {includesApps ? (
        <PluginInstallDisclosureSection
          appPersonalizationModes={appPersonalizationModes}
          disclosureData={disclosureData}
          isLoadingDisclosureData={isLoadingDisclosureData}
          onAppPersonalizationModeChange={onAppPersonalizationModeChange}
          pluginDetail={pluginDetail}
        />
      ) : null}
    </div>
  );
}

function PluginInstallContentsSection({
  pluginDetail,
}: {
  pluginDetail: AppServer.v2.PluginDetail;
}): ReactElement | null {
  const sections = [
    {
      id: "apps",
      items: pluginDetail.apps.map((app) => app.name),
      title: (
        <FormattedMessage
          id="plugins.installModal.includes.apps"
          defaultMessage="Apps"
          description="Label for bundled apps in the plugin install modal"
        />
      ),
    },
    {
      id: "skills",
      items: pluginDetail.skills.map((skill) =>
        getPluginInstallSkillTitle(skill),
      ),
      title: (
        <FormattedMessage
          id="plugins.installModal.includes.skills"
          defaultMessage="Skills"
          description="Label for bundled skills in the plugin install modal"
        />
      ),
    },
    {
      id: "mcpServers",
      items: pluginDetail.mcpServers,
      title: (
        <FormattedMessage
          id="plugins.installModal.includes.mcpServers"
          defaultMessage="MCP servers"
          description="Label for bundled MCP servers in the plugin install modal"
        />
      ),
    },
  ].filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    return null;
  }

  return (
    <PluginInfoSection>
      <div className="text-sm font-medium text-token-text-primary">
        <FormattedMessage
          id="plugins.installModal.includes"
          defaultMessage="Includes"
          description="Section title for bundled apps, skills, and MCP servers in the plugin install modal"
        />
      </div>
      <div className="flex flex-col gap-3">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-2">
            <div className="text-xs font-medium tracking-wide text-token-text-secondary uppercase">
              {section.title}
            </div>
            <div className="flex flex-wrap gap-2">
              {section.items.map((item) => (
                <Badge
                  key={`${section.id}-${item}`}
                  className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PluginInfoSection>
  );
}

function PluginSummaryCard({
  plugin,
}: {
  plugin: InstalledPlugin;
}): ReactElement {
  return (
    <div className="rounded-2xl border border-token-border-default px-4 py-2">
      <PluginSummarySection plugin={plugin} />
    </div>
  );
}

function PluginInstallDisclosureSection({
  appPersonalizationModes,
  disclosureData,
  isLoadingDisclosureData,
  onAppPersonalizationModeChange,
  pluginDetail,
}: {
  appPersonalizationModes: Record<string, ToolPersonalizationMode>;
  disclosureData?: PluginInstallDisclosureData;
  isLoadingDisclosureData: boolean;
  onAppPersonalizationModeChange: (params: {
    appId: string;
    mode: ToolPersonalizationMode;
  }) => void;
  pluginDetail: AppServer.v2.PluginDetail | null;
}): ReactElement | null {
  // ON_USE installs do not immediately continue into app connect, so any
  // personalization choice made here would not be applied during install.
  const tosBlurbs = disclosureData?.blurbs ?? [];
  const personalizationToggles =
    pluginDetail?.summary.authPolicy === "ON_INSTALL"
      ? (disclosureData?.personalizationToggles ?? [])
      : [];

  if (
    !isLoadingDisclosureData &&
    tosBlurbs.length === 0 &&
    personalizationToggles.length === 0
  ) {
    return null;
  }

  return (
    <PluginInfoSection>
      {isLoadingDisclosureData ? (
        <PluginInstallBlurbSkeleton />
      ) : (
        <PluginInstallBlurbList
          appPersonalizationModes={appPersonalizationModes}
          blurbs={tosBlurbs}
          onAppPersonalizationModeChange={onAppPersonalizationModeChange}
          personalizationToggles={personalizationToggles}
        />
      )}
    </PluginInfoSection>
  );
}

function PluginRequiredAppsSection({
  onConnectRequiredApp,
  requiredApps,
}: {
  onConnectRequiredApp: (appId: string) => Promise<void>;
  requiredApps: Extract<
    PluginInstallSession,
    { kind: "needsApps" }
  >["requiredApps"];
}): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-semibold text-token-text-primary">
        <FormattedMessage
          id="plugins.installModal.requiredApps"
          defaultMessage="Required apps"
          description="Section title for apps that need to be connected after plugin install"
        />
      </div>
      <div className="flex flex-col">
        {requiredApps.map((app) => (
          <div
            key={app.appId}
            className="flex items-center justify-between gap-3 border-t border-token-border-default py-3 first:border-none first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="bg-token-surface-tertiary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-token-border-default">
                <ConnectorLogo
                  alt={app.name}
                  className="size-full object-contain"
                  logoUrl={app.logoUrl}
                  fallback={
                    <AppsIcon className="icon-md text-token-text-secondary" />
                  }
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-token-text-primary">
                  {app.name}
                </div>
                {app.description ? (
                  <div className="mt-1 text-sm text-token-text-secondary">
                    {app.description}
                  </div>
                ) : null}
              </div>
            </div>
            <Button
              color={app.status === "connected" ? "outline" : "primary"}
              size="medium"
              disabled={app.status !== "pending"}
              loading={
                app.status === "launching" ||
                app.status === "waitingForCallback"
              }
              className="min-w-24 shrink-0 justify-center"
              onClick={() => {
                void onConnectRequiredApp(app.appId);
              }}
            >
              {getRequiredAppButtonLabel(app.status)}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PluginInstallExternalLink({
  children,
  url,
}: {
  children: ReactNode;
  url: string | null;
}): ReactElement {
  const href = url?.trim();
  if (!href) {
    return <>{children}</>;
  }

  return (
    <a
      href={href}
      className="underline underline-offset-2 hover:no-underline"
      onClick={(event): void => {
        event.preventDefault();
        messageBus.dispatchMessage("open-in-browser", { url: href });
      }}
    >
      {children}
    </a>
  );
}

function PluginInstallBlurbSkeleton(): ReactElement {
  return (
    <div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-1 border-t border-token-border-default py-2.5 first:border-none first:pt-0 last:pb-0"
        >
          <div className="h-3 w-36 rounded bg-token-border-default" />
          <div className="h-2.5 w-full rounded bg-token-border-default" />
          <div className="h-2.5 w-4/5 rounded bg-token-border-default" />
        </div>
      ))}
    </div>
  );
}

function PluginInstallBlurbList({
  appPersonalizationModes,
  blurbs,
  onAppPersonalizationModeChange,
  personalizationToggles,
}: {
  appPersonalizationModes: Record<string, ToolPersonalizationMode>;
  blurbs: Array<Pick<ConnectorTosBlurb, "title" | "description">>;
  onAppPersonalizationModeChange: (params: {
    appId: string;
    mode: ToolPersonalizationMode;
  }) => void;
  personalizationToggles: PluginInstallDisclosureData["personalizationToggles"];
}): ReactElement {
  const intl = useIntl();

  return (
    <div className="text-sm text-token-text-secondary">
      {personalizationToggles.map((toggle) => (
        <div
          key={toggle.appId}
          className="flex items-start justify-between gap-4 border-t border-token-border-default py-2.5 first:border-none first:pt-0 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-token-text-primary">
              {toggle.blurb.title}
            </div>
            <div>{renderDescriptionWithLinks(toggle.blurb.description)}</div>
          </div>
          <Toggle
            checked={
              appPersonalizationModes[toggle.appId] === "PERSONALIZE_ALWAYS"
            }
            ariaLabel={intl.formatMessage(
              {
                id: "plugins.installModal.personalizationToggle",
                defaultMessage:
                  "Allow ChatGPT to use reference memories and chats for {appName}",
                description:
                  "Accessible label for the personalization toggle in the plugin install modal",
              },
              { appName: toggle.appName },
            )}
            onChange={(next): void => {
              onAppPersonalizationModeChange({
                appId: toggle.appId,
                mode: next ? "PERSONALIZE_ALWAYS" : "NO_PERSONALIZATION",
              });
            }}
          />
        </div>
      ))}
      {blurbs.map((blurb, index) => (
        <div
          key={`${blurb.title}-${index}`}
          className={
            personalizationToggles.length > 0 || index > 0
              ? "flex flex-col gap-1 border-t border-token-border-default py-2.5 last:pb-0"
              : "flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0"
          }
        >
          <div className="font-medium text-token-text-primary">
            {blurb.title}
          </div>
          <div>{renderDescriptionWithLinks(blurb.description)}</div>
        </div>
      ))}
    </div>
  );
}

function getRequiredAppButtonLabel(
  status: Extract<
    PluginInstallSession,
    { kind: "needsApps" }
  >["requiredApps"][number]["status"],
): ReactElement {
  switch (status) {
    case "connected":
      return (
        <FormattedMessage
          id="plugins.installModal.requiredApps.connected"
          defaultMessage="Connected"
          description="Button label shown for a required app that is already connected"
        />
      );
    case "launching":
    case "waitingForCallback":
      return (
        <FormattedMessage
          id="plugins.installModal.requiredApps.connecting"
          defaultMessage="Opened link"
          description="Button label shown after the required app connection flow has been opened"
        />
      );
    case "pending":
      return (
        <FormattedMessage
          id="plugins.installModal.requiredApps.connect"
          defaultMessage="Connect"
          description="Button label shown for a required app that still needs to be connected"
        />
      );
  }
}

function PluginSummarySection({
  plugin,
}: {
  plugin: InstalledPlugin;
}): ReactElement {
  return (
    <PluginInfoSection>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-medium text-token-text-primary">
          {getPluginDisplayName(plugin)}
        </div>
        {plugin.marketplaceName.length > 0 ? (
          <Badge className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary">
            {plugin.marketplaceName}
          </Badge>
        ) : null}
      </div>
      <PluginMetadataLines plugin={plugin} />
    </PluginInfoSection>
  );
}

function PluginMetadataLines({
  plugin,
}: {
  plugin: InstalledPlugin;
}): ReactElement | null {
  const developerName = plugin.plugin.interface?.developerName?.trim();
  const category = plugin.plugin.interface?.category?.trim();

  if (developerName == null && category == null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 text-sm text-token-text-secondary">
      {developerName ? (
        <div>
          <FormattedMessage
            id="plugins.installModal.metadata.developer"
            defaultMessage="By {developerName}"
            description="Developer metadata shown in the plugin install modal"
            values={{
              developerName,
            }}
          />
        </div>
      ) : null}
      {category ? (
        <div>
          <FormattedMessage
            id="plugins.installModal.metadata.category"
            defaultMessage="Category: {category}"
            description="Category metadata shown in the plugin install modal"
            values={{
              category,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function PluginInfoSection({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2 border-b border-token-border-default py-3 last:border-none">
      {children}
    </div>
  );
}

function renderDescriptionWithLinks(text: string): ReactNode {
  const segments: Array<ReactNode> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = DESCRIPTION_LINK_REGEX.exec(text)) != null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, label, href] = match;
    const trimmedHref = href.trim();
    if (trimmedHref.length === 0) {
      segments.push(label);
      lastIndex = match.index + fullMatch.length;
      continue;
    }

    segments.push(
      <PluginInstallExternalLink
        key={`${trimmedHref}-${match.index}`}
        url={trimmedHref}
      >
        {label}
      </PluginInstallExternalLink>,
    );
    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  if (segments.length === 0) {
    return text;
  }
  return segments.length === 1 ? segments[0] : segments;
}

function getUniqueDisclosureBlurbs(
  blurbs: ConnectorTos["blurbs"],
): Array<Pick<ConnectorTosBlurb, "title" | "description">> {
  const seenBlurbs = new Set<string>();

  return blurbs.flatMap((blurb) => {
    const key = `${blurb.title}\u0000${blurb.description}`;
    if (seenBlurbs.has(key)) {
      return [];
    }

    seenBlurbs.add(key);
    return [
      {
        description: blurb.description,
        title: blurb.title,
      },
    ];
  });
}

function getResolvedAppPersonalizationModes({
  draftModes,
  personalizationToggles,
}: {
  draftModes: Record<string, ToolPersonalizationMode>;
  personalizationToggles: PluginInstallDisclosureData["personalizationToggles"];
}): Record<string, ToolPersonalizationMode> {
  const resolvedModes = { ...draftModes };

  for (const toggle of personalizationToggles) {
    resolvedModes[toggle.appId] ??= toggle.defaultMode;
  }

  return resolvedModes;
}

function getPluginLongDescription(plugin: InstalledPlugin): string | null {
  const longDescription = plugin.plugin.interface?.longDescription?.trim();
  if (longDescription) {
    return longDescription;
  }

  const shortDescription = plugin.plugin.interface?.shortDescription?.trim();
  if (shortDescription) {
    return shortDescription;
  }

  const description = plugin.description?.trim();
  if (description) {
    return description;
  }

  return null;
}

function getPluginInstallSkillTitle(skill: AppServer.v2.SkillSummary): string {
  const displayName = skill.interface?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const nameWithoutPluginPrefix = skill.name.split(":").pop();
  return formatSkillTitle(nameWithoutPluginPrefix || skill.name);
}
