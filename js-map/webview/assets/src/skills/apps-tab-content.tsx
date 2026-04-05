import type * as AppServer from "app-server-types";
import clsx from "clsx";
import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Banner } from "@/components/banner";
import { Button } from "@/components/button";
import { LargeEmptyState } from "@/components/large-empty-state";
import { AppCard } from "@/skills/app-card";

import type { InstalledCardAction } from "./installed-card-action";
import { PluginsPageSection } from "./plugins-page-section";
import type { PluginsPageSectionDescriptor } from "./plugins-page-utils";

import styles from "./skills-page-grid.module.css";

export function AppsLoadErrorBanner({
  errorMessage,
  isRetrying,
  onRetry,
}: {
  errorMessage: string;
  isRetrying: boolean;
  onRetry: () => Promise<void>;
}): ReactElement {
  return (
    <Banner
      title={
        <FormattedMessage
          id="skills.appsPage.loadError.title"
          defaultMessage="Unable to load apps"
          description="Title shown when the apps list cannot be loaded"
        />
      }
      content={errorMessage}
      type="error"
      layout="vertical"
      primaryCtaText={
        <FormattedMessage
          id="skills.appsPage.loadError.retry"
          defaultMessage="Retry"
          description="Retry button label for the apps list error state"
        />
      }
      isPrimaryCtaDisabled={isRetrying}
      onPrimaryCtaClick={() => {
        void onRetry();
      }}
    />
  );
}

export function AppsTabStatus({
  errorMessage,
  isLoading,
  isRetrying,
  onRetry,
}: {
  errorMessage: string | null;
  isLoading: boolean;
  isRetrying: boolean;
  onRetry: () => Promise<void>;
}): ReactElement {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.appsPage.loading"
              defaultMessage="Loading apps…"
              description="Loading label on the Apps tab of the Skills & Apps page"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-8">
      <LargeEmptyState
        title={
          <FormattedMessage
            id="skills.appsPage.loadError.title"
            defaultMessage="Unable to load apps"
            description="Title shown when the apps list cannot be loaded"
          />
        }
        description={errorMessage}
        actions={
          <Button
            color="outline"
            disabled={isRetrying}
            onClick={() => {
              void onRetry();
            }}
          >
            <FormattedMessage
              id="skills.appsPage.loadError.retry"
              defaultMessage="Retry"
              description="Retry button label for the apps list error state"
            />
          </Button>
        }
      />
    </div>
  );
}

