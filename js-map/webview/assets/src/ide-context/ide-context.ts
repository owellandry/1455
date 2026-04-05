import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { IdeContext } from "protocol";

import { useWindowType } from "@/hooks/use-window-type";
import { getQueryKey, useFetchFromVSCode } from "@/vscode-api";

export function useRefetchIdeContext(): () => void {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: getQueryKey("ide-context"),
    });
  };
}

export function useIdeContext(): UseQueryResult<IdeContext, Error> {
  const windowType = useWindowType();
  const isElectron = windowType === "electron";
  const isExtension = windowType === "extension";
  // IDE context is tied to a VS Code workspace so we don't need to specify it for VS Code.
  // For electron, we use the IDE context from the VS Code workspace that has the first workspace root.
  const { data: workspaceRoot } = useFetchFromVSCode("active-workspace-roots", {
    select: (data) => data.roots[0],
    queryConfig: { enabled: isElectron },
  });
  return useFetchFromVSCode("ide-context", {
    params: isElectron && !!workspaceRoot ? { workspaceRoot } : undefined,
    queryConfig: {
      enabled: isExtension || (isElectron && !!workspaceRoot),
    },
    select: (data) => data.ideContext,
  });
}
