import type {
  PendingWorktree,
  PendingWorktreeMetadataUpdate,
  PendingWorktreeCreate,
} from "protocol";
import { v4 as uuidv4 } from "uuid";

import { messageBus } from "@/message-bus";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";

import { usePendingWorktreeConversationStartActions } from "./pending-worktree-conversation-starts";

export type { PendingWorktree } from "protocol";
export type PendingWorktreeCreateParams =
  | Omit<
      Extract<PendingWorktreeCreate, { launchMode: "start-conversation" }>,
      "id"
    >
  | Omit<
      Extract<PendingWorktreeCreate, { launchMode: "fork-conversation" }>,
      "id"
    >
  | Omit<
      Extract<PendingWorktreeCreate, { launchMode: "create-stable-worktree" }>,
      "id"
    >;

export function buildPendingWorktreeId(hostId: string): string {
  const uuid = uuidv4();
  return `${hostId}:${uuid}`;
}

export function getHostIdFromPendingWorktreeId(id: string): string {
  const separatorIndex = id.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex === id.length - 1) {
    return DEFAULT_HOST_ID;
  }
  return id.slice(0, separatorIndex);
}

export function usePendingWorktrees(): Array<PendingWorktree> {
  const [pendingWorktrees] = useSharedObject("pending_worktrees");
  return pendingWorktrees ?? [];
}

export function usePendingWorktree(
  id: string | null | undefined,
): PendingWorktree | null | undefined {
  const [worktrees] = useSharedObject("pending_worktrees");
  if (!id) {
    return null;
  }
  if (worktrees === undefined) {
    return undefined;
  }
  return worktrees.find((entry) => entry.id === id) ?? null;
}

export function usePendingWorktreeActions(): {
  createPendingWorktree: (request: PendingWorktreeCreateParams) => string;
  renamePendingWorktree: (id: string, label: string) => void;
  setPendingWorktreePinned: (id: string, isPinned: boolean) => void;
  clearPendingWorktreeAttention: (id: string) => void;
  retryPendingWorktree: (id: string) => void;
  cancelPendingWorktree: (id: string) => void;
  dismissPendingWorktree: (id: string) => void;
} {
  const [, setPendingWorktrees] = useSharedObject("pending_worktrees");
  const {
    addPendingWorktreeConversationStart,
    removePendingWorktreeConversationStart,
    retryPendingWorktreeConversationStart,
  } = usePendingWorktreeConversationStartActions();

  const createPendingWorktreeAction = (
    request: PendingWorktreeCreateParams,
  ): string => {
    const id = buildPendingWorktreeId(request.hostId);
    const entry = buildPendingWorktree(id, request);
    if (entry.launchMode !== "create-stable-worktree") {
      addPendingWorktreeConversationStart(id);
    }
    if (window.electronBridge == null) {
      setPendingWorktrees((prev = []) => [...prev, entry]);
      return id;
    }
    messageBus.dispatchMessage("pending-worktree-create", {
      hostId: request.hostId,
      request: buildPendingWorktreeCreate(id, request),
    });
    return id;
  };

  const applyPendingWorktreeMetadataUpdates = (
    id: string,
    updates: Array<PendingWorktreeMetadataUpdate>,
  ): void => {
    if (updates.length === 0) {
      return;
    }
    if (window.electronBridge == null) {
      setPendingWorktrees((prev = []) =>
        prev.map((entry) =>
          entry.id === id ? applyMetadataUpdates(entry, updates) : entry,
        ),
      );
      return;
    }
    updates.forEach((update) => {
      messageBus.dispatchMessage("pending-worktree-update-metadata", {
        hostId: getHostIdFromPendingWorktreeId(id),
        id,
        update,
      });
    });
  };

  const renamePendingWorktree = (id: string, label: string): void => {
    applyPendingWorktreeMetadataUpdates(id, [
      { type: "label", label },
      { type: "labelEdited", labelEdited: true },
    ]);
  };

  const setPendingWorktreePinned = (id: string, isPinned: boolean): void => {
    applyPendingWorktreeMetadataUpdates(id, [{ type: "isPinned", isPinned }]);
  };

  const clearPendingWorktreeAttention = (id: string): void => {
    applyPendingWorktreeMetadataUpdates(id, [
      { type: "needsAttention", needsAttention: false },
    ]);
  };

  const retryPendingWorktree = (id: string): void => {
    retryPendingWorktreeConversationStart(id);
    if (window.electronBridge == null) {
      setPendingWorktrees((prev = []) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                phase: "queued",
                outputText: "",
                errorMessage: null,
                worktreeWorkspaceRoot: null,
                worktreeGitRoot: null,
                needsAttention: false,
              }
            : entry,
        ),
      );
      return;
    }
    messageBus.dispatchMessage("pending-worktree-retry", {
      hostId: getHostIdFromPendingWorktreeId(id),
      id,
    });
  };

  const cancelPendingWorktree = (id: string): void => {
    removePendingWorktreeConversationStart(id);
    if (window.electronBridge == null) {
      setPendingWorktrees((prev = []) =>
        prev.filter((entry) => entry.id !== id),
      );
      return;
    }
    messageBus.dispatchMessage("pending-worktree-cancel", {
      hostId: getHostIdFromPendingWorktreeId(id),
      id,
    });
  };

  const dismissPendingWorktree = (id: string): void => {
    removePendingWorktreeConversationStart(id);
    if (window.electronBridge == null) {
      setPendingWorktrees((prev = []) =>
        prev.filter((entry) => entry.id !== id),
      );
      return;
    }
    messageBus.dispatchMessage("pending-worktree-dismiss", {
      hostId: getHostIdFromPendingWorktreeId(id),
      id,
    });
  };

  return {
    createPendingWorktree: createPendingWorktreeAction,
    renamePendingWorktree,
    setPendingWorktreePinned,
    clearPendingWorktreeAttention,
    retryPendingWorktree,
    cancelPendingWorktree,
    dismissPendingWorktree,
  };
}

