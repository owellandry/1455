import type { QueryClient, UseQueryResult } from "@tanstack/react-query";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type * as AppServer from "app-server-types";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { getAppConnectConnectorQueryOptions } from "@/apps/app-connect-actions";
import { type AppToolDetails, getAppTools } from "@/apps/app-tools";
import {
  fetchConnectorLogoDataUrl,
  getConnectorLogoRequestCacheKey,
  getConnectorLogoRequestFromLogoUrl,
  type ConnectorLogoRequest,
} from "@/apps/resolve-connector-logos";
import { useAuth } from "@/auth/use-auth";
import { useIsAppsEnabled } from "@/hooks/use-is-apps-enabled";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

const APPS_LIST_LIMIT = 1000;
const CONNECTOR_LOGO_QUERY_KEY_PREFIX = "connector-logo";

export const APPS_LIST_QUERY_KEY: Array<string> = ["apps", "list"];

type AppsListQueryResult = Omit<
  UseQueryResult<Array<AppServer.v2.AppInfo>, Error>,
  "data"
> & {
  data: Array<AppServer.v2.AppInfo> | undefined;
  hardRefetchAppsList: () => Promise<void>;
  isHardRefetchingAppsList: boolean;
  loadError: Error | null;
};

type FetchAppsListParams = {
  appServerManager: AppServerManager;
  forceRefetch: boolean;
};

export async function hardRefetchAppsListQuery({
  appServerManager,
  queryClient,
}: {
  appServerManager: AppServerManager;
  queryClient: QueryClient;
}): Promise<void> {
  const apps = await fetchAppsListWithRetry({
    appServerManager,
    forceRefetch: true,
  });
  queryClient.setQueryData<Array<AppServer.v2.AppInfo>>(
    APPS_LIST_QUERY_KEY,
    apps,
  );
}

export function useAppsList({
  enabled = true,
}: {
  enabled?: boolean;
} = {}): AppsListQueryResult {
  const auth = useAuth();
  const appServerManager = useDefaultAppServerManager();
  const isAppsEnabled = useIsAppsEnabled();
  const queryClient = useQueryClient();
  const isAuthReady = !auth.isLoading && auth.userId != null;
  const isQueryEnabled = enabled && isAppsEnabled && isAuthReady;
  const query = useQuery({
    queryKey: APPS_LIST_QUERY_KEY,
    queryFn: async (): Promise<Array<AppServer.v2.AppInfo>> =>
      fetchAppsListWithRetry({
        appServerManager,
        forceRefetch: true,
      }),
    enabled: isQueryEnabled,
    retry: false,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
  });
  const hardRefetchMutation = useMutation({
    retry: false,
    onMutate: async (): Promise<void> => {
      await queryClient.cancelQueries({
        queryKey: APPS_LIST_QUERY_KEY,
      });
    },
    mutationFn: async (): Promise<void> => {
      await hardRefetchAppsListQuery({
        appServerManager,
        queryClient,
      });
    },
  });
  const hardRefetchError =
    hardRefetchMutation.error != null &&
    hardRefetchMutation.submittedAt > query.dataUpdatedAt
      ? hardRefetchMutation.error
      : null;

  return {
    ...query,
    data: isAppsEnabled ? query.data : [],
    hardRefetchAppsList: async (): Promise<void> => {
      await hardRefetchMutation.mutateAsync();
    },
    isHardRefetchingAppsList: hardRefetchMutation.isPending,
    loadError: hardRefetchError ?? query.error ?? null,
  };
}

