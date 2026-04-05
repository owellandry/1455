import { useQueryClient } from "@tanstack/react-query";
import type { GitCwd, OpenInTarget, VSCodeFetchRequest } from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

type OpenInTargetsResponse = VSCodeFetchRequest["open-in-targets"]["response"];

/**
 * Provides open target metadata and a mutation that keeps the cache in sync.
 */
export function useTargetApps({
  cwd,
  openPath,
}: {
  cwd: GitCwd | null;
  openPath?: string | null;
}): {
  preferredTarget: OpenInTarget | null;
  targets: Array<OpenInTargetsResponse["targets"][number]>;
  availableTargets: Array<OpenInTarget>;
  open: (
    target: OpenInTarget,
    options: { persistPreferred: boolean; line?: number; column?: number },
  ) => void;
} {
  const queryClient = useQueryClient();
  const { data } = useFetchFromVSCode("open-in-targets", {
    params: { cwd },
    queryConfig: {
      enabled: Boolean(cwd ?? openPath),
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    },
  });
  const openFile = useMutationFromVSCode("open-file");

  const open = (
    target: OpenInTarget,
    {
      persistPreferred,
      line,
      column,
    }: { persistPreferred: boolean; line?: number; column?: number },
  ): void => {
    const preferenceKey = cwd;
    const pathToOpen = openPath ?? cwd;
    if (!pathToOpen) {
      return;
    }
    if (persistPreferred && preferenceKey) {
      queryClient.setQueryData<OpenInTargetsResponse | undefined>(
        getQueryKey("open-in-targets", { cwd: preferenceKey }),
        (prev) =>
          prev
            ? {
                ...prev,
                preferredTarget: target,
                targets: prev.targets.map((candidate) => ({
                  ...candidate,
                  default: candidate.id === target ? true : undefined,
                })),
              }
            : prev,
      );
    }
    openFile.mutate({
      path: pathToOpen,
      cwd: cwd ?? null,
      target,
      line,
      column,
      persistPreferredTargetPath:
        persistPreferred && preferenceKey ? preferenceKey : undefined,
    });
  };

  return {
    preferredTarget: data?.preferredTarget ?? null,
    targets: data?.targets ?? [],
    availableTargets: data?.availableTargets ?? [],
    open,
  };
}