function buildPendingWorktree(
  id: string,
  request: PendingWorktreeCreateParams,
): PendingWorktree {
  const base = {
    id,
    hostId: request.hostId,
    createdAt: Date.now(),
    phase: "queued" as const,
    labelEdited: false,
    outputText: "",
    errorMessage: null,
    worktreeWorkspaceRoot: null,
    worktreeGitRoot: null,
    needsAttention: false,
    isPinned: false,
    label: request.label,
    sourceWorkspaceRoot: request.sourceWorkspaceRoot,
    startingState: request.startingState,
    localEnvironmentConfigPath: request.localEnvironmentConfigPath,
    prompt: request.prompt,
  };

  switch (request.launchMode) {
    case "create-stable-worktree":
      return {
        ...base,
        launchMode: "create-stable-worktree",
        startConversationParamsInput: null,
        sourceConversationId: null,
        sourceCollaborationMode: null,
      };
    case "fork-conversation":
      return {
        ...base,
        launchMode: "fork-conversation",
        startConversationParamsInput: null,
        sourceConversationId: request.sourceConversationId,
        sourceCollaborationMode: request.sourceCollaborationMode,
      };
    case "start-conversation":
      return {
        ...base,
        launchMode: "start-conversation",
        startConversationParamsInput: request.startConversationParamsInput,
        sourceConversationId: null,
        sourceCollaborationMode: null,
      };
  }
}

function buildPendingWorktreeCreate(
  id: string,
  request: PendingWorktreeCreateParams,
): PendingWorktreeCreate {
  return {
    id,
    ...request,
  };
}

function applyMetadataUpdates(
  entry: PendingWorktree,
  updates: Array<PendingWorktreeMetadataUpdate>,
): PendingWorktree {
  return updates.reduce((current, update) => {
    switch (update.type) {
      case "isPinned":
        return { ...current, isPinned: update.isPinned };
      case "label":
        return { ...current, label: update.label };
      case "labelEdited":
        return { ...current, labelEdited: update.labelEdited };
      case "needsAttention":
        return { ...current, needsAttention: update.needsAttention };
    }
  }, entry);
}
