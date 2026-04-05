import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useHostConfig } from "@/shared-objects/use-host-config";

export function useIsRemoteHost(): boolean {
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  return hostConfig.kind !== "local";
}
