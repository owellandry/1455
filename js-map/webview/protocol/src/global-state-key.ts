import type { RemoteSshConnection } from "./host-config";
import type { QueuedFollowUpState } from "./queued-follow-ups";
import type { RemoteProject } from "./remote-project";

export type GitPullRequestMergeMethod = "merge" | "squash";

export const GlobalStateKey = {
  // We have NUX_2025_09_15 as the general "the user saw the NUX" bit, but also
  // include finer-grained information so that if we have new, minor updates to
  // the NUX, we can ensure users only see the parts that are new to them.
  NUX_2025_09_15: "viewed2025-09-15-nux",
  NUX_2025_09_15_FULL_CHATGPT_AUTH_VIEWED:
    "viewed2025-09-15-full-chatgpt-auth-nux",
  // This version of the NUX does NOT show the gpt-5-codex option.
  NUX_2025_09_15_APIKEY_AUTH_VIEWED: "viewed2025-09-15-apikey-auth-nux",
  WINDOWS_WSL_REMINDER_DISMISSED_AT: "windows-wsl-reminder-dismissed-date",

  SHOW_COPILOT_LOGIN_FIRST: "show-copilot-login-first",
  USE_COPILOT_AUTH_IF_AVAILABLE: "use-copilot-auth-if-available",
  COPILOT_DEFAULT_MODEL: "copilot-default-model",
  NOTIFICATIONS_TURN_MODE: "notifications-turn-mode",
  NOTIFICATIONS_PERMISSIONS_ENABLED: "notifications-permissions-enabled",
  NOTIFICATIONS_QUESTIONS_ENABLED: "notifications-questions-enabled",
  GIT_BRANCH_PREFIX: "git-branch-prefix",
  GIT_ALWAYS_FORCE_PUSH: "git-always-force-push",
  GIT_CREATE_PULL_REQUEST_AS_DRAFT: "git-create-pull-request-as-draft",
  GIT_PULL_REQUEST_MERGE_METHOD: "git-pull-request-merge-method",
  GIT_SHOW_SIDEBAR_PR_ICONS: "git-show-sidebar-pr-icons",
  GIT_COMMIT_INSTRUCTIONS: "git-commit-instructions",
  GIT_PR_INSTRUCTIONS: "git-pr-instructions",
  WORKTREE_AUTO_CLEANUP_ENABLED: "worktree-auto-cleanup-enabled",
  WORKTREE_KEEP_COUNT: "worktree-keep-count",
  /**  Which workspace roots the user has currently selected to start new threads with. */
  ACTIVE_WORKSPACE_ROOTS: "active-workspace-roots",
  /** Workspace roots (folders) that the user as explicitly added using the add folder button. */
  WORKSPACE_ROOT_OPTIONS: "electron-saved-workspace-roots",
  /** Custom labels keyed by workspace root path. */
  WORKSPACE_ROOT_LABELS: "electron-workspace-root-labels",
  OPEN_IN_TARGET_PREFERENCES: "open-in-target-preferences",
  PINNED_THREAD_IDS: "pinned-thread-ids",
  THREAD_TITLES: "thread-titles",
  THREAD_WORKSPACE_ROOT_HINTS: "thread-workspace-root-hints",
  SELECTED_REMOTE_HOST_ID: "selected-remote-host-id",
  REMOTE_PROJECTS: "remote-projects",
  ACTIVE_REMOTE_PROJECT_ID: "active-remote-project-id",
  PROJECT_ORDER: "project-order",
  CONNECTION_GROUP_ORDER: "connection-group-order",
  REMOTE_CWDS_BY_HOST_AND_WORKSPACE: "remote-cwds-by-host-and-workspace",
  CODEX_MANAGED_REMOTE_CONNECTIONS: "codex-managed-remote-connections",
  REMOTE_CONNECTION_AUTO_CONNECT_BY_HOST_ID:
    "remote-connection-auto-connect-by-host-id",
  PERSISTED_ATOM_STATE: "persisted-atom-state",
  QUEUED_FOLLOW_UPS: "queued-follow-ups",
} as const;

export type ThreadTitleState = {
  titles: Record<string, string>;
  order: Array<string>;
};

export type RemoteCwdsByHostAndWorkspace = Record<
  string,
  Record<string, string>
>;

export type RemoteConnectionAutoConnectByHostId = Record<string, boolean>;

/**
 * TODO: make these zod schemas.
 */
