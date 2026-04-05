import { useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import {
  maybeErrorToString,
  type ConversationId,
  type WorkerEvent,
} from "protocol";
import { useEffect, useEffectEvent, useRef } from "react";
import { useIntl } from "react-intl";
import { matchPath, useLocation } from "react-router";

import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import {
  getComposerStateId,
  useMigrateComposerViewState,
} from "@/composer/composer-view-state";
import { AppScope } from "@/scopes/app-scope";
import { getHostConfigForHostId } from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { logger } from "@/utils/logger";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";
import { workerRpcClient } from "@/worker-rpc";

import {
  useThreadHandoffActions,
  useThreadHandoffState,
  type ThreadHandoffOperation,
  type ThreadHandoffStep,
  type ThreadHandoffStepId,
  type ThreadHandoffStatus,
} from "./thread-handoff-store";
import { moveToLocal } from "./use-move-to-local-mutation";
import { moveToWorktree } from "./use-move-to-worktree-mutation";

const THREAD_HANDOFF_STEP_ORDER: Array<ThreadHandoffStepId> = [
  "create-new-worktree",
  "reuse-existing-worktree",
  "stash-source-changes",
  "detach-worktree-branch",
  "checkout-local-branch",
  "stash-target-worktree-changes",
  "checkout-worktree-branch",
  "apply-changes-to-worktree",
  "apply-changes-to-local",
  "switching-thread",
];

export function ThreadHandoffRunner(): null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const registry = useAppServerRegistry();
  const navigateToConversation = useNavigateToLocalConversation();
  const migrateComposerViewState = useMigrateComposerViewState();
  const [, setDiffComments] = useSharedObject("diff_comments");
  const [remoteConnections] = useSharedObject("remote_connections");
  const { pathname } = useLocation();
  const { activeOperationId, operations } = useThreadHandoffState();
  const { removeOperation, updateOperation } = useThreadHandoffActions();
  const startedOperationIdsRef = useRef(new Set<string>());
  const previousStatusesRef = useRef(new Map<string, ThreadHandoffStatus>());

  const handleProgressEvent = useEffectEvent(
    (event: WorkerEvent<"git", "thread-handoff-progress">) => {
      updateOperation(event.operationId, (draft) => {
        const step = upsertThreadHandoffStep(draft, event.step);
        switch (event.status) {
          case "skipped":
          case "completed": {
            step.status = "done";
            return;
          }
          case "started": {
            step.status = "running";
            return;
          }
          case "failed": {
            step.status = "failed";
            return;
          }
        }
      });
    },
  );

  const isSourceConversationVisibleNow = useEffectEvent(
    (operation: ThreadHandoffOperation) => {
      return isSourceConversationVisible({
        pathname,
        operation,
      });
    },
  );
  const transferComposerViewState = (
    sourceConversationId: ConversationId,
    targetConversationId: ConversationId,
  ): void => {
    migrateComposerViewState(
      getComposerStateId({
        type: "local",
        localConversationId: sourceConversationId,
      }),
      getComposerStateId({
        type: "local",
        localConversationId: targetConversationId,
      }),
    );
  };

  const startOperation = useEffectEvent(
    async (operation: ThreadHandoffOperation) => {
      try {
        switch (operation.direction) {
          case "to-worktree":
            {
              const appServerManager =
                registry.getMaybeForConversationId(
                  operation.sourceConversationId,
                ) ?? registry.getDefault();
              const hostConfig = getHostConfigForHostId(
                appServerManager.getHostId(),
                remoteConnections,
              );
              const result = await moveToWorktree({
                conversationId: operation.sourceConversationId,
                currentBranch: operation.sourceBranch,
                cwd: operation.request.cwd,
                worktreeCheckoutBranch:
                  operation.worktreeBranch ?? operation.sourceBranch,
                selectedLocalCheckoutBranch:
                  operation.localBranch != null &&
                  operation.localBranch !== operation.sourceBranch
                    ? operation.localBranch
                    : null,
                intl,
                appServerManager,
                defaultBranch: operation.request.defaultBranch,
                transferComposerViewState,
                setDiffComments,
                hostConfig,
                queryClient,
                operationId: operation.id,
                onStepStatus: (stepId, status) => {
                  updateOperation(operation.id, (draft) => {
                    const step = upsertThreadHandoffStep(draft, stepId);
                    step.status = status;
                  });
                },
                onTargetConversationId: (conversationId) => {
                  updateOperation(operation.id, (draft) => {
                    draft.targetConversationId = conversationId;
                  });
                },
              });
              if (result.status === "error") {
                updateOperation(operation.id, (draft) => {
                  draft.status = "error";
                  draft.errorMessage = result.message;
                  draft.execOutput = result.execOutput ?? null;
                });
                return;
              }
              if (result.conversationId === operation.sourceConversationId) {
                updateOperation(operation.id, (draft) => {
                  draft.status = "warning";
                  draft.warningMessage = intl.formatMessage({
                    id: "localConversation.moveToWorktree.warning.threadSwitchFailed",
                    defaultMessage:
                      "Moved git state to the worktree, but couldn’t switch this thread to the new worktree.",
                    description:
                      "Warning shown when move to worktree finishes the git handoff but cannot switch the conversation",
                  });
                });
                return;
              }
              updateOperation(operation.id, (draft) => {
                draft.status = "success";
              });
              if (isSourceConversationVisibleNow(operation)) {
                navigateToConversation(result.conversationId);
              }
            }
            return;
          case "to-local":
            {
              const appServerManager =
                registry.getMaybeForConversationId(
                  operation.sourceConversationId,
                ) ?? registry.getDefault();
              const hostConfig = getHostConfigForHostId(
                appServerManager.getHostId(),
                remoteConnections,
              );
              const result = await moveToLocal({
                conversationId: operation.sourceConversationId,
                currentBranch: operation.sourceBranch,
                cwd: operation.request.cwd,
                localGitRoot: operation.request.localGitRoot,
                localWorkspaceRoot: operation.request.localWorkspaceRoot,
                worktreeRoot: operation.request.worktreeRoot,
                branchCheckedOutElsewhere: false,
                intl,
                appServerManager,
                transferComposerViewState,
                setDiffComments,
                hostConfig,
                operationId: operation.id,
                onSwitchingThreadStart: () => {
                  updateOperation(operation.id, (draft) => {
                    const step = upsertThreadHandoffStep(
                      draft,
                      "switching-thread",
                    );
                    step.status = "running";
                  });
                },
                onSwitchingThreadDone: () => {
                  updateOperation(operation.id, (draft) => {
                    const step = upsertThreadHandoffStep(
                      draft,
                      "switching-thread",
                    );
                    step.status = "done";
                  });
                },
                onSwitchingThreadFailed: () => {
                  updateOperation(operation.id, (draft) => {
                    const step = upsertThreadHandoffStep(
                      draft,
                      "switching-thread",
                    );
                    step.status = "failed";
                  });
                },
                onTargetConversationId: (conversationId) => {
                  updateOperation(operation.id, (draft) => {
                    draft.targetConversationId = conversationId;
                  });
                },
              });
              if (result.status === "error") {
                updateOperation(operation.id, (draft) => {
                  draft.status = "error";
                  draft.errorMessage = result.message;
                  draft.execOutput = result.execOutput ?? null;
                });
                return;
              }
              if (result.conversationId === operation.sourceConversationId) {
                updateOperation(operation.id, (draft) => {
                  draft.status = "warning";
                  draft.warningMessage = intl.formatMessage({
                    id: "localConversation.moveToLocal.warning.threadSwitchFailed",
                    defaultMessage:
                      "Moved git state back to local, but couldn’t switch this thread to the local workspace.",
                    description:
                      "Warning shown when move to local finishes the git handoff but cannot switch the conversation",
                  });
                });
                return;
              }
              updateOperation(operation.id, (draft) => {
                draft.status = "success";
              });
              if (isSourceConversationVisibleNow(operation)) {
                navigateToConversation(result.conversationId);
              }
            }
            return;
        }
      } catch (error) {
        logger.warning("Thread handoff failed unexpectedly: {}", {
          sensitive: { error: maybeErrorToString(error) },
          safe: { operationId: operation.id },
        });
        updateOperation(operation.id, (draft) => {
          draft.status = "error";
          draft.execOutput = null;
          draft.errorMessage = intl.formatMessage({
            id: "localConversation.threadHandoff.error.unexpected",
            defaultMessage: "Unexpected handoff failure. Please retry.",
            description:
              "Error shown when the thread handoff runtime throws unexpectedly",
          });
        });
      }
    },
  );

  useEffect(() => {
    return workerRpcClient("git").subscribe(
      "thread-handoff-progress",
      (event) => {
        handleProgressEvent(event);
      },
    );
  }, []);

  useEffect(() => {
    const operationsById = new Map(
      operations.map((operation) => [operation.id, operation]),
    );
    startedOperationIdsRef.current.forEach((operationId) => {
      const operation = operationsById.get(operationId);
      if (operation == null || isTerminalOperationStatus(operation.status)) {
        startedOperationIdsRef.current.delete(operationId);
      }
    });

    for (const operation of operations) {
      if (
        operation.status !== "queued" ||
        startedOperationIdsRef.current.has(operation.id)
      ) {
        continue;
      }
      startedOperationIdsRef.current.add(operation.id);
      void startOperation(operation);
    }
  }, [operations, updateOperation]);

  const handleTerminalStateTransitions = useEffectEvent(() => {
    const operationIds = new Set(operations.map((operation) => operation.id));
    previousStatusesRef.current.forEach((_status, operationId) => {
      if (!operationIds.has(operationId)) {
        previousStatusesRef.current.delete(operationId);
      }
    });

    for (const operation of operations) {
      const previousStatus = previousStatusesRef.current.get(operation.id);
      previousStatusesRef.current.set(operation.id, operation.status);
      if (operation.status === "success") {
        if (
          isOperationModalVisible({ pathname, activeOperationId, operation })
        ) {
          continue;
        }
        if (previousStatus !== "success") {
          scope
            .get(toast$)
            .success(getSuccessToastMessage({ operation, intl }));
        }
        removeOperation(operation.id);
        continue;
      }
      if (previousStatus === operation.status) {
        continue;
      }
      if (!isTerminalOperationStatus(operation.status)) {
        continue;
      }
      if (isOperationModalVisible({ pathname, activeOperationId, operation })) {
        continue;
      }
      updateOperation(operation.id, (draft) => {
        draft.hasUnseenTerminalState = true;
      });
      if (operation.status === "warning") {
        scope.get(toast$).warning(
          operation.warningMessage ??
            intl.formatMessage({
              id: "localConversation.threadHandoff.toast.warning",
              defaultMessage: "Thread handoff needs attention.",
              description:
                "Toast shown when the thread handoff finishes with a warning while the modal is closed",
            }),
        );
      } else {
        scope.get(toast$).danger(
          operation.errorMessage ??
            intl.formatMessage({
              id: "localConversation.threadHandoff.toast.error",
              defaultMessage: "Thread handoff failed.",
              description:
                "Toast shown when the thread handoff fails while the modal is closed",
            }),
        );
      }
    }
  });

  useEffect(() => {
    handleTerminalStateTransitions();
  }, [operations]);

  return null;
}

