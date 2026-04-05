import type { components } from "@oai/sa-server-client";
import { useQueries } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";

import { getAppConnectConnectorQueryOptions } from "@/apps/app-connect-actions";
import { useAppsList } from "@/queries/apps-queries";
import { usePluginDetail } from "@/queries/plugin-detail-queries";

const DISABLED_BY_ADMIN_STATUS: components["schemas"]["ConnectorStatus"] =
  "DISABLED_BY_ADMIN";

export type PluginInstallBlockedReason =
  | "disabled-by-admin"
  | "connector-unavailable"
  | null;

export type PluginInstallBlockedReasonsByConnectorId = Partial<
  Record<string, PluginInstallBlockedReason>
>;

export function usePluginDisabledByAdmin({
  pluginApps,
  marketplacePath,
  pluginName,
}: {
  pluginApps?: Array<AppServer.v2.AppSummary>;
  marketplacePath?: string;
  pluginName?: string;
}): {
  blockedReasonsByConnectorId: PluginInstallBlockedReasonsByConnectorId;
  isLoading: boolean;
  blockedReason: PluginInstallBlockedReason;
} {
  const shouldFetchPluginDetail =
    pluginApps == null && marketplacePath != null && pluginName != null;
  const { isLoading: isPluginDetailLoading, plugin } = usePluginDetail({
    marketplacePath: marketplacePath ?? null,
    pluginName: pluginName ?? null,
    enabled: shouldFetchPluginDetail,
  });
  const appsToCheck = pluginApps ?? plugin?.apps ?? [];
  const connectorIds = Array.from(
    new Set(
      appsToCheck.map((app) => app.id).filter((appId) => appId.length > 0),
    ),
  );
  const {
    data: directoryApps = [],
    isLoading: isAppsListLoading,
    loadError: appsListError,
  } = useAppsList({
    enabled: connectorIds.length > 0,
  });
  const connectorQueries = useQueries({
    queries: connectorIds.map((connectorId) =>
      getAppConnectConnectorQueryOptions(connectorId),
    ),
  });
  const {
    allBlockedByAdmin,
    blockedConnectorCount,
    blockedReasonsByConnectorId,
  } = connectorIds.reduce(
    (acc, connectorId, index) => {
      const query = connectorQueries[index];
      const isMissingFromDirectory =
        !isAppsListLoading &&
        appsListError == null &&
        !directoryApps.some((directoryApp) => directoryApp.id === connectorId);
      const blockedReasonForConnector: PluginInstallBlockedReason =
        query?.data?.status === DISABLED_BY_ADMIN_STATUS
          ? "disabled-by-admin"
          : isMissingFromDirectory ||
              (query != null &&
                !query.isPending &&
                query.error == null &&
                query.data == null)
            ? "connector-unavailable"
            : null;

      acc.blockedReasonsByConnectorId[connectorId] = blockedReasonForConnector;
      if (blockedReasonForConnector != null) {
        acc.blockedConnectorCount += 1;
      }
      if (blockedReasonForConnector !== "disabled-by-admin") {
        acc.allBlockedByAdmin = false;
      }

      return acc;
    },
    {
      allBlockedByAdmin: true,
      blockedConnectorCount: 0,
      blockedReasonsByConnectorId:
        {} as PluginInstallBlockedReasonsByConnectorId,
    },
  );
  const allConnectorsBlocked =
    connectorIds.length > 0 && blockedConnectorCount === connectorIds.length;
  const blockedReason: PluginInstallBlockedReason = !allConnectorsBlocked
    ? null
    : allBlockedByAdmin
      ? "disabled-by-admin"
      : "connector-unavailable";

  return {
    blockedReasonsByConnectorId,
    isLoading:
      (shouldFetchPluginDetail && isPluginDetailLoading) ||
      isAppsListLoading ||
      connectorQueries.some((query) => query.isPending),
    blockedReason,
  };
}
