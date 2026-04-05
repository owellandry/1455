import type * as AppServer from "app-server-types";
import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { PluginsCardsGrid } from "@/plugins/plugins-cards-grid";
import type { InstalledPlugin } from "@/plugins/use-plugins";

import { PluginsPageSection } from "./plugins-page-section";
import type { PluginsPageSectionDescriptor } from "./plugins-page-utils";

export function PluginsTabContent({
  errorMessage,
  isLoading,
  pendingPluginId,
  pendingUninstallPluginId,
  onToggleInstalledPluginEnabled,
  onInstallPlugin,
  onOpenPluginDetails,
  onTryInChat,
  onUninstallInstalledPlugin,
  sections,
}: {
  errorMessage: string | null;
  isLoading: boolean;
  pendingPluginId?: string | null;
  pendingUninstallPluginId?: string | null;
  onToggleInstalledPluginEnabled?: (params: {
    pluginDisplayName: string;
    pluginId: string;
    enabled: boolean;
  }) => Promise<AppServer.v2.ConfigWriteResponse>;
  onInstallPlugin: (plugin: InstalledPlugin) => Promise<void>;
  onOpenPluginDetails?: (plugin: InstalledPlugin) => void;
  onTryInChat?: (plugin: InstalledPlugin) => void;
  onUninstallInstalledPlugin?: (params: {
    pluginDisplayName: string;
    pluginId: string;
  }) => Promise<void>;
  sections: Array<{
    section: PluginsPageSectionDescriptor;
    plugins: Array<InstalledPlugin>;
  }>;
}): ReactElement {
  const emptyStateTitle = (
    <FormattedMessage
      id="skills.appsPage.empty.plugins"
      defaultMessage="No plugins found"
      description="Empty state title when there are no plugins on the Plugins tab"
    />
  );

  if (isLoading || errorMessage || sections.length === 0) {
    return (
      <div className="flex h-full min-h-full flex-1">
        <PluginsCardsGrid
          errorMessage={errorMessage}
          isLoading={isLoading}
          installedStateAction="status"
          plugins={[]}
          onInstallPlugin={onInstallPlugin}
          onOpenPluginDetails={onOpenPluginDetails}
          onTryInChat={onTryInChat}
          onToggleInstalledPluginEnabled={onToggleInstalledPluginEnabled}
          onUninstallInstalledPlugin={onUninstallInstalledPlugin}
          pendingPluginId={pendingPluginId}
          pendingUninstallPluginId={pendingUninstallPluginId}
          emptyStateTitle={emptyStateTitle}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-9">
      {sections.map(({ section, plugins }) => (
        <PluginsPageSection
          key={section.id}
          id={section.id}
          title={section.title}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <PluginsCardsGrid
              errorMessage={errorMessage}
              isLoading={isLoading}
              installedStateAction="status"
              plugins={plugins}
              onInstallPlugin={onInstallPlugin}
              onOpenPluginDetails={onOpenPluginDetails}
              onTryInChat={onTryInChat}
              onToggleInstalledPluginEnabled={onToggleInstalledPluginEnabled}
              onUninstallInstalledPlugin={onUninstallInstalledPlugin}
              pendingPluginId={pendingPluginId}
              pendingUninstallPluginId={pendingUninstallPluginId}
              emptyStateTitle={emptyStateTitle}
            />
          </div>
        </PluginsPageSection>
      ))}
    </div>
  );
}
