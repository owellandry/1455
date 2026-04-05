import { family, querySignal, type Scope } from "maitai";
import type { GitCwd, OpenInTarget, VSCodeFetchRequest } from "protocol";

import { AppScope } from "@/scopes/app-scope";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { fetchFromVSCode, getQueryKey } from "@/vscode-api";

type OpenInTargetsResponse = VSCodeFetchRequest["open-in-targets"]["response"];

export const codeDiffOpenTargetsByCwd = family(
  AppScope,
  (cwd: GitCwd | null, { signal }) => {
    const query$ = querySignal(AppScope, () => ({
      queryFn: async (): Promise<OpenInTargetsResponse> =>
        fetchFromVSCode("open-in-targets", {
          params: { cwd },
        }),
      queryKey: getQueryKey("open-in-targets", { cwd }),
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    }));
    const preferredTargetOverride$ = signal(
      undefined as OpenInTarget | null | undefined,
    );

    return {
      preferredTargetOverride$,
      query$,
    };
  },
);

export async function openCodeDiffFile(
  _scope: Scope<typeof AppScope>,
  arg: {
    column?: number;
    cwd: GitCwd | null;
    line?: number;
    path: string;
    persistPreferredTargetPath?: GitCwd;
    target?: OpenInTarget;
  },
): Promise<void> {
  await fetchFromVSCode("open-file", {
    params: arg,
  });
}

export async function openCodeDiffInTarget(
  scope: Scope<typeof AppScope>,
  arg: {
    column?: number;
    cwd: GitCwd | null;
    line?: number;
    openPath: string | null;
    persistPreferred: boolean;
    target: OpenInTarget;
  },
): Promise<void> {
  const pathToOpen = arg.openPath ?? arg.cwd;
  if (!pathToOpen) {
    return;
  }

  if (arg.persistPreferred) {
    scope
      .get(codeDiffOpenTargetsByCwd, arg.cwd)
      .preferredTargetOverride$.set(arg.target);
  }

  await openCodeDiffFile(scope, {
    column: arg.column,
    cwd: arg.cwd,
    line: arg.line,
    path: pathToOpen,
    persistPreferredTargetPath:
      arg.persistPreferred && arg.cwd != null ? arg.cwd : undefined,
    target: arg.target,
  });
}
