import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useWindowType } from "@/hooks/use-window-type";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { workerRpcClient } from "@/worker-rpc";

import { refetchGitWorktreeQueries } from "./git-api";
import { getHostKey } from "./host-config-utils";

export function GitQueryInvalidationListener(): null {
  const windowType = useWindowType();
  const queryClient = useQueryClient();
  const hasGitRpc = windowType === "electron" || windowType === "extension";
  // The watcher only works with the default local host anyways, as currnetly cant watch remote repos
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const hostKey = getHostKey(hostConfig);

  useEffect(() => {
    if (!hasGitRpc) {
      return;
    }
    return workerRpcClient("git").subscribe("git-repo-changed", (event) => {
      void refetchGitWorktreeQueries(queryClient, event, {
        changeType: event.changeType,
        hostKey,
      });
    });
  }, [hasGitRpc, queryClient, hostKey]);

  return null;
}