export function AppsTabContent({
  apps,
  discoverApps,
  emptyInstalledAppsTitle,
  errorMessage,
  installedStateAction = "check",
  isAppConnectPending,
  isRetrying,
  updatingAppId,
  onInstallApp,
  onOpenAppTools,
  onOpenAppUrl,
  onRetry,
  onSetAppEnabled,
  onToggleShowAllRecommendedApps,
  showAllRecommendedApps,
  totalDiscoverAppsCount,
  installedSection,
  recommendedSection,
}: {
  apps: Array<AppServer.v2.AppInfo>;
  discoverApps: Array<AppServer.v2.AppInfo>;
  emptyInstalledAppsTitle: ReactElement;
  errorMessage: string | null;
  installedStateAction?: InstalledCardAction;
  isAppConnectPending: (appId: string) => boolean;
  isRetrying: boolean;
  updatingAppId: string | null;
  onInstallApp: (app: AppServer.v2.AppInfo) => Promise<void>;
  onOpenAppTools: (app: AppServer.v2.AppInfo) => void;
  onOpenAppUrl: (url: string | null) => void;
  onRetry: () => Promise<void>;
  onSetAppEnabled: (params: {
    appId: string;
    enabled: boolean;
  }) => Promise<void>;
  onToggleShowAllRecommendedApps: () => void;
  showAllRecommendedApps: boolean;
  totalDiscoverAppsCount: number;
  installedSection: PluginsPageSectionDescriptor;
  recommendedSection: PluginsPageSectionDescriptor;
}): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {errorMessage != null ? (
        <AppsLoadErrorBanner
          errorMessage={errorMessage}
          isRetrying={isRetrying}
          onRetry={onRetry}
        />
      ) : null}
      <div className="flex flex-col gap-9">
        <PluginsPageSection
          id={installedSection.id}
          title={installedSection.title}
        >
          <AppsCardsGrid
            apps={apps}
            emptyStateTitle={emptyInstalledAppsTitle}
            installedStateAction={installedStateAction}
            isAppConnectPending={isAppConnectPending}
            updatingAppId={updatingAppId}
            onInstallApp={onInstallApp}
            onOpenAppTools={onOpenAppTools}
            onOpenAppUrl={onOpenAppUrl}
            onSetAppEnabled={onSetAppEnabled}
          />
        </PluginsPageSection>

        <PluginsPageSection
          id={recommendedSection.id}
          title={recommendedSection.title}
          action={
            <div className="flex items-center gap-2">
              {totalDiscoverAppsCount > 0 ? (
                <Button
                  color="ghost"
                  size="toolbar"
                  onClick={onToggleShowAllRecommendedApps}
                >
                  {showAllRecommendedApps ? (
                    <FormattedMessage
                      id="skills.appsPage.section.discover.hideFullList"
                      defaultMessage="Hide full list"
                      description="Button label to hide the full apps list and return to recommended apps in the Skills & Apps page"
                    />
                  ) : (
                    <FormattedMessage
                      id="skills.appsPage.section.discover.seeAll"
                      defaultMessage="View all {count} apps"
                      description="Button label to show all apps in the recommended apps section on the Skills & Apps page"
                      values={{ count: totalDiscoverAppsCount }}
                    />
                  )}
                </Button>
              ) : null}
            </div>
          }
        >
          <AppsCardsGrid
            apps={discoverApps}
            emptyStateTitle={
              <FormattedMessage
                id="skills.appsPage.empty.discoverApps"
                defaultMessage="No apps found"
                description="Empty state title when there are no discoverable apps on the Skills & Apps page"
              />
            }
            isAppConnectPending={isAppConnectPending}
            updatingAppId={updatingAppId}
            onInstallApp={onInstallApp}
            onOpenAppTools={onOpenAppTools}
            onOpenAppUrl={onOpenAppUrl}
            onSetAppEnabled={onSetAppEnabled}
          />
        </PluginsPageSection>
      </div>
    </div>
  );
}

export function AppsCardsGrid({
  apps,
  emptyStateTitle,
  installedStateAction = "check",
  isSingleColumn = false,
  useCompactEmptyState = false,
  isAppConnectPending,
  updatingAppId,
  onInstallApp,
  onOpenAppTools,
  onOpenAppUrl,
  onSetAppEnabled,
}: {
  apps: Array<AppServer.v2.AppInfo>;
  emptyStateTitle: ReactElement;
  installedStateAction?: InstalledCardAction;
  isSingleColumn?: boolean;
  useCompactEmptyState?: boolean;
  isAppConnectPending: (appId: string) => boolean;
  updatingAppId: string | null;
  onInstallApp: (app: AppServer.v2.AppInfo) => Promise<void>;
  onOpenAppTools: (app: AppServer.v2.AppInfo) => void;
  onOpenAppUrl: (url: string | null) => void;
  onSetAppEnabled: (params: {
    appId: string;
    enabled: boolean;
  }) => Promise<void>;
}): ReactElement {
  if (apps.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        {useCompactEmptyState ? (
          <div className="text-sm text-token-text-secondary">
            {emptyStateTitle}
          </div>
        ) : (
          <LargeEmptyState title={emptyStateTitle} />
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "grid gap-4",
        isSingleColumn ? "grid-cols-1" : styles.grid,
      )}
    >
      {apps.map((app) => {
        return (
          <AppCard
            key={app.id}
            app={app}
            installedStateAction={installedStateAction}
            isConnectingApp={isAppConnectPending(app.id)}
            updatingAppId={updatingAppId}
            onInstallApp={onInstallApp}
            onOpenAppTools={onOpenAppTools}
            onOpenAppUrl={onOpenAppUrl}
            onSetAppEnabled={onSetAppEnabled}
          />
        );
      })}
    </div>
  );
}
