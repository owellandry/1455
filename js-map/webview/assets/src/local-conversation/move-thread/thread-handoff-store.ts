import { produce } from "immer";
import { atom, useAtom, useAtomValue } from "jotai";
import type {
  CommandExecutionOutput,
  ConversationId,
  GitCwd,
  GitRoot,
} from "protocol";
import { v4 as uuidv4 } from "uuid";

export type ThreadHandoffStatus =
  | "queued"
  | "running"
  | "success"
  | "warning"
  | "error";

export type ThreadHandoffStepId =
  | "create-new-worktree"
  | "reuse-existing-worktree"
  | "switching-thread"
  | "stash-source-changes"
  | "checkout-local-branch"
  | "stash-target-worktree-changes"
  | "checkout-worktree-branch"
  | "detach-worktree-branch"
  | "apply-changes-to-worktree"
  | "apply-changes-to-local";

export type ThreadHandoffStep = {
  id: ThreadHandoffStepId;
  status: "pending" | "running" | "done" | "failed";
};

type ThreadHandoffOperationBase = {
  id: string;
  stepIds: Array<ThreadHandoffStepId>;
  steps: Array<ThreadHandoffStep>;
  status: ThreadHandoffStatus;
  sourceConversationId: ConversationId;
  targetConversationId: ConversationId | null;
  sourceBranch: string;
  localBranch: string | null;
  worktreeBranch: string | null;
  errorMessage: string | null;
  warningMessage: string | null;
  execOutput: CommandExecutionOutput | null;
  hasUnseenTerminalState: boolean;
};

type ThreadHandoffToWorktreeRequest = {
  cwd: GitCwd;
  defaultBranch: string | null;
  existingWorktreeGitRoot: GitRoot | null;
  existingWorktreeWorkspaceRoot: GitCwd | null;
  targetHasUncommittedChanges: boolean;
};

type ThreadHandoffToLocalRequest = {
  cwd: GitCwd;
  localGitRoot: GitRoot;
  localWorkspaceRoot: GitCwd;
  worktreeRoot: GitRoot;
};

export type ThreadHandoffOperation =
  | (ThreadHandoffOperationBase & {
      direction: "to-worktree";
      request: ThreadHandoffToWorktreeRequest;
    })
  | (ThreadHandoffOperationBase & {
      direction: "to-local";
      request: ThreadHandoffToLocalRequest;
    });

type ThreadHandoffState = {
  activeOperationId: string | null;
  operations: Array<ThreadHandoffOperation>;
};

type AddToWorktreeOperationSeed = {
  sourceConversationId: ConversationId;
  sourceBranch: string;
  localBranch: string | null;
  worktreeBranch: string;
  request: ThreadHandoffToWorktreeRequest;
  stepIds: Array<ThreadHandoffStepId>;
};

type AddToLocalOperationSeed = {
  sourceConversationId: ConversationId;
  sourceBranch: string;
  localBranch: string | null;
  request: ThreadHandoffToLocalRequest;
  stepIds: Array<ThreadHandoffStepId>;
};

const threadHandoffStateAtom = atom<ThreadHandoffState>({
  activeOperationId: null,
  operations: [],
});

export function resetThreadHandoffOperationForRetry(
  operation: ThreadHandoffOperation,
): ThreadHandoffOperation {
  return {
    ...operation,
    status: "queued",
    targetConversationId: null,
    steps: createPendingSteps(operation.stepIds),
    errorMessage: null,
    warningMessage: null,
    execOutput: null,
    hasUnseenTerminalState: false,
  };
}

export function useThreadHandoffState(): ThreadHandoffState {
  return useAtomValue(threadHandoffStateAtom);
}

export function useThreadHandoffOperation(
  operationId: string | null | undefined,
): ThreadHandoffOperation | null {
  const { operations } = useThreadHandoffState();
  if (operationId == null) {
    return null;
  }
  return operations.find((operation) => operation.id === operationId) ?? null;
}