function upsertThreadHandoffStep(
  operation: ThreadHandoffOperation,
  stepId: ThreadHandoffStepId,
): ThreadHandoffStep {
  const existingStep = operation.steps.find((step) => step.id === stepId);
  if (existingStep != null) {
    return existingStep;
  }

  const nextStep: ThreadHandoffStep = {
    id: stepId,
    status: "pending",
  };
  const insertAt = operation.steps.findIndex((step) => {
    return compareThreadHandoffSteps(step.id, stepId) > 0;
  });
  if (insertAt === -1) {
    operation.steps.push(nextStep);
  } else {
    operation.steps.splice(insertAt, 0, nextStep);
  }

  if (!operation.stepIds.includes(stepId)) {
    const stepIdInsertAt = operation.stepIds.findIndex((currentStepId) => {
      return compareThreadHandoffSteps(currentStepId, stepId) > 0;
    });
    if (stepIdInsertAt === -1) {
      operation.stepIds.push(stepId);
    } else {
      operation.stepIds.splice(stepIdInsertAt, 0, stepId);
    }
  }

  return nextStep;
}

function compareThreadHandoffSteps(
  left: ThreadHandoffStepId,
  right: ThreadHandoffStepId,
): number {
  return (
    THREAD_HANDOFF_STEP_ORDER.indexOf(left) -
    THREAD_HANDOFF_STEP_ORDER.indexOf(right)
  );
}

