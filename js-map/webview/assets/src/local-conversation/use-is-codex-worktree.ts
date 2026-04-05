import { isCodexWorktree, type GitCwd } from "protocol";

import { useFetchFromVSCode } from "@/vscode-api";

export function useIsCodexWorktree(
  cwd: GitCwd | null,
  hostId?: string,
): boolean {
  const { data: codexHomeData } = useFetchFromVSCode("codex-home", {
    params: {
      hostId,
    },
  });
  const codexHome = codexHomeData?.codexHome;
  return cwd != null && isCodexWorktree(cwd, codexHome);
}
