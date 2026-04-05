import { useScope } from "maitai";
import type { ApplyPatchResult, CodeEnvironment } from "protocol";
import { useMemo, useState } from "react";
import { useIntl, type IntlShape } from "react-intl";

import { useWorkspaceEnvironments } from "@/codex-api";
import { toast$, type Toaster } from "@/components/toaster/toast-signal";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { AppScope } from "@/scopes/app-scope";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { useGitRoot } from "@/utils/git-root";
import { useMutationFromVSCode } from "@/vscode-api";

import { useHasAppliedTurnLocally } from "./use-has-applied-code-locally";

export type ApplyRemoteDiffResult = {
  open: boolean;
  result: ApplyPatchResult | null;
};

export type UseApplyRemoteDiffResult = {
  hasAppliedCodeLocally: boolean;
  canApply: boolean;
  isApplying: boolean;
  apply: () => void;
  revert: () => void;
  results: ApplyRemoteDiffResult;
  setResultsOpen: (open: boolean) => void;
  isNonWorkspaceEnvironment: boolean;
  taskEnvironmentLabel: string | null;
  gitRootPath: string | null;
  branchName: string | null;
};

/**
 * Shared logic for applying or reverting a remote diff locally.
 */
export function useApplyRemoteDiff({
  turnId,
  diff,
  taskEnvironment,
}: {
  turnId: string;
  diff: string;
  taskEnvironment: CodeEnvironment | null | undefined;
}): UseApplyRemoteDiffResult {
  const [hasAppliedCodeLocally, markAppliedLocally, clearAppliedLocally] =
    useHasAppliedTurnLocally(turnId);
  const cloneUrl =
    taskEnvironment?.repo_map?.[taskEnvironment?.repos[0]]?.clone_url;
  const gitRoot = useGitRoot(cloneUrl);
  const hostConfig = useHostConfig(DEFAULT_HOST_ID);
  const { data: currentBranch } = useGitCurrentBranch(gitRoot, hostConfig);
  const { data: workspaceEnvironments } = useWorkspaceEnvironments();
  const scope = useScope(AppScope);
  const intl = useIntl();
  const isNonWorkspaceEnvironment = useMemo<boolean>(() => {
    if (!taskEnvironment) {
      return false;
    }
    if (!workspaceEnvironments || workspaceEnvironments.length === 0) {
      return true;
    }
    return !workspaceEnvironments.some((environment) => {
      return environment.id === taskEnvironment.id;
    });
  }, [taskEnvironment, workspaceEnvironments]);

  const [results, setResults] = useState<ApplyRemoteDiffResult>({
    open: false,
    result: null,
  });

  const mutation = useMutationFromVSCode("apply-patch", {
    onSuccess(data, { revert = false }) {
      showToast(revert, data, intl, scope.get(toast$));
      if (revert && data.status === "success") {
        clearAppliedLocally();
      } else if (!revert && data.status === "success") {
        markAppliedLocally();
      }
      if (data.status !== "success") {
        setResults({ open: true, result: data });
      }
    },
    onError(_, { revert = false }) {
      showToast(revert, { status: "error" }, intl, scope.get(toast$));
    },
  });

  const attemptApplyOrRevert = (revert: boolean): void => {
    if (mutation.isPending) {
      return;
    }
    if (!gitRoot) {
      return;
    }
    mutation.mutate({
      diff,
      cwd: gitRoot,
      hostConfig,
      revert,
    });
  };

  return {
    hasAppliedCodeLocally,
    canApply: Boolean(gitRoot),
    isApplying: mutation.isPending,
    apply: (): void => {
      attemptApplyOrRevert(false);
    },
    revert: (): void => {
      attemptApplyOrRevert(true);
    },
    results,
    setResultsOpen: (open: boolean): void => {
      setResults((previous) => ({ ...previous, open }));
    },
    isNonWorkspaceEnvironment,
    taskEnvironmentLabel: taskEnvironment?.label ?? null,
    gitRootPath: gitRoot,
    branchName: currentBranch ?? null,
  };
}

function showToast(
  revert: boolean,
  result: Pick<ApplyPatchResult, "status" | "errorCode">,
  intl: IntlShape,
  toast: Toaster,
): void {
  if (result.status === "error" && result.errorCode === "not-git-repo") {
    toast.danger(
      intl.formatMessage(
        revert
          ? {
              id: "codex.diffView.revertPatchNotGitRepo",
              defaultMessage: "Revert requires a Git repository",
              description:
                "Toast shown when reverting patch outside a Git repository",
            }
          : {
              id: "codex.diffView.applyPatchNotGitRepo",
              defaultMessage: "Apply requires a Git repository",
              description:
                "Toast shown when applying patch outside a Git repository",
            },
      ),
      {
        id: "patch",
      },
    );
    return;
  }

  const { status } = result;
  switch (status) {
    case "success":
      toast.success(
        intl.formatMessage(
          revert
            ? {
                id: "codex.diffView.revertPatchSuccess",
                defaultMessage: "Changes reverted",
                description: "Toast shown when reverting patch succeeds",
              }
            : {
                id: "codex.diffView.applyPatchSuccess",
                defaultMessage: "Changes applied",
                description: "Toast shown when applying patch succeeds",
              },
        ),
        {
          id: "patch",
        },
      );
      break;
    case "partial-success":
      toast.warning(
        intl.formatMessage(
          revert
            ? {
                id: "codex.diffView.revertPatchPartialSuccess",
                defaultMessage: "Changes partially reverted",
                description:
                  "Toast shown when reverting patch partially succeeds",
              }
            : {
                id: "codex.diffView.applyPatchPartialSuccess",
                defaultMessage: "Changes partially applied",
                description:
                  "Toast shown when applying patch partially succeeds",
              },
        ),
        {
          id: "patch",
        },
      );
      break;
    case "error":
      toast.danger(
        intl.formatMessage(
          revert
            ? {
                id: "codex.diffView.revertPatchError",
                defaultMessage: "Failed to revert changes",
                description: "Toast shown when reverting patch fails",
              }
            : {
                id: "codex.diffView.applyPatchError",
                defaultMessage: "Failed to apply changes",
                description: "Toast shown when applying patch fails",
              },
        ),
        {
          id: "patch",
        },
      );
      break;
  }
}
