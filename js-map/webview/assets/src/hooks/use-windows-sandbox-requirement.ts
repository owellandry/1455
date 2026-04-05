import { ConfigurationKeys } from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useConfiguration } from "@/hooks/use-configuration";
import { useOsInfo } from "@/hooks/use-os-info";
import { useWindowsSandboxMode } from "@/queries/windows-sandbox-queries";

export function useWindowsSandboxRequirement(
  appServerManager?: AppServerManager,
): {
  isPending: boolean;
  isRequired: boolean;
} {
  const defaultAppServerManager = useDefaultAppServerManager();
  const activeAppServerManager = appServerManager ?? defaultAppServerManager;
  const { data: osInfo, isLoading: isOsInfoLoading } = useOsInfo();
  const { data: runInWslEnabled, isLoading: isRunInWslLoading } =
    useConfiguration(ConfigurationKeys.RUN_CODEX_IN_WSL);
  const { data: windowsSandboxMode, isPending: isWindowsSandboxModePending } =
    useWindowsSandboxMode(activeAppServerManager);

  const isPending =
    isOsInfoLoading || isRunInWslLoading || isWindowsSandboxModePending;
  const isRequired =
    !isPending &&
    osInfo?.platform === "win32" &&
    !osInfo.isVsCodeRunningInsideWsl &&
    runInWslEnabled !== true &&
    windowsSandboxMode == null;

  return {
    isPending,
    isRequired,
  };
}
