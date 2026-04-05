import { atom, useAtom, useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import type {
  AsyncThreadStartingState,
  CommentInputItem,
  FileDescriptor,
  GhPullRequestCheck,
  ImageAssetPointer,
} from "protocol";
import { useCallback, useMemo } from "react";

import { persistedAtom } from "@/utils/persisted-atom";
import { getPersistedAtomStorage } from "@/utils/persisted-atom-store";
import { aEnvironmentAtom } from "@/utils/use-environment";

import type { CloudFollowUpStartingState, ComposerMode } from "./composer";
import type { FollowUpProps } from "./composer-follow-up";

export type ComposerImageAttachment = {
  id: string;
  src: string;
  localPath?: string;
  filename?: string;
  uploadStatus?: "idle" | "uploading" | "ready" | "error";
  pointer?: ImageAssetPointer;
};

type ComposerViewStateId = string;

export type ReviewTarget = "base-branch" | "unstaged";

export type ReviewModeState =
  | { status: "choose-target" }
  | { status: "choose-base" };

export type ComposerViewState = {
  prompt: string;
  composerMode: ComposerMode;
  isAutoContextOn: boolean;
  imageAttachments: Array<ComposerImageAttachment>;
  fileAttachments: Array<FileDescriptor>;
  addedFiles: Array<FileDescriptor>;
  commentAttachments: Array<CommentInputItem>;
  pullRequestChecks: Array<GhPullRequestCheck>;
  asyncThreadStartingState: AsyncThreadStartingState;
  followUpCloudStartingState: CloudFollowUpStartingState;
  defaultBranchSnapshot: string | null;
};

export type PersistedContinueInMode = ComposerMode | "remote";

export const aLastUsedContinueInMode = persistedAtom<PersistedContinueInMode>(
  "last-used-continue-in-mode",
  "local",
);

function getComposerModeFromPersistedMode(
  mode: PersistedContinueInMode,
): ComposerMode {
  return mode === "remote" ? "local" : mode;
}

// Create a derived atom that depends on the default
// composer auto context state.
export const aDefaultComposerViewState = atom(
  (get) => (): ComposerViewState => {
    // Doing this instead of get(aDefaultComposerAutoContext) is a workaround for CXA-1564
    const persistentStorage = getPersistedAtomStorage<boolean>();
    const isAutoContextOn = persistentStorage.getItem(
      "composer-auto-context-enabled",
      true,
    );
    const env = get(aEnvironmentAtom);
    const composerMode = getComposerModeFromPersistedMode(
      get(aLastUsedContinueInMode),
    );
    const repo = env ? (env.repo_map ?? {})[env.repos[0]] : null;
    const defaultBranch = repo?.default_branch ?? "main";

    return {
      prompt: "",
      composerMode,
      isAutoContextOn,
      imageAttachments: [],
      fileAttachments: [],
      addedFiles: [],
      commentAttachments: [],
      pullRequestChecks: [],
      asyncThreadStartingState: {
        type: defaultBranch ? "branch" : "working-tree",
        branchName: defaultBranch ?? "main",
      },
      followUpCloudStartingState: "direct-follow-up",
      defaultBranchSnapshot: defaultBranch,
    };
  },
);

const aComposerViewStates = atom<
  Record<ComposerViewStateId, ComposerViewState>
>({});

function getDefaultComposerViewStateForContext({
  createDefaultComposerViewState,
  followUpType,
  hasAppliedCodeLocally,
  localFollowUpDefaultComposerMode,
}: {
  createDefaultComposerViewState: () => ComposerViewState;
  followUpType: FollowUpProps["type"] | undefined;
  hasAppliedCodeLocally: boolean | undefined;
  localFollowUpDefaultComposerMode: ComposerMode | undefined;
}): ComposerViewState {
  const base = createDefaultComposerViewState();
  if (followUpType != null && base.composerMode === "worktree") {
    return {
      ...base,
      composerMode: "local",
    };
  }
  if (followUpType === "cloud" && !hasAppliedCodeLocally) {
    return {
      ...base,
      composerMode: "cloud",
    };
  }
  if (followUpType === "local" && localFollowUpDefaultComposerMode != null) {
    return {
      ...base,
      composerMode: localFollowUpDefaultComposerMode,
    };
  }
  return base;
}

export const useComposerViewState = (
  followUp?: FollowUpProps,
  workspaceRoot?: string | null,
  localFollowUpDefaultComposerMode?: ComposerMode,
): [
  ComposerViewState,
  (updater: (prev: ComposerViewState) => ComposerViewState) => void,
] => {
  const id = getComposerStateId(followUp, workspaceRoot);
  const followUpType = followUp?.type;
  const hasAppliedCodeLocally =
    followUp?.type === "cloud" ? followUp.hasAppliedCodeLocally : undefined;
  const createDefaultComposerViewState = useAtomValue(
    aDefaultComposerViewState,
  );
  const [stateMap, setStateMap] = useAtom(aComposerViewStates);
  const getDefaultComposerViewState = useCallback((): ComposerViewState => {
    return getDefaultComposerViewStateForContext({
      createDefaultComposerViewState,
      followUpType,
      hasAppliedCodeLocally,
      localFollowUpDefaultComposerMode,
    });
  }, [
    createDefaultComposerViewState,
    followUpType,
    hasAppliedCodeLocally,
    localFollowUpDefaultComposerMode,
  ]);
  const mergeWithDefaults = useCallback(
    (state: ComposerViewState): ComposerViewState => ({
      ...getDefaultComposerViewState(),
      ...state,
    }),
    [getDefaultComposerViewState],
  );
  const setComposerViewState = useCallback(
    (updater: (prev: ComposerViewState) => ComposerViewState) => {
      setStateMap((prev) => {
        const current = prev[id]
          ? mergeWithDefaults(prev[id])
          : getDefaultComposerViewState();
        const next = updater(current);
        if (next === current && prev[id] != null) {
          return prev;
        }
        return {
          ...prev,
          [id]: next,
        };
      });
    },
    [id, setStateMap, getDefaultComposerViewState, mergeWithDefaults],
  );

  const composerViewState = stateMap[id]
    ? mergeWithDefaults(stateMap[id])
    : getDefaultComposerViewState();

  return [composerViewState, setComposerViewState];
};

export function useComposerModeViewState(
  followUp?: FollowUpProps,
  workspaceRoot?: string | null,
  localFollowUpDefaultComposerMode?: ComposerMode,
): ComposerMode {
  const id = getComposerStateId(followUp, workspaceRoot);
  const followUpType = followUp?.type;
  const hasAppliedCodeLocally =
    followUp?.type === "cloud" ? followUp.hasAppliedCodeLocally : undefined;
  const createDefaultComposerViewState = useAtomValue(
    aDefaultComposerViewState,
  );
  const getDefaultComposerViewState = useCallback(
    (): ComposerViewState =>
      getDefaultComposerViewStateForContext({
        createDefaultComposerViewState,
        followUpType,
        hasAppliedCodeLocally,
        localFollowUpDefaultComposerMode,
      }),
    [
      createDefaultComposerViewState,
      followUpType,
      hasAppliedCodeLocally,
      localFollowUpDefaultComposerMode,
    ],
  );
  const composerModeAtom = useMemo(
    () =>
      selectAtom(aComposerViewStates, (stateMap) => {
        const state = stateMap[id];
        if (state == null) {
          return getDefaultComposerViewState().composerMode;
        }
        return {
          ...getDefaultComposerViewState(),
          ...state,
        }.composerMode;
      }),
    [id, getDefaultComposerViewState],
  );

  return useAtomValue(composerModeAtom);
}

export function useMigrateComposerViewState(): (
  fromId: ComposerViewStateId,
  toId: ComposerViewStateId,
) => void {
  const [, setStateMap] = useAtom(aComposerViewStates);
  return useCallback(
    (fromId, toId) => {
      if (fromId === toId) {
        return;
      }
      setStateMap((prev) => {
        if (prev[fromId] == null) {
          return prev;
        }
        if (prev[toId] != null) {
          return prev;
        }
        return {
          ...prev,
          [toId]: prev[fromId],
        };
      });
    },
    [setStateMap],
  );
}

/** Create a unique ID for composer based on follow-up props */
export function getComposerStateId(
  followUp?: FollowUpProps,
  workspaceRoot?: string | null,
): ComposerViewStateId {
  if (!followUp) {
    if (workspaceRoot) {
      return `new-conversation:${workspaceRoot}`;
    }
    return "new-conversation";
  }
  if (followUp.type === "local") {
    return `local:${followUp.localConversationId}`;
  }
  return `cloud:${followUp.taskDetails.task.id}`;
}
