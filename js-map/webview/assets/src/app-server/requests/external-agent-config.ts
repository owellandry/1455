import type * as AppServer from "app-server-types";

import type { AppServerManager } from "../app-server-manager";

export function detectExternalAgentConfig(
  manager: AppServerManager,
  params: AppServer.v2.ExternalAgentConfigDetectParams,
): Promise<AppServer.v2.ExternalAgentConfigDetectResponse> {
  return manager.sendRequest("externalAgentConfig/detect", params);
}

export function importExternalAgentConfig(
  manager: AppServerManager,
  params: AppServer.v2.ExternalAgentConfigImportParams,
): Promise<AppServer.v2.ExternalAgentConfigImportResponse> {
  return manager.sendRequest("externalAgentConfig/import", params);
}
