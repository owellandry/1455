import type { GitCwd } from "protocol";

import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { useFetchFromVSCode } from "@/vscode-api";

export function useGitOrigin(
  cwd: GitCwd | null | undefined,
  hostId: string = DEFAULT_HOST_ID,
): string | null {
  const { data: gitOrigins } = useFetchFromVSCode("git-origins", {
    params: { dirs: cwd ? [cwd] : [], hostId },
    queryConfig: {
      enabled: cwd != null,
    },
  });

  if (!cwd) {
    return null;
  }

  return (
    gitOrigins?.origins.find((origin) => origin.dir === cwd)?.originUrl ??
    gitOrigins?.origins[0]?.originUrl ??
    null
  );
}