function isOperationModalVisible({
  pathname,
  activeOperationId,
  operation,
}: {
  pathname: string;
  activeOperationId: string | null;
  operation: ThreadHandoffOperation;
}): boolean {
  const visibleConversationId = getVisibleConversationId(pathname);

  return (
    activeOperationId === operation.id &&
    visibleConversationId != null &&
    (visibleConversationId === operation.sourceConversationId ||
      visibleConversationId === operation.targetConversationId)
  );
}

function isSourceConversationVisible({
  pathname,
  operation,
}: {
  pathname: string;
  operation: ThreadHandoffOperation;
}): boolean {
  return getVisibleConversationId(pathname) === operation.sourceConversationId;
}

function getVisibleConversationId(pathname: string): string | null {
  return (
    matchPath("/local/:conversationId", pathname)?.params.conversationId ??
    matchPath("/thread-overlay/:conversationId", pathname)?.params
      .conversationId ??
    null
  );
}

function isTerminalOperationStatus(status: ThreadHandoffStatus): boolean {
  return status === "success" || status === "warning" || status === "error";
}

function getSuccessToastMessage({
  operation,
  intl,
}: {
  operation: ThreadHandoffOperation;
  intl: ReturnType<typeof useIntl>;
}): string {
  const branch =
    operation.direction === "to-worktree"
      ? (operation.worktreeBranch ?? operation.sourceBranch)
      : operation.sourceBranch;

  return intl.formatMessage(
    {
      id: "localConversation.threadHandoff.toast.success.branch",
      defaultMessage: "Branch {branch} handed off to {target}.",
      description:
        "Toast shown when the thread handoff completes while the modal is closed",
    },
    {
      branch,
      target:
        operation.direction === "to-worktree"
          ? intl.formatMessage({
              id: "localConversation.threadHandoff.toast.success.target.worktree",
              defaultMessage: "worktree",
              description:
                "Toast target noun used when the thread handoff completes to a worktree",
            })
          : intl.formatMessage({
              id: "localConversation.threadHandoff.toast.success.target.local",
              defaultMessage: "local",
              description:
                "Toast target noun used when the thread handoff completes to local",
            }),
    },
  );
}