export function useThreadHandoffForConversation(
  conversationId: ConversationId | null | undefined,
): ThreadHandoffOperation | null {
  const { operations } = useThreadHandoffState();
  if (conversationId == null) {
    return null;
  }
  for (let index = operations.length - 1; index >= 0; index -= 1) {
    const operation = operations[index];
    if (
      operation.sourceConversationId === conversationId ||
      operation.targetConversationId === conversationId
    ) {
      return operation;
    }
  }
  return null;
}

export function useThreadHandoffActions(): {
  addToWorktreeOperation: (
    seed: AddToWorktreeOperationSeed,
  ) => ThreadHandoffOperation;
  addToLocalOperation: (
    seed: AddToLocalOperationSeed,
  ) => ThreadHandoffOperation;
  updateOperation: (
    id: string,
    update: (draft: ThreadHandoffOperation) => void,
  ) => void;
  removeOperation: (id: string) => void;
  openOperation: (id: string) => void;
  closeActiveOperation: () => void;
} {
  const [, setState] = useAtom(threadHandoffStateAtom);

  const addToWorktreeOperation = (
    seed: AddToWorktreeOperationSeed,
  ): ThreadHandoffOperation => {
    const next: ThreadHandoffOperation = {
      id: uuidv4(),
      direction: "to-worktree",
      status: "queued",
      sourceConversationId: seed.sourceConversationId,
      targetConversationId: null,
      sourceBranch: seed.sourceBranch,
      localBranch: seed.localBranch,
      worktreeBranch: seed.worktreeBranch,
      stepIds: seed.stepIds,
      steps: createPendingSteps(seed.stepIds),
      request: seed.request,
      errorMessage: null,
      warningMessage: null,
      execOutput: null,
      hasUnseenTerminalState: false,
    };
    setState((prev) => ({
      activeOperationId: null,
      operations: [...prev.operations, next],
    }));
    return next;
  };

  const addToLocalOperation = (
    seed: AddToLocalOperationSeed,
  ): ThreadHandoffOperation => {
    const next: ThreadHandoffOperation = {
      id: uuidv4(),
      direction: "to-local",
      status: "queued",
      sourceConversationId: seed.sourceConversationId,
      targetConversationId: null,
      sourceBranch: seed.sourceBranch,
      localBranch: seed.localBranch,
      worktreeBranch: null,
      stepIds: seed.stepIds,
      steps: createPendingSteps(seed.stepIds),
      request: seed.request,
      errorMessage: null,
      warningMessage: null,
      execOutput: null,
      hasUnseenTerminalState: false,
    };
    setState((prev) => ({
      activeOperationId: null,
      operations: [...prev.operations, next],
    }));
    return next;
  };

  const updateOperation = (
    id: string,
    update: (draft: ThreadHandoffOperation) => void,
  ): void => {
    setState((prev) => ({
      ...prev,
      operations: prev.operations.map((operation) => {
        if (operation.id !== id) {
          return operation;
        }
        return produce(operation, update);
      }),
    }));
  };

  const removeOperation = (id: string): void => {
    setState((prev) => ({
      activeOperationId:
        prev.activeOperationId === id ? null : prev.activeOperationId,
      operations: prev.operations.filter((operation) => operation.id !== id),
    }));
  };

  const openOperation = (id: string): void => {
    setState((prev) => ({
      activeOperationId: id,
      operations: prev.operations.map((operation) => {
        if (operation.id !== id) {
          return operation;
        }
        return {
          ...operation,
          hasUnseenTerminalState: false,
        };
      }),
    }));
  };

  const closeActiveOperation = (): void => {
    setState((prev) => ({
      ...prev,
      activeOperationId: null,
    }));
  };

  return {
    addToWorktreeOperation,
    addToLocalOperation,
    updateOperation,
    removeOperation,
    openOperation,
    closeActiveOperation,
  };
}

function createPendingSteps(
  stepIds: Array<ThreadHandoffStepId>,
): Array<ThreadHandoffStep> {
  return stepIds.map((id) => ({
    id,
    status: "pending",
  }));
}