export type GlobalStateValueByKey = {
  [GlobalStateKey.NUX_2025_09_15]: boolean | undefined;
  [GlobalStateKey.NUX_2025_09_15_FULL_CHATGPT_AUTH_VIEWED]: boolean | undefined;
  [GlobalStateKey.NUX_2025_09_15_APIKEY_AUTH_VIEWED]: boolean | undefined;
  [GlobalStateKey.WINDOWS_WSL_REMINDER_DISMISSED_AT]: string | undefined;
  [GlobalStateKey.SHOW_COPILOT_LOGIN_FIRST]: boolean | undefined;
  [GlobalStateKey.USE_COPILOT_AUTH_IF_AVAILABLE]: boolean | undefined;
  [GlobalStateKey.COPILOT_DEFAULT_MODEL]: string | undefined;
  [GlobalStateKey.NOTIFICATIONS_TURN_MODE]:
    | "off"
    | "unfocused"
    | "always"
    | undefined;
  [GlobalStateKey.NOTIFICATIONS_PERMISSIONS_ENABLED]: boolean | undefined;
  [GlobalStateKey.NOTIFICATIONS_QUESTIONS_ENABLED]: boolean | undefined;
  [GlobalStateKey.GIT_BRANCH_PREFIX]: string | undefined;
  [GlobalStateKey.GIT_ALWAYS_FORCE_PUSH]: boolean | undefined;
  [GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT]: boolean | undefined;
  [GlobalStateKey.GIT_PULL_REQUEST_MERGE_METHOD]:
    | GitPullRequestMergeMethod
    | undefined;
  [GlobalStateKey.GIT_SHOW_SIDEBAR_PR_ICONS]: boolean | undefined;
  [GlobalStateKey.GIT_COMMIT_INSTRUCTIONS]: string | undefined;
  [GlobalStateKey.GIT_PR_INSTRUCTIONS]: string | undefined;
  [GlobalStateKey.WORKTREE_AUTO_CLEANUP_ENABLED]: boolean | undefined;
  [GlobalStateKey.WORKTREE_KEEP_COUNT]: number | undefined;
  [GlobalStateKey.ACTIVE_WORKSPACE_ROOTS]: Array<string> | undefined;
  [GlobalStateKey.WORKSPACE_ROOT_OPTIONS]: Array<string> | undefined;
  [GlobalStateKey.WORKSPACE_ROOT_LABELS]: Record<string, string> | undefined;
  [GlobalStateKey.OPEN_IN_TARGET_PREFERENCES]:
    | {
        global?: string;
        perPath?: Record<string, string>;
      }
    | undefined;
  [GlobalStateKey.PINNED_THREAD_IDS]: Array<string> | undefined;
  [GlobalStateKey.THREAD_TITLES]: ThreadTitleState | undefined;
  [GlobalStateKey.THREAD_WORKSPACE_ROOT_HINTS]:
    | Record<string, string>
    | undefined;
  [GlobalStateKey.SELECTED_REMOTE_HOST_ID]: string | undefined;
  [GlobalStateKey.REMOTE_PROJECTS]: Array<RemoteProject> | undefined;
  [GlobalStateKey.ACTIVE_REMOTE_PROJECT_ID]: string | undefined;
  [GlobalStateKey.PROJECT_ORDER]: Array<string> | undefined;
  [GlobalStateKey.CONNECTION_GROUP_ORDER]: Array<string> | undefined;
  [GlobalStateKey.REMOTE_CWDS_BY_HOST_AND_WORKSPACE]:
    | RemoteCwdsByHostAndWorkspace
    | undefined;
  [GlobalStateKey.CODEX_MANAGED_REMOTE_CONNECTIONS]:
    | Array<RemoteSshConnection>
    | undefined;
  [GlobalStateKey.REMOTE_CONNECTION_AUTO_CONNECT_BY_HOST_ID]:
    | RemoteConnectionAutoConnectByHostId
    | undefined;
  [GlobalStateKey.PERSISTED_ATOM_STATE]: Record<string, unknown> | undefined;
  [GlobalStateKey.QUEUED_FOLLOW_UPS]: QueuedFollowUpState | undefined;
};

type GlobalStateKeyType = (typeof GlobalStateKey)[keyof typeof GlobalStateKey];

type GlobalStateDefaultsMap = {
  [K in GlobalStateKeyType]?: NonNullable<GlobalStateValueByKey[K]>;
};

export const GLOBAL_STATE_DEFAULTS = {
  [GlobalStateKey.GIT_ALWAYS_FORCE_PUSH]: false,
  [GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT]: false,
  [GlobalStateKey.GIT_PULL_REQUEST_MERGE_METHOD]: "merge",
  [GlobalStateKey.GIT_SHOW_SIDEBAR_PR_ICONS]: false,
  [GlobalStateKey.GIT_BRANCH_PREFIX]: "codex/",
  [GlobalStateKey.GIT_COMMIT_INSTRUCTIONS]: "",
  [GlobalStateKey.GIT_PR_INSTRUCTIONS]: "",
  [GlobalStateKey.WORKTREE_AUTO_CLEANUP_ENABLED]: true,
  [GlobalStateKey.WORKTREE_KEEP_COUNT]: 15,
} satisfies GlobalStateDefaultsMap;

export type GlobalStateKeyWithDefault = keyof typeof GLOBAL_STATE_DEFAULTS;

export type GlobalStateDefaults = {
  [K in GlobalStateKeyWithDefault]: NonNullable<GlobalStateValueByKey[K]>;
};

export function getGlobalStateDefault<K extends GlobalStateKeyWithDefault>(
  key: K,
): GlobalStateDefaults[K];
export function getGlobalStateDefault<K extends keyof GlobalStateValueByKey>(
  key: K,
): GlobalStateValueByKey[K] | undefined;
export function getGlobalStateDefault(
  key: keyof GlobalStateValueByKey,
): GlobalStateValueByKey[keyof GlobalStateValueByKey] | undefined {
  return (GLOBAL_STATE_DEFAULTS as Partial<GlobalStateValueByKey>)[key];
}
