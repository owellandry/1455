import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
// We only support plan + default.
const ORDERED_COLLABORATION_MODE_WITHOUT_PRESET: Array<
  AppServer.CollaborationMode["mode"]
> = ["plan", "default"];

export function normalizeCollaborationModeMask(
  mask: AppServer.v2.CollaborationModeMask,
): AppServer.v2.CollaborationModeMask {
  const mode = mask.mode as string | null;
  if (mode == null || mode === "plan" || mode === "default") {
    return mask;
  }

  // Legacy app-server builds may emit older mode names; normalize to `default`.
  return {
    ...mask,
    mode: "default",
  };
}

export function orderCollaborationModeMasks(
  masks: Array<AppServer.v2.CollaborationModeMask>,
  orderedModes: Array<AppServer.CollaborationMode["mode"]>,
): Array<AppServer.v2.CollaborationModeMask> {
  const modesByKey: Partial<
    Record<
      AppServer.CollaborationMode["mode"],
      AppServer.v2.CollaborationModeMask
    >
  > = {};
  for (const mask of masks) {
    const normalizedMask = normalizeCollaborationModeMask(mask);
    if (normalizedMask.mode == null || modesByKey[normalizedMask.mode]) {
      continue;
    }
    modesByKey[normalizedMask.mode] = normalizedMask;
  }

  const orderedCollaborationModes: Array<AppServer.v2.CollaborationModeMask> =
    [];
  for (const mode of orderedModes) {
    const match = modesByKey[mode];
    if (match) {
      orderedCollaborationModes.push(match);
    }
  }

  return orderedCollaborationModes;
}

export function useCollaborationModeMasks(): UseQueryResult<
  Array<AppServer.v2.CollaborationModeMask>,
  Error
> {
  const appServerManager = useDefaultAppServerManager();

  return useQuery({
    queryKey: ["collaboration-modes", "list"],
    staleTime: QUERY_STALE_TIME.INFINITE,
    queryFn: async (): Promise<Array<AppServer.v2.CollaborationModeMask>> => {
      const response = await appServerManager.listCollaborationModes();
      const orderedModes: Array<AppServer.CollaborationMode["mode"]> =
        ORDERED_COLLABORATION_MODE_WITHOUT_PRESET;
      return orderCollaborationModeMasks(response.data, orderedModes);
    },
  });
}
