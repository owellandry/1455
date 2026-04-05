import type * as AppServer from "app-server-types";

import type { AppServerManager } from "../app-server-manager";

export function listPlugins(
  manager: AppServerManager,
  params: AppServer.v2.PluginListParams,
): Promise<AppServer.v2.PluginListResponse> {
  return manager.sendRequest("plugin/list", params);
}

export function readPlugin(
  manager: AppServerManager,
  params: AppServer.v2.PluginReadParams,
): Promise<AppServer.v2.PluginReadResponse> {
  return manager.sendRequest("plugin/read", params);
}

export function installPlugin(
  manager: AppServerManager,
  params: AppServer.v2.PluginInstallParams,
): Promise<AppServer.v2.PluginInstallResponse> {
  return manager.sendRequest("plugin/install", params);
}

export function uninstallPlugin(
  manager: AppServerManager,
  params: AppServer.v2.PluginUninstallParams,
): Promise<AppServer.v2.PluginUninstallResponse> {
  return manager.sendRequest("plugin/uninstall", params);
}
