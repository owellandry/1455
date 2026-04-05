import type * as AppServer from "app-server-types";

import type { AppServerManager } from "../app-server-manager";

export function listExperimentalFeatures(
  manager: AppServerManager,
  params: AppServer.v2.ExperimentalFeatureListParams,
): Promise<AppServer.v2.ExperimentalFeatureListResponse> {
  return manager.sendRequest("experimentalFeature/list", params);
}

export function setExperimentalFeatureEnablement(
  manager: AppServerManager,
  params: AppServer.v2.ExperimentalFeatureEnablementSetParams,
): Promise<AppServer.v2.ExperimentalFeatureEnablementSetResponse> {
  return manager.sendRequest("experimentalFeature/enablement/set", params);
}