export function useAppsListWithResolvedConnectorLogos(): AppsListQueryResult {
  const appsQuery = useAppsList();
  const appsForResolution = appsQuery.data ?? [];

  const connectorLogoRequests = collectConnectorLogoRequests(appsForResolution);
  const connectorLogoResults = useQueries({
    queries: connectorLogoRequests.map((request) => ({
      queryKey: [
        CONNECTOR_LOGO_QUERY_KEY_PREFIX,
        request.connectorId,
        request.theme,
      ],
      queryFn: async (): Promise<string> => {
        return fetchConnectorLogoDataUrl(request);
      },
      staleTime: QUERY_STALE_TIME.INFINITE,
    })),
  });
  const connectorLogoDataUrlByCacheKey = new Map<string, string>();
  connectorLogoRequests.forEach((request, index) => {
    const result = connectorLogoResults[index];
    if (result?.data == null) {
      return;
    }
    connectorLogoDataUrlByCacheKey.set(
      getConnectorLogoRequestCacheKey(request),
      result.data,
    );
  });

  const resolvedApps = appsForResolution.map((app) => {
    const logoUrl = resolveAppLogoUrl({
      logoUrl: app.logoUrl,
      connectorLogoDataUrlByCacheKey,
    });
    const logoUrlDark = resolveAppLogoUrl({
      logoUrl: app.logoUrlDark,
      connectorLogoDataUrlByCacheKey,
    });
    if (logoUrl === app.logoUrl && logoUrlDark === app.logoUrlDark) {
      return app;
    }
    return {
      ...app,
      logoUrl,
      logoUrlDark,
    };
  });

  if (appsQuery.data == null) {
    return appsQuery;
  }

  return {
    ...appsQuery,
    data: resolvedApps,
  };
}

export function useEnabledInstalledApps(): Array<AppServer.v2.AppInfo> {
  const { data: apps = [] } = useAppsListWithResolvedConnectorLogos();
  return getEnabledInstalledApps(apps);
}

export function useAppTools(
  appId: string | null,
): UseQueryResult<Array<AppToolDetails>, Error> {
  return useQuery({
    ...getAppConnectConnectorQueryOptions(appId ?? "", {
      includeActions: true,
    }),
    enabled: appId != null,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    select: ({ actions }) => {
      return getAppTools({ actions });
    },
  });
}

export function getEnabledInstalledApps(
  apps: Array<AppServer.v2.AppInfo>,
): Array<AppServer.v2.AppInfo> {
  return apps.filter((app) => {
    return app.isAccessible && app.isEnabled;
  });
}

async function fetchAppsList({
  appServerManager,
  forceRefetch,
}: FetchAppsListParams): Promise<Array<AppServer.v2.AppInfo>> {
  try {
    const readAllPages = async (
      cursor: string | null,
    ): Promise<Array<AppServer.v2.AppInfo>> => {
      const response = await appServerManager.listApps({
        cursor,
        limit: APPS_LIST_LIMIT,
        ...(forceRefetch ? { forceRefetch: true } : {}),
      });
      if (response.nextCursor == null) {
        return response.data;
      }
      return [...response.data, ...(await readAllPages(response.nextCursor))];
    };

    return await readAllPages(null);
  } catch (error) {
    logger.error("Failed to load apps list", {
      safe: { error: String(error) },
      sensitive: {},
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function fetchAppsListWithRetry(
  params: FetchAppsListParams,
): Promise<Array<AppServer.v2.AppInfo>> {
  try {
    return await fetchAppsList(params);
  } catch {
    return fetchAppsList(params);
  }
}

function collectConnectorLogoRequests(
  apps: Array<AppServer.v2.AppInfo>,
): Array<ConnectorLogoRequest> {
  const requestsByCacheKey = new Map<string, ConnectorLogoRequest>();
  apps.forEach((app) => {
    const lightLogoRequest = getConnectorLogoRequestFromLogoUrl(app.logoUrl);
    if (lightLogoRequest != null) {
      requestsByCacheKey.set(
        getConnectorLogoRequestCacheKey(lightLogoRequest),
        lightLogoRequest,
      );
    }

    const darkLogoRequest = getConnectorLogoRequestFromLogoUrl(app.logoUrlDark);
    if (darkLogoRequest != null) {
      requestsByCacheKey.set(
        getConnectorLogoRequestCacheKey(darkLogoRequest),
        darkLogoRequest,
      );
    }
  });
  return Array.from(requestsByCacheKey.values());
}

function resolveAppLogoUrl({
  logoUrl,
  connectorLogoDataUrlByCacheKey,
}: {
  logoUrl: string | null;
  connectorLogoDataUrlByCacheKey: Map<string, string>;
}): string | null {
  const normalizedLogoUrl = logoUrl?.trim();
  if (normalizedLogoUrl == null) {
    return null;
  }
  if (normalizedLogoUrl.length === 0) {
    return null;
  }

  const request = getConnectorLogoRequestFromLogoUrl(normalizedLogoUrl);
  if (request == null) {
    return normalizedLogoUrl;
  }

  return (
    connectorLogoDataUrlByCacheKey.get(
      getConnectorLogoRequestCacheKey(request),
    ) ?? null
  );
}
