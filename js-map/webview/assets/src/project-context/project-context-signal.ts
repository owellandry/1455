import { derived, querySignal } from "maitai";

import {
  gitStableMetadataQueryOptions,
  type GitStableMetadata,
} from "@/git-rpc/use-git-stable-metadata";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { buildProjectContext } from "./project-context";

export const projectGitMetadataQuery$ = querySignal(
  ThreadRouteScope,
  ({ scope }): ReturnType<typeof gitStableMetadataQueryOptions> => {
    const { cwd, hostConfig, hostKey } = scope;

    return gitStableMetadataQueryOptions(cwd, true, hostKey, hostConfig);
  },
);

export const projectContext$ = derived(ThreadRouteScope, ({ get, scope }) => {
  const gitMetadata = get(projectGitMetadataQuery$).data ?? null;

  return buildProjectContext({
    codexHome: scope.codexHome,
    cwd: scope.cwd,
    gitMetadata: gitMetadata as GitStableMetadata | null,
  });
});
