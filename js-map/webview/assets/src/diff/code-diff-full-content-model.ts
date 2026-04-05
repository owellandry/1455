import type { FileDiffMetadata } from "@pierre/diffs";
import { family, type Scope } from "maitai";
import { createGitCwd, type GitCwd, type HostConfig } from "protocol";

import { getHostKey } from "@/git-rpc/host-config-utils";
import { AppScope } from "@/scopes/app-scope";
import { workerRpcClient } from "@/worker-rpc";

import { NULL_FILE } from "./diff-file-utils";
import {
  createFullMetadata,
  emptyCatFileResult,
} from "./full-content-metadata";
import type { CodexDiffFile } from "./parse-diff";

export const codeDiffFullContentByKey = family(
  AppScope,
  (key: string, { signal }) => ({
    fullDiffMetadata$: signal(null as FileDiffMetadata | null),
    isLoadingFullContent$: signal(false),
    key,
  }),
);

export async function requestCodeDiffFullContent(
  scope: Scope<typeof AppScope>,
  arg: {
    diff: CodexDiffFile;
    hostConfig: HostConfig;
    key: string;
    workspaceRoot: GitCwd | undefined;
  },
): Promise<void> {
  const fullContent = scope.get(codeDiffFullContentByKey, arg.key);
  if (
    fullContent.fullDiffMetadata$.get() != null ||
    fullContent.isLoadingFullContent$.get()
  ) {
    return;
  }

  fullContent.isLoadingFullContent$.set(true);
  try {
    const metadata = await loadFullDiffMetadata({
      diff: arg.diff,
      hostConfig: arg.hostConfig,
      workspaceRoot: arg.workspaceRoot,
    });
    if (metadata != null) {
      fullContent.fullDiffMetadata$.set(metadata);
    }
  } finally {
    fullContent.isLoadingFullContent$.set(false);
  }
}

export function getCodeDiffFullContentKey({
  diff,
  hostConfig,
  loadFullFilesEnabled,
  workspaceRoot,
}: {
  diff: CodexDiffFile;
  hostConfig: HostConfig;
  loadFullFilesEnabled: boolean;
  workspaceRoot: GitCwd | undefined;
}): string {
  const diffKey =
    diff.metadata.cacheKey ??
    `${diff.metadata.name}:${diff.metadata.prevObjectId ?? "none"}:${diff.metadata.newObjectId ?? "none"}:${diff.additions}:${diff.deletions}`;

  return `${diffKey}:${workspaceRoot ?? ""}:${getHostKey(hostConfig)}:${loadFullFilesEnabled ? "full" : "partial"}`;
}

async function loadFullDiffMetadata({
  diff,
  hostConfig,
  workspaceRoot,
}: {
  diff: CodexDiffFile;
  hostConfig: HostConfig;
  workspaceRoot: GitCwd | undefined;
}): Promise<FileDiffMetadata | null> {
  if (!workspaceRoot) {
    return null;
  }

  const gitCwd = createGitCwd(workspaceRoot);
  const prevPath = diff.metadata.prevName ?? diff.metadata.name;
  const nextPath = diff.metadata.name;
  const prevRequired = diff.metadata.type !== "new" && prevPath !== NULL_FILE;
  const nextRequired =
    diff.metadata.type !== "deleted" && nextPath !== NULL_FILE;

  const prevResultPromise = prevRequired
    ? workerRpcClient("git").request({
        method: "cat-file",
        params: {
          cwd: gitCwd,
          path: prevPath,
          oid: diff.metadata.prevObjectId ?? null,
          fallbackToDisk: false,
          hostConfig,
        },
      })
    : Promise.resolve(emptyCatFileResult());
  const nextResultPromise = nextRequired
    ? workerRpcClient("git").request({
        method: "cat-file",
        params: {
          cwd: gitCwd,
          path: nextPath,
          oid: diff.metadata.newObjectId ?? null,
          fallbackToDisk: true,
          hostConfig,
        },
      })
    : Promise.resolve(emptyCatFileResult());

  const [prevResult, nextResult] = await Promise.all([
    prevResultPromise,
    nextResultPromise,
  ]);
  if (prevResult.type === "error" || nextResult.type === "error") {
    return null;
  }

  return createFullMetadata(diff.metadata, prevResult.lines, nextResult.lines);
}
