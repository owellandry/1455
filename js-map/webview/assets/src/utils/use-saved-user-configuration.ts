import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

export const useSavedUserconfig = (
  mcpManager: AppServerManager,
  cwd: string | null,
): UseQueryResult<AppServer.v2.Config | null> => {
  return useQuery({
    queryKey: ["user-saved-config", cwd ?? null],
    queryFn: async (): Promise<AppServer.v2.Config | null> => {
      try {
        return await mcpManager.getUserSavedConfiguration(cwd ?? undefined);
      } catch {
        return null;
      }
    },
    select: (data) => data ?? null,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
  });
};
