/** Cross-process message shapes for Codex hosts. */
import type * as AppServer from "app-server-types";

import type {
  Automation,
  AutomationCreateInput,
  AutomationUpdateInput,
} from "./automations";
import type { BuildFlavor } from "./build-flavor";
import type { CommentInputItem } from "./codex-api";
import type {
  ConfigurationKey,
  ConfigurationKeys,
  ConfigValueByKey,
} from "./configuration-keys";
import type { LocalCustomAgentsResponse } from "./custom-agents";
import type {
  CancelFetchRequest,
  CancelFetchStreamRequest,
  FetchRequest,
  FetchResponse,
  FetchStreamComplete,
  FetchStreamError,
  FetchStreamEvent,
  FetchStreamRequest,
} from "./fetch";
import type { GitCwd, GitRoot } from "./git-types";
import type {
  GitPullRequestMergeMethod,
  GlobalStateKey,
} from "./global-state-key";
import type {
  HostConfig,
  RemoteConnection,
  RemoteSshConnection,
} from "./host-config";
import type { FileDescriptor, IdeContext } from "./ide-context";
import type { AutomationArchiveReason, InboxItem } from "./inbox";
import type { LocalEnvironmentResultWithPath } from "./local-environment";
import type { CodexConfig } from "./new-conversation";
import type { AgentMode } from "./permissions-config";
import type {
  QueuedFollowUpMessage,
  QueuedFollowUpState,
} from "./queued-follow-ups";
import type { RecommendedSkillsResponse } from "./recommended-skills";
import type { BuildStartConversationParamsInput } from "./start-conversation-params";
import type {
  WorkerMessageForView,
  WorkerMessageFromView,
  WorkerRequestResult,
} from "./workers/utility-types";

/**
 * Shared inbox message types to avoid magic strings across Electron/extension/webview.
 */
export const INBOX_MESSAGE_TYPES = {
  CHANGED: "inbox-items-changed",
} as const;

export type InboxMessageType =
  (typeof INBOX_MESSAGE_TYPES)[keyof typeof INBOX_MESSAGE_TYPES];

/**
 * Starting state for a thread not in the primary repo (cloud or worktree).
 */
export type AsyncThreadStartingState =
  | {
      type: "working-tree";
    }
  | {
      type: "branch";
      branchName: string;
    };

export type CustomPromptTemplate = {
  id: string;
  description?: string | null;
  argumentHint?: string | null;
  content: string;
};

export type IpcClientType = "vscode" | "desktop";

export type IpcClientConnectionStatus = "connected" | "disconnected";
export type TraceRecordingState =
  | "idle"
  | "awaiting-start-confirmation"
  | "recording"
  | "saving"
  | "awaiting-upload-details"
  | "uploading";

export type ExtendedAuthMethod = AppServer.AuthMode | "copilot";
export type ExportLogsScope = "session" | "today" | "last7days";
export type AppServerConnectionState =
  | "disconnected"
  | "connecting"
  | "unauthed"
  | "connected";

export type ImmerPatch = {
  op: "replace" | "remove" | "add";
  path: Array<string | number>;
  value?: unknown;
};

/**
 * Streaming from one client to another happens via ThreadStreamStateChange objects.
 * The state is ConversationState from AppServerManager.
 * A snapshot is the full state object and is sent on turn start, end, and IPC client connection to ensure
 * that there is no drift over time.
 * Within a turn, patches generated from immer for _every_ modification to ConversationState are sent so other clients can stay up to date
 * without having to send the full state object.
 */
export type ThreadStreamStateChange =
  | {
      type: "snapshot";
      conversationState: Record<string, unknown>;
    }
  | {
      type: "patches";
      patches: Array<ImmerPatch>;
    };

export type IpcBroadcastMessageContent = {
  "client-status-changed": {
    params: {
      clientId: string;
      clientType: IpcClientType;
      status: IpcClientConnectionStatus;
    };
  };
  /**
   * Broadcast an AppServerManager ConversationState change from an "owner" to all other clients ("followers").
   * The owner is the client that initiated a new conversation/turn with its app server.
   * We don't want multiple app servers interacting with the same conversation at the same time so we treat a single one as the
   * source of truth and use IPC to broadcast its state to others and let others communicate back to it.
   */
  "thread-stream-state-changed": {
    params: {
      conversationId: ConversationId;
      change: ThreadStreamStateChange;
    };
  };
  "thread-archived": {
    params: {
      hostId: string;
      conversationId: ConversationId;
      cwd: string;
    };
  };
  "thread-unarchived": {
    params: {
      hostId: string;
      conversationId: ConversationId;
    };
  };
  "thread-queued-followups-changed": {
    params: {
      conversationId: ConversationId;
      messages: Array<QueuedFollowUpMessage>;
    };
  };
  "app-connect-oauth-callback-received": {
    params: {
      fullRedirectUrl: string;
    };
  };
  "query-cache-invalidate": {
    params: {
      queryKey: Array<unknown>;
    };
  };
};

export type IpcBroadcastMessageForView<
  K extends keyof IpcBroadcastMessageContent,
> = {
  type: "ipc-broadcast";
  method: K;
  sourceClientId: string;
  version: number;
  params: IpcBroadcastMessageContent[K]["params"];
};

export type IpcBroadcastMessageForViewUnion = {
  [K in keyof IpcBroadcastMessageContent]: IpcBroadcastMessageForView<K>;
}[keyof IpcBroadcastMessageContent];

/**
 * We manually maintain a version for each IPC method to ensure compatibility between clients.
 * If a client receives a message with a version that does not match, it should reject the message.
 *
 * If a method is not listed, it is considered to be version 0.
 */
export const IPC_MSG_VERSION: Partial<
  Record<
    keyof IpcBroadcastMessageContent | keyof IpcRequestMessageContent,
    number
  >
> = {
  // Bump this whenever a backwards-incompatible change is made to AppServerConversationState or
  // any of the types it contains.
  "thread-stream-state-changed": 5,
  "thread-archived": 2,
  "thread-unarchived": 1,
  "thread-follower-start-turn": 1,
  "thread-follower-steer-turn": 1,
  "thread-follower-interrupt-turn": 1,
  "thread-follower-set-model-and-reasoning": 1,
  "thread-follower-set-collaboration-mode": 1,
  "thread-follower-edit-last-user-turn": 1,
  "thread-follower-command-approval-decision": 1,
  "thread-follower-file-approval-decision": 1,
  "thread-follower-submit-user-input": 1,
  "thread-follower-submit-mcp-server-elicitation-response": 1,
  "thread-follower-set-queued-follow-ups-state": 1,
  "thread-queued-followups-changed": 1,
};

export function getIpcMessageVersion(
  method: keyof IpcBroadcastMessageContent,
): number {
  const version = IPC_MSG_VERSION[method];
  if (version === undefined) {
    return 0;
  }
  return version;
}

export type IpcRequestMessageContent = {
  initialize: {
    params: {
      clientType: IpcClientType;
    };
    response: {
      clientId: string;
    };
  };
  "ide-context": {
    params: {
      workspaceRoot: string;
    };
    response: {
      ideContext: IdeContext;
    };
  };
  "thread-follower-start-turn": {
    params: {
      conversationId: ConversationId;
      turnStartParams: ThreadFollowerTurnStartParams;
    };
    response: {
      result: AppServer.v2.TurnStartResponse;
    };
  };
  "thread-follower-steer-turn": {
    params: {
      conversationId: ConversationId;
      input: Array<AppServer.v2.UserInput>;
      attachments?: Array<FileDescriptor>;
      restoreMessage: QueuedFollowUpMessage;
    };
    response: {
      result: AppServer.v2.TurnSteerResponse;
    };
  };
  "thread-follower-interrupt-turn": {
    params: {
      conversationId: ConversationId;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-set-model-and-reasoning": {
    params: {
      conversationId: ConversationId;
      model: string;
      reasoningEffort: AppServer.ReasoningEffort | null;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-set-collaboration-mode": {
    params: {
      conversationId: ConversationId;
      collaborationMode: AppServer.CollaborationMode;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-edit-last-user-turn": {
    params: {
      conversationId: ConversationId;
      turnId: string | null;
      message: string;
      agentMode: AgentMode;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-command-approval-decision": {
    params: {
      conversationId: ConversationId;
      requestId: McpRequestId;
      decision: AppServer.v2.CommandExecutionApprovalDecision;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-file-approval-decision": {
    params: {
      conversationId: ConversationId;
      requestId: McpRequestId;
      decision: AppServer.v2.FileChangeApprovalDecision;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-submit-user-input": {
    params: {
      conversationId: ConversationId;
      requestId: McpRequestId;
      response: AppServer.v2.ToolRequestUserInputResponse;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-submit-mcp-server-elicitation-response": {
    params: {
      conversationId: ConversationId;
      requestId: McpRequestId;
      response: AppServer.v2.McpServerElicitationRequestResponse;
    };
    response: {
      ok: true;
    };
  };
  "thread-follower-set-queued-follow-ups-state": {
    params: {
      conversationId: ConversationId;
      state: QueuedFollowUpState;
    };
    response: {
      ok: true;
    };
  };
};

export function getIpcRequestMessageVersion(
  method: keyof IpcRequestMessageContent,
): number {
  const version = IPC_MSG_VERSION[method];
  if (version === undefined) {
    return 0;
  }
  return version;
}

export type IpcResponseMessageFor<K extends keyof IpcRequestMessageContent> = {
  type: "response";
  requestId: string;
} & (
  | {
      resultType: "error";
      error: string;
    }
  | {
      resultType: "success";
      method: K;
      handledByClientId: string;
      result: IpcRequestMessageContent[K]["response"];
    }
);

export type IpcResponseMessage = {
  [K in keyof IpcRequestMessageContent]: IpcResponseMessageFor<K>;
}[keyof IpcRequestMessageContent];

export type ThreadFollowerRequestMethod =
  | "thread-follower-start-turn"
  | "thread-follower-steer-turn"
  | "thread-follower-interrupt-turn"
  | "thread-follower-set-model-and-reasoning"
  | "thread-follower-set-collaboration-mode"
  | "thread-follower-edit-last-user-turn"
  | "thread-follower-command-approval-decision"
  | "thread-follower-file-approval-decision"
  | "thread-follower-submit-user-input"
  | "thread-follower-submit-mcp-server-elicitation-response"
  | "thread-follower-set-queued-follow-ups-state";

type ThreadFollowerRequestTypeByMethod = {
  "thread-follower-start-turn": "thread-follower-start-turn-request";
  "thread-follower-steer-turn": "thread-follower-steer-turn-request";
  "thread-follower-interrupt-turn": "thread-follower-interrupt-turn-request";
  "thread-follower-set-model-and-reasoning": "thread-follower-set-model-and-reasoning-request";
  "thread-follower-set-collaboration-mode": "thread-follower-set-collaboration-mode-request";
  "thread-follower-edit-last-user-turn": "thread-follower-edit-last-user-turn-request";
  "thread-follower-command-approval-decision": "thread-follower-command-approval-decision-request";
  "thread-follower-file-approval-decision": "thread-follower-file-approval-decision-request";
  "thread-follower-submit-user-input": "thread-follower-submit-user-input-request";
  "thread-follower-submit-mcp-server-elicitation-response": "thread-follower-submit-mcp-server-elicitation-response-request";
  "thread-follower-set-queued-follow-ups-state": "thread-follower-set-queued-follow-ups-state-request";
};

type ThreadFollowerResponseTypeByMethod = {
  "thread-follower-start-turn": "thread-follower-start-turn-response";
  "thread-follower-steer-turn": "thread-follower-steer-turn-response";
  "thread-follower-interrupt-turn": "thread-follower-interrupt-turn-response";
  "thread-follower-set-model-and-reasoning": "thread-follower-set-model-and-reasoning-response";
  "thread-follower-set-collaboration-mode": "thread-follower-set-collaboration-mode-response";
  "thread-follower-edit-last-user-turn": "thread-follower-edit-last-user-turn-response";
  "thread-follower-command-approval-decision": "thread-follower-command-approval-decision-response";
  "thread-follower-file-approval-decision": "thread-follower-file-approval-decision-response";
  "thread-follower-submit-user-input": "thread-follower-submit-user-input-response";
  "thread-follower-submit-mcp-server-elicitation-response": "thread-follower-submit-mcp-server-elicitation-response-response";
  "thread-follower-set-queued-follow-ups-state": "thread-follower-set-queued-follow-ups-state-response";
};

export type ThreadFollowerRequestMessageForView<
  K extends ThreadFollowerRequestMethod,
> = {
  type: ThreadFollowerRequestTypeByMethod[K];
  hostId: string;
  requestId: McpRequestId;
  params: IpcRequestMessageContent[K]["params"];
};

export type ThreadFollowerRequestMessageForViewUnion = {
  [K in ThreadFollowerRequestMethod]: ThreadFollowerRequestMessageForView<K>;
}[ThreadFollowerRequestMethod];

export type ThreadFollowerResponseMessageFromView<
  K extends ThreadFollowerRequestMethod,
> = {
  type: ThreadFollowerResponseTypeByMethod[K];
  requestId: McpRequestId;
  result?: IpcRequestMessageContent[K]["response"];
  error?: string;
};

export type ThreadFollowerResponseMessageFromViewUnion = {
  [K in ThreadFollowerRequestMethod]: ThreadFollowerResponseMessageFromView<K>;
}[ThreadFollowerRequestMethod];

export type ThreadRole = "owner" | "follower";

export type ThreadRoleRequestMessageForView = {
  type: "thread-role-request";
  hostId: string;
  requestId: McpRequestId;
  conversationId: ConversationId;
};

export type ThreadRoleResponseMessageFromView = {
  type: "thread-role-response";
  requestId: McpRequestId;
  role: ThreadRole;
  error?: string;
};

export type AppStateSnapshotReason =
  | "heartbeat"
  | "thread_started"
  | "turn_started"
  | "turn_completed"
  | "delta_burst";

export type AppStateSnapshotFields = {
  event: "app_state_snapshot";
  schema_version: 1;
  snapshot_reason: AppStateSnapshotReason;
  session_age_ms: number;
  thread_count_total: number;
  thread_count_loaded_recent: number;
  thread_count_active: number;
  thread_count_with_inflight_turn: number;
  turn_count_total_loaded: number;
  item_count_total_loaded: number;
  max_turns_in_single_thread: number;
  max_items_in_single_turn: number;
  pending_request_count: number;
  inflight_turn_count: number;
  delta_events_total: number;
  delta_bytes_total_estimate: number;
  delta_events_last_30s: number;
  delta_bytes_last_30s_estimate: number;
  review_diff_files_total: number;
  review_diff_lines_total: number;
  review_diff_bytes_estimate: number;
};

export type MessageForView =
  | {
      type: "navigate-to-route";
      path: string;
      state?: unknown;
    }
  | {
      type: "connector-oauth-callback";
      fullRedirectUrl: string;
      returnTo?: string;
    }
  | {
      type: "thread-stream-snapshot-request";
      hostId: string;
      conversationId: ConversationId;
    }
  | {
      type: "thread-stream-resume-request";
      hostId: string;
      conversationId: ConversationId;
    }
  | {
      type: "chat-font-settings";
      chatFontSize: number | null;
      chatCodeFontSize: number | null;
    }
  | {
      type: "step-font-size";
      delta: number;
    }
  | {
      type: "step-window-zoom";
      delta: number;
    }
  | {
      type: "reset-window-zoom";
    }
  | {
      type: "navigate-back";
    }
  | {
      type: "navigate-forward";
    }
  | {
      type: "previous-thread";
    }
  | {
      type: "next-thread";
    }
  | {
      type: "command-menu";
      query?: string;
    }
  | {
      type: "go-to-thread-index";
      index: number;
    }
  | {
      type: "find-in-thread";
    }
  | {
      type: "thread-overlay-open-current";
    }
  | {
      type: "hotkey-window-transition";
      transitionId: string;
      step: "raise-curtain" | "lower-curtain" | "commit";
      durationMs: number;
    }
  | ThreadRoleRequestMessageForView
  | ThreadFollowerRequestMessageForViewUnion
  | {
      type: "terminal-data";
      sessionId: string;
      data: string;
    }
  | {
      type: "terminal-exit";
      sessionId: string;
      code: number | null;
      signal?: string | null;
    }
  | {
      type: "terminal-error";
      sessionId: string;
      message: string;
    }
  | {
      type: "terminal-init-log";
      sessionId: string;
      log: string;
    }
  | {
      type: "terminal-attached";
      sessionId: string;
      cwd: string;
      shell: string;
    }
  | {
      type: "active-workspace-roots-updated";
    }
  | {
      type: "workspace-root-options-updated";
    }
  | {
      type: "workspace-root-option-picked";
      root: string;
      label?: string | null;
    }
  | {
      type: "workspace-root-option-added";
      root: string;
      label?: string | null;
    }
  | {
      type: "open-create-remote-project-modal";
      setActive?: boolean;
    }
  | {
      type: "electron-onboarding-skip-workspace-result";
      success: boolean;
      root?: string;
      error?: string;
    }
  | {
      type: "electron-onboarding-pick-workspace-or-create-default-result";
      success: boolean;
      source: "picked" | "created_default";
      root?: string;
      error?: string;
    }
  | {
      type: "remote-workspace-root-requested";
      mode: "add" | "pick";
      host: string;
      hostId?: string;
      initialPath?: string | null;
      setActive?: boolean;
    }
  | {
      /** Host signals task list mutations (e.g. thread archived) so react-query can refetch immediately. */
      type: "tasks-reload-requested";
    }
  | {
      /** Host signals worktree list mutations so react-query can refetch immediately. */
      type: "worktrees-reload-requested";
      hostId: string;
    }
  | {
      type: "thread-title-updated";
      hostId: string;
      conversationId: ConversationId;
      title: string;
    }
  | {
      /** Host signals pinned-thread mutations so react-query can refetch immediately. */
      type: "pinned-threads-updated";
    }
  | {
      type: "persisted-atom-sync";
      state: PersistedAtomState;
    }
  | {
      type: "persisted-atom-updated";
      key: string;
      value: unknown;
      deleted?: boolean;
    }
  | {
      type: "electron-app-state-snapshot-request";
      hostId: string;
      requestId: string;
      reason: AppStateSnapshotReason;
    }
  | IpcBroadcastMessageForViewUnion
  | {
      type: "mcp-response";
      hostId: string;
      message: {
        id: string | number;
        result?: { [key: string]: unknown };
        error?: {
          code: number;
          message: string;
          data?: unknown;
        };
      };
    }
  | {
      type: "mcp-notification";
      hostId: string;
      method: string;
      params?: { [key: string]: unknown };
    }
  | {
      type: "mcp-request";
      hostId: string;
      request: AppServer.ServerRequest;
    }
  | CodexAppServerFatalError
  | {
      type: "codex-app-server-initialized";
      hostId: string;
    }
  | CodexAppServerConnectionChanged
  | {
      type: "is-copilot-api-available-updated";
    }
  | {
      type: "implement-todo";
      fileName: string;
      /** 1-based line number where the CodeLens was shown */
      line: number;
      /** The contents of the TODO/Codex comment on the line */
      comment: string;
    }
  | FetchResponse
  | {
      type: "window-fullscreen-changed";
      isFullScreen: boolean;
    }
  | {
      type: "app-update-ready-changed";
      isUpdateReady: boolean;
    }
  | {
      type: "electron-window-focus-changed";
      isFocused: boolean;
    }
  | FetchStreamEvent
  | FetchStreamError
  | FetchStreamComplete
  | {
      type: "add-context-file";
      file: FileDescriptor;
    }
  | {
      type: "desktop-notification-action";
      hostId: string;
      notificationId: string;
      actionId: string | null;
      actionType: DesktopNotificationActionType;
      conversationId?: LocalOrRemoteConversationId | null;
      requestId?: string | number | null;
      reply?: string | null;
    }
  | {
      type: "new-chat";
    }
  | {
      type: "log-out";
    }
  | {
      type: "copy-conversation-path";
    }
  | {
      type: "toggle-thread-pin";
    }
  | {
      type: "rename-thread";
    }
  | {
      type: "archive-thread";
    }
  | {
      type: "copy-working-directory";
    }
  | {
      type: "copy-session-id";
    }
  | {
      type: "copy-deeplink";
    }
  | {
      type: "toggle-sidebar";
    }
  | {
      type: "toggle-terminal";
    }
  | {
      type: "inbox-items-changed";
    }
  | {
      type: "toggle-diff-panel";
      open?: boolean;
    }
  | {
      type: "trace-recording-state-changed";
      state: TraceRecordingState;
    }
  | {
      type: "trace-recording-uploaded";
    }
  | {
      type: "toggle-query-devtools";
    }
  | {
      type: "custom-prompts-updated";
      prompts: Array<CustomPromptTemplate>;
    }
  | {
      /** Automation run status changed; used to refresh electron sidebar filtering. */
      type: "automation-runs-updated";
    }
  | {
      type: "shared-object-updated";
      key: SharedObjectKey;
      value: SharedObjectValue | undefined;
    }
  | WorkerMessageForView;

export type CodexAppServerFatalError = {
  type: "codex-app-server-fatal-error";
  errorMessage: string;
  cliErrorMessage?: string | null;
};

export type CodexAppServerConnectionChanged = {
  type: "codex-app-server-connection-changed";
  hostId: string;
  state: AppServerConnectionState;
  mostRecentErrorMessage: string | null;
  transport: "stdio" | "websocket";
};

export type LogLevel = "trace" | "debug" | "info" | "warning" | "error";

export type StructuredLogFields = Record<string, unknown>;
export type ApplyPatchTarget = "staged" | "unstaged" | "staged-and-unstaged";
export type ApplyPatchRequest = {
  diff: string;
  cwd: string;
  env?: Record<string, string>;
  allowBinary?: boolean;
  revert?: boolean;
  /**
   * Where to apply the patch. Defaults to worktree-only for backwards compatibility.
   */
  target?: ApplyPatchTarget;
};
export type ApplyPatchErrorCode = "not-git-repo";
export type ApplyPatchResult = {
  status: "success" | "partial-success" | "error";
  appliedPaths: Array<string>;
  skippedPaths: Array<string>;
  conflictedPaths: Array<string>;
  errorCode?: ApplyPatchErrorCode;
  execOutput?: CommandExecutionOutput;
};

export type GitDiffError =
  | { type: "diff-too-large"; limitBytes: number }
  | { type: "unknown" };

export type GitDiff =
  | { type: "success"; unifiedDiff: string; unifiedDiffBytes?: number }
  | { type: "error"; error: GitDiffError };

export type GitCatFileError =
  | { type: "too-large"; limitBytes: number }
  | { type: "not-found" }
  | { type: "unknown" };

export type GitCatFileResult =
  | { type: "success"; lines: Array<string> }
  | { type: "error"; error: GitCatFileError };

export type GitChangesResult = {
  gitRoot: string | null;
  branch: string | null;
  /** The best-guess branch that the current branch would merge into for a PR.  */
  baseBranch: string | null;
  /** Remote name for the base branch comparison target. */
  baseBranchRemote: string | null;
  branchChanges: GitDiff;
  /**
   * Changes that have been staged (index vs HEAD).
   */
  stagedChanges: GitDiff;
  /**
   * Changes in the working tree (unstaged, tracked files only).
   */
  unstagedChanges: GitDiff;
  /**
   * Untracked file changes (diffs against /dev/null).
   */
  untrackedChanges: GitDiff;
  /**
   * Combination of staged and unstaged changes (including untracked).
   */
  uncommittedChanges: GitDiff;
};

export type GitBranchChangesResult = Pick<
  GitChangesResult,
  "gitRoot" | "branch" | "baseBranch" | "baseBranchRemote" | "branchChanges"
>;

export type GitStagedAndUnstagedChangesResult = Pick<
  GitChangesResult,
  "stagedChanges" | "unstagedChanges"
>;

export type GitUntrackedChangesResult = Pick<
  GitChangesResult,
  "untrackedChanges"
>;

export type GitReviewSource = "branch" | "staged" | "unstaged";

export type GitReviewFileChangeKind =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type-changed"
  | "unmerged"
  | "untracked";

export type GitReviewFileSummary = {
  path: string;
  previousPath: string | null;
  changeKind: GitReviewFileChangeKind;
  additions: number | null;
  deletions: number | null;
  revision: string;
};

export type GitReviewSummary =
  | {
      type: "success";
      source: GitReviewSource;
      stageCounts: {
        stagedFileCount: number;
        unstagedFileCount: number;
        untrackedFileCount: number;
      };
      files: Array<GitReviewFileSummary>;
    }
  | {
      type: "error";
      source: GitReviewSource;
    };

export type GitReviewSearchMatch = {
  path: string;
  hunkId: string;
  lineStart: number;
  lineEnd: number;
  start: number;
  end: number;
  snippet: {
    before: string;
    match: string;
    after: string;
  };
};

export type GitReviewSearchResult =
  | {
      type: "success";
      source: GitReviewSource;
      query: string;
      matches: Array<GitReviewSearchMatch>;
      totalMatches: number;
      isCapped: boolean;
    }
  | {
      type: "error";
      source: GitReviewSource;
      query: string;
    };

export type GitStatusSummary =
  | {
      type: "success";
      stagedCount: number;
      unstagedCount: number;
      untrackedCount: number;
    }
  | { type: "error" };

export type GitUncommittedChangesResult = Pick<
  GitChangesResult,
  | "gitRoot"
  | "branch"
  | "baseBranch"
  | "baseBranchRemote"
  | "uncommittedChanges"
  | "untrackedChanges"
> & { trackedChanges: GitDiff };

export type GitTrackedUncommittedChangesResult = Pick<
  GitUncommittedChangesResult,
  "trackedChanges"
>;

/**
 * Captures the subprocess command and the combined stdout/stderr output.
 */
export type CommandExecutionOutput = {
  command: string;
  output: string;
};

export type GitCommitResponse =
  | {
      status: "success";
      commitSha: string | null;
    }
  | {
      status: "error";
      error: string;
      execOutput?: CommandExecutionOutput;
    };

export type GitPushStatus = {
  gitRoot: string | null;
  branch: string | null;
  defaultBranch: string | null;
  commitsAhead: number;
  upstreamRef: string | null;
  /** Indicates whether this is the main worktree (git dir equals git common dir) vs a linked worktree with its own git dir. */
  isMainWorktree: boolean | null;
};

export type GitPushRequest = {
  cwd: string;
  hostId?: string;
  refspec?: string | null;
  setUpstream?: boolean | null;
  force?: boolean | null;
};

export type GitPushError =
  | "remote-updated"
  | "no-upstream"
  | "auth"
  | "remote-rejected"
  | "unknown";

export type GitCheckoutBranchErrorType =
  | "blocked-by-working-tree-changes"
  | "failed-to-stash-changes"
  | "unknown";

export type GitPushResponse =
  | {
      status: "success";
      remote?: string | null;
      refspec?: string | null;
    }
  | {
      status: "error";
      error: GitPushError;
      execOutput?: CommandExecutionOutput;
    };

export type GitCreateBranchRequest = {
  cwd: string;
  branch: string;
  hostId?: string;
  /**
   * When set to synced, the branch will be created but not checked out in the cwd.
   * However, a synced branch config will be created in the .git subfolder of the cwd worktree
   */
  mode: "worktree" | "synced";
};

export type GitCreateBranchResponse =
  | {
      status: "success";
      branch: string;
    }
  | {
      status: "error";
      error: string;
      execOutput?: CommandExecutionOutput;
    };

export type GitCheckoutBranchRequest = {
  cwd: GitCwd;
  branch: string;
  hostId?: string;
  stashUncommitted?: boolean;
};

export type GitCheckoutBranchResponse =
  | {
      status: "success";
      branch: string;
      stashRef: string | null;
    }
  | {
      status: "error";
      error: string;
      errorType: GitCheckoutBranchErrorType;
      conflictedPaths?: Array<string>;
      execOutput?: CommandExecutionOutput;
    };

export type GhCliStatus = {
  isInstalled: boolean;
  isAuthenticated: boolean;
};

export type GhCreatePullRequestRequest = {
  cwd: GitCwd;
  headBranch: string;
  baseBranch: string | null;
  hostId?: string;
  isDraft?: boolean;
  titleOverride?: string | null;
  bodyOverride?: string | null;
};

export type GhCreatePullRequestResponse =
  | {
      status: "success";
      url: string | null;
    }
  | {
      status: "error";
      error: string;
      execOutput?: CommandExecutionOutput;
    };

export type GhPullRequestCiStatus = "failing" | "none" | "passing" | "pending";
export type GhPullRequestCheckStatus =
  | "failing"
  | "passing"
  | "pending"
  | "skipped"
  | "unknown";

export type GhPullRequestReviewStatus =
  | "approved"
  | "changes_requested"
  | "none"
  | "review_required";

export type GhPullRequestCheck = {
  completedAt?: string | null;
  description?: string | null;
  event?: string | null;
  link?: string | null;
  name: string;
  startedAt?: string | null;
  state?: string | null;
  status: GhPullRequestCheckStatus;
  workflow: string | null;
};

export type GhPullRequestReviewerCommentCount = {
  reviewer: string;
  commentCount: number;
};

export type GhPullRequestReviewers = {
  approved: Array<string>;
  commentCounts: Array<GhPullRequestReviewerCommentCount>;
  commented: Array<string>;
  changesRequested: Array<string>;
  requested: Array<string>;
  unresolvedCommentCount: number;
};

export type GhPullRequestCommentAttachment = CommentInputItem & {
  url?: string | null;
};

export type GhPullRequestStatusRequest = {
  cwd: GitCwd;
  headBranch: string;
  hostId?: string;
};

export type GhPullRequestStatusResponse = {
  status: "success";
  canMerge: boolean;
  checks: Array<GhPullRequestCheck>;
  ciStatus: GhPullRequestCiStatus;
  commentAttachments: Array<GhPullRequestCommentAttachment>;
  hasOpenPr: boolean;
  isDraft: boolean;
  number: number | null;
  repo: string | null;
  reviewers: GhPullRequestReviewers;
  reviewStatus: GhPullRequestReviewStatus;
  url: string | null;
};

export type GhMergePullRequestRequest = {
  cwd: GitCwd;
  mergeMethod: GitPullRequestMergeMethod;
  number: number;
  repo: string | null;
  hostId?: string;
};

export type GhMergePullRequestResponse =
  | {
      status: "success";
    }
  | {
      status: "error";
      error: string;
      execOutput?: CommandExecutionOutput;
    };

export type GhPullRequestBoardState =
  | "draft"
  | "in_progress"
  | "failing"
  | "ready"
  | "merged";

export type GhPullRequestBoardItem = {
  additions: number;
  baseBranch: string;
  canMerge: boolean;
  ciStatus: GhPullRequestCiStatus;
  createdAt: string;
  cwd: GitCwd;
  deletions: number;
  headBranch: string;
  number: number;
  reviewStatus: GhPullRequestReviewStatus;
  state: GhPullRequestBoardState;
  title: string;
  updatedAt: string;
  url: string;
};

export type GhPullRequestBoardRequest = {
  cwd: GitCwd;
  repo: string | null;
  hostId?: string;
};

export type GhPullRequestBoardResponse =
  | {
      items: Array<GhPullRequestBoardItem>;
      status: "success";
    }
  | {
      error: string;
      status: "error";
    };

export type McpRequestId = (string | number) & {
  readonly _brand: unique symbol;
};

export function createMcpRequestId(
  requestId: AppServer.RequestId,
): McpRequestId {
  return requestId as McpRequestId;
}

export type ConversationId = string & { readonly _brand: unique symbol };

/**
 * A slightly messy abstraction for when we need to represent either a local or remote conversation id.
 * The remote conversation id comes from sa-server-client so we can't give it a better type than `string`.
 */
export type LocalOrRemoteConversationId = ConversationId | string;

export function createConversationId(id: string): ConversationId {
  return id as ConversationId;
}

export type DesktopNotificationKind =
  | "turn-complete"
  | "permission"
  | "question";
export type DesktopNotificationActionType =
  | "open"
  | "approve"
  | "approve-for-session"
  | "decline"
  | "reply";

export type DesktopNotificationAction = {
  id: string;
  title: string;
  actionType: DesktopNotificationActionType;
};

export type DesktopNotificationPayload = {
  id: string;
  kind: DesktopNotificationKind;
  title: string;
  body: string;
  conversationId?: LocalOrRemoteConversationId | null;
  requestId?: string | number | null;
  actions?: Array<DesktopNotificationAction>;
  replyPlaceholder?: string | null;
};

export type PendingWorktreePhase =
  | "queued"
  | "creating"
  | "worktree-ready"
  | "failed";

export type PendingWorktreeLaunch =
  | {
      launchMode: "start-conversation";
      startConversationParamsInput: BuildStartConversationParamsInput;
      sourceConversationId: null;
      sourceCollaborationMode: null;
    }
  | {
      launchMode: "fork-conversation";
      startConversationParamsInput: null;
      sourceConversationId: ConversationId;
      sourceCollaborationMode: AppServer.CollaborationMode | null;
    }
  | {
      launchMode: "create-stable-worktree";
      startConversationParamsInput: null;
      sourceConversationId: null;
      sourceCollaborationMode: null;
    };

export type PendingWorktreeCreate = {
  id: string;
  hostId: string;
  label: string;
  sourceWorkspaceRoot: string;
  startingState: AsyncThreadStartingState;
  localEnvironmentConfigPath: string | null;
  prompt: string;
} & PendingWorktreeLaunch;

export type PendingWorktree = PendingWorktreeCreate & {
  createdAt: number;
  phase: PendingWorktreePhase;
  labelEdited: boolean;
  outputText: string;
  errorMessage: string | null;
  worktreeWorkspaceRoot: string | null;
  worktreeGitRoot: string | null;
  needsAttention: boolean;
  isPinned: boolean;
};

export type PendingWorktreeMetadataUpdate =
  | {
      type: "label";
      label: string;
    }
  | {
      type: "labelEdited";
      labelEdited: boolean;
    }
  | {
      type: "isPinned";
      isPinned: boolean;
    }
  | {
      type: "needsAttention";
      needsAttention: boolean;
    };

export type PendingWorktreeMessageFromView =
  | {
      type: "pending-worktree-create";
      hostId: string;
      request: PendingWorktreeCreate;
    }
  | {
      type: "pending-worktree-cancel";
      hostId: string;
      id: string;
    }
  | {
      type: "pending-worktree-dismiss";
      hostId: string;
      id: string;
    }
  | {
      type: "pending-worktree-retry";
      hostId: string;
      id: string;
    }
  | {
      type: "pending-worktree-update-metadata";
      hostId: string;
      id: string;
      update: PendingWorktreeMetadataUpdate;
    };

export type SharedObjectValueMap = {
  diff_comments: Record<LocalOrRemoteConversationId, Array<CommentInputItem>>;
  diff_comment_drafts: Record<
    LocalOrRemoteConversationId,
    Record<string, true>
  >;
  diff_comments_from_model: Record<
    LocalOrRemoteConversationId,
    Array<ReviewFindingComment>
  >;
  statsig_default_enable_features: Record<string, boolean>;
  host_config: HostConfig;
  composer_prefill: {
    text: string;
    cwd?: string | null;
  };
  pending_worktrees: Array<PendingWorktree>;
  skills_refresh_nonce: number;
  remote_connections: Array<RemoteConnection>;
  remote_control_connections_state: {
    available: boolean;
    authRequired: boolean;
  };
};
export type SharedObjectKey = keyof SharedObjectValueMap;

export type ReviewFindingCommentStatus = "added" | "dismissed";
export type ReviewFindingComment = CommentInputItem & {
  reviewFindingStatus?: ReviewFindingCommentStatus;
};

export type SharedObjectValue<K extends SharedObjectKey = SharedObjectKey> =
  SharedObjectValueMap[K];

export type PersistedAtomState = Record<string, unknown>;

export type OpenInTarget =
  | "vscode"
  | "vscodeInsiders"
  | "visualStudio"
  | "cursor"
  | "bbedit"
  | "sublimeText"
  | "zed"
  | "textmate"
  | "notepad"
  | "githubDesktop"
  | "systemDefault"
  | "fileManager"
  | "terminal"
  | "gitBash"
  | "cmder"
  | "wsl"
  | "iterm2"
  | "ghostty"
  | "xcode"
  | "androidStudio"
  | "intellij"
  | "rider"
  | "phpstorm"
  | "goland"
  | "rustrover"
  | "pycharm"
  | "warp"
  | "windsurf"
  | "antigravity"
  | "webstorm";

export type OpenInTargetLocation = {
  line: number;
  column: number;
};

export type ThreadFollowerTurnStartParams = Omit<
  AppServer.v2.TurnStartParams,
  | "threadId"
  | "model"
  | "effort"
  | "personality"
  | "outputSchema"
  | "collaborationMode"
> & {
  model?: string | null;
  effort?: AppServer.ReasoningEffort | null;
  personality?: AppServer.v2.TurnStartParams["personality"] | null;
  outputSchema?: AppServer.v2.TurnStartParams["outputSchema"] | null;
  collaborationMode?: AppServer.CollaborationMode | null;
  attachments?: Array<FileDescriptor>;
};

export type MessageFromView =
  | { type: "ready" }
  | { type: "heartbeat-automations-enabled-changed"; enabled: boolean }
  | {
      type: "heartbeat-automation-thread-state-changed";
      threadId: string | null;
      isEligible: boolean;
      collaborationMode: AppServer.CollaborationMode | null;
      reason:
        | "missing_conversation"
        | "missing_turn"
        | "resuming"
        | "turn_in_progress"
        | "waiting_on_approval"
        | "waiting_on_user_input"
        | "pending_request"
        | null;
    }
  | { type: "export-logs"; scope: ExportLogsScope }
  | { type: "inbox-item-set-read-state"; id: string; isRead: boolean }
  | {
      type: "inbox-items-create";
      conversationId: ConversationId;
      turnId: string | null;
      items: Array<{
        id: string;
        title: string | null;
        description: string | null;
      }>;
    }
  | {
      type: "archive-thread";
      hostId: string;
      conversationId: ConversationId;
      cwd: string;
      cleanupWorktree: boolean;
    }
  | {
      type: "unarchive-thread";
      hostId: string;
      conversationId: ConversationId;
    }
  | {
      type: "thread-archived";
      hostId: string;
      conversationId: ConversationId;
      cwd: string;
    }
  | {
      type: "thread-unarchived";
      hostId: string;
      conversationId: ConversationId;
    }
  | {
      type: "thread-queued-followups-changed";
      conversationId: ConversationId;
      messages: Array<QueuedFollowUpMessage>;
    }
  | { type: "open-thread-overlay"; conversationId: ConversationId }
  | { type: "open-in-main-window"; path: string }
  | { type: "open-in-hotkey-window"; path: string; prefillCwd?: string | null }
  | { type: "hotkey-window-enabled-changed"; enabled: boolean }
  | { type: "hotkey-window-collapse-to-home" }
  | { type: "hotkey-window-dismiss" }
  | {
      type: "hotkey-window-home-pointer-interaction-changed";
      isInteractive: boolean;
    }
  | {
      type: "hotkey-window-transition-done";
      transitionId: string;
      step: "raised" | "lowered";
    }
  | { type: "thread-overlay-set-always-on-top"; shouldFloat: boolean }
  | ThreadRoleResponseMessageFromView
  | ThreadFollowerResponseMessageFromViewUnion
  | {
      type: "codex-app-server-restart";
      hostId: string;
      errorMessage?: string | null;
    }
  | { type: "install-app-update" }
  | { type: "open-debug-window" }
  | { type: "toggle-trace-recording" }
  | { type: "view-focused" }
  | {
      type: "subagent-thread-opened";
      hostId: string;
      conversationId: ConversationId;
    }
  | { type: "electron-window-focus-request" }
  | { type: "power-save-blocker-set"; shouldBlock: boolean }
  | { type: "persisted-atom-sync-request" }
  | {
      type: "persisted-atom-update";
      key: string;
      value: unknown;
      deleted?: boolean;
    }
  | { type: "persisted-atom-reset" }
  | {
      type: "thread-stream-state-changed";
      conversationId: ConversationId;
      change: ThreadStreamStateChange;
      version: number;
    }
  | {
      type: "query-cache-invalidate";
      queryKey: Array<unknown>;
    }
  | {
      type: "mcp-request";
      request: AppServer.ClientRequest;
      hostId: string;
    }
  | {
      type: "mcp-notification";
      hostId: string;
      request: {
        method: string;
        params: { [key: string]: unknown };
      };
    }
  | {
      type: "mcp-response";
      hostId: string;
      response: {
        id: McpRequestId;
        result: { [key: string]: unknown };
      };
    }
  | { type: "open-in-browser"; url: string }
  /** Navigate to this path in a new editor tab rather than in the current webview. */
  | {
      type: "navigate-in-new-editor-tab";
      path: string;
    }
  | {
      type: "open-vscode-command";
      command: string;
      args?: Array<unknown>;
    }
  | {
      type: "show-diff";
      unifiedDiff: string;
      conversationId: LocalOrRemoteConversationId;
      cwd: GitCwd | null;
    }
  | {
      type: "show-plan-summary";
      planContent: string;
      conversationId: ConversationId;
    }
  | {
      type: "show-settings";
      section: string;
    }
  | {
      type: "log-message";
      level: LogLevel;
      message: string;
      tags?: {
        safe: StructuredLogFields;
        sensitive: StructuredLogFields;
      };
    }
  | {
      type: "electron-app-state-snapshot-trigger";
      reason: AppStateSnapshotReason;
    }
  | {
      type: "electron-app-state-snapshot-response";
      requestId: string;
      fields: AppStateSnapshotFields;
    }
  | {
      type: "desktop-notification-show";
      notification: DesktopNotificationPayload;
    }
  | {
      type: "desktop-notification-hide";
      conversationId: LocalOrRemoteConversationId | null;
    }
  | PendingWorktreeMessageFromView
  | FetchRequest
  | CancelFetchRequest
  | FetchStreamRequest
  | CancelFetchStreamRequest
  | {
      type: "update-diff-if-open";
      unifiedDiff: string;
      conversationId?: ConversationId | null;
    }
  /** The subscriber will receive an update with the initial value of the shared object. */
  | {
      type: "shared-object-subscribe";
      key: SharedObjectKey;
    }
  | {
      type: "shared-object-unsubscribe";
      key: SharedObjectKey;
    }
  | {
      type: "shared-object-set";
      key: SharedObjectKey;
      value: SharedObjectValue | undefined;
    }
  | {
      type: "terminal-create";
      sessionId?: string;
      conversationId?: LocalOrRemoteConversationId | null;
      hostId?: string | null;
      cwd?: string | null;
      cols?: number;
      rows?: number;
    }
  | {
      type: "terminal-attach";
      sessionId: string;
      conversationId?: LocalOrRemoteConversationId | null;
      hostId?: string | null;
      cwd?: string | null;
      forceCwdSync?: boolean;
      cols?: number;
      rows?: number;
    }
  | {
      type: "terminal-write";
      sessionId: string;
      data: string;
    }
  | {
      type: "terminal-run-action";
      sessionId: string;
      cwd: string;
      command: string;
    }
  | {
      type: "terminal-resize";
      sessionId: string;
      cols: number;
      rows: number;
    }
  | {
      type: "terminal-close";
      sessionId: string;
    }
  | { type: "open-extension-settings" }
  | { type: "open-keyboard-shortcuts" }
  | { type: "open-config-toml" }
  | { type: "install-wsl" }
  | { type: "electron-request-microphone-permission" }
  | {
      type: "electron-desktop-features-changed";
      artifactsPane: boolean;
      multiWindow: boolean;
    }
  | { type: "electron-set-window-mode"; mode: "onboarding" | "app" }
  | { type: "electron-add-ssh-host"; host: string; openWindow?: boolean }
  | { type: "electron-add-new-workspace-root-option"; root?: string }
  | { type: "electron-pick-workspace-root-option" }
  | { type: "electron-onboarding-skip-workspace"; projectName?: string }
  | {
      type: "electron-onboarding-pick-workspace-or-create-default";
      defaultProjectName: string;
    }
  | {
      type: "electron-set-active-workspace-root";
      root: string;
    }
  | {
      type: "electron-update-workspace-root-options";
      /** This is a complete list of all workspace root options, not a diff. */
      roots: Array<string>;
    }
  | {
      type: "electron-rename-workspace-root-option";
      root: string;
      label: string;
    }
  | { type: "electron-set-badge-count"; count: number }
  | {
      type: "set-telemetry-user";
      authMethod: ExtendedAuthMethod | null;
      userId: string | null;
      email: string | null;
    }
  | WorkerMessageFromView;

/**
 * vscode://codex/ requests from a webview that are written like normal fetch requests but handled by the extension
 * instead of making a real fetch network request.
 * Handled by extension-fetch-handler.ts
 */
export type ChildProcessKind =
  | "app_server"
  | "electron_gpu"
  | "electron_network"
  | "electron_proxy"
  | "electron_renderer"
  | "electron_utility"
  | "git"
  | "mcp"
  | "shell"
  | "other";

export type ChildProcessInfo = {
  pid: number;
  parentPid: number;
  depth: number;
  rootChildPid: number;
  kind: ChildProcessKind;
  command: string;
  ageSeconds: number | null;
  rssKb: number | null;
};

export type HotkeyWindowHotkeyState = {
  supported: boolean;
  configuredHotkey: string | null;
  isGateEnabled: boolean;
  isDevMode: boolean;
  isDevOverrideEnabled: boolean;
  /**
   * True only when runtime registration succeeded.
   * This is intentionally separate from config fields because shortcut
   * registration can still fail at runtime (for example, when reserved by OS).
   */
  isActive: boolean;
};

export type HotkeyWindowHotkeyMutationResponse =
  | {
      success: true;
      state: HotkeyWindowHotkeyState;
    }
  | {
      success: false;
      error: string;
      state: HotkeyWindowHotkeyState;
    };

export type FastModeRolloutMetricsParams = {
  endTimeMs?: number;
  maxRollouts?: number | null;
  startTimeMs: number;
};

export type FastModeRolloutMetrics = {
  completedTurnCount: number;
  endTimeMs: number;
  estimatedFastMs: number;
  estimatedSavedMs: number;
  estimatedStandardMs: number;
  estimatedTurnCount: number;
  maxRollouts: number | null;
  observedCompletedTurnWallTimeMs: number;
  parsedRolloutCount: number;
  rolloutCountWithCompletedTurns: number;
  rolloutCountWithEstimatedTurns: number;
  scannedRolloutCount: number;
  startTimeMs: number;
  totalGeneratedTokens: number;
  totalOutputTokens: number;
  totalReasoningOutputTokens: number;
};

export type VSCodeFetchRequest = {
  "active-workspace-roots": {
    request: undefined;
    response: {
      roots: Array<string>;
    };
  };
  "workspace-root-options": {
    request: undefined;
    response: {
      roots: Array<string>;
      labels?: Record<string, string>;
    };
  };
  "add-workspace-root-option": {
    request: {
      root: string;
      label?: string;
      setActive?: boolean;
    };
    response: { success: boolean };
  };
  "electron-clone-workspace-repo": {
    request: {
      url: string;
      dialogTitle: string;
    };
    response: { success: boolean; canceled: boolean; error: string | null };
  };
  "worktree-create-managed": {
    request: {
      hostId: string;
      cwd: GitCwd;
      startingState: AsyncThreadStartingState;
      localEnvironmentConfigPath: string | null;
      streamId: string;
    };
    response: WorkerRequestResult<"git", "create-worktree">;
  };
  "worktree-delete": {
    request: {
      hostId: string;
      worktree: GitRoot;
      reason:
        | "settings-delete-targeted"
        | "archive-cleanup"
        | "startup-cleanup"
        | "new-branch-cleanup"
        | "remove-workspace-root-cleanup";
    };
    response: undefined;
  };
  "worktree-set-owner-thread": {
    request: {
      hostId: string;
      worktree: GitRoot;
      conversationId: ConversationId;
    };
    response: undefined;
  };
  "codex-home": {
    request:
      | {
          hostId?: string;
        }
      | undefined;
    response: {
      codexHome: string;
      worktreesSegment: string;
    };
  };
  "app-connect-oauth-callback-url": {
    request: undefined;
    response: {
      callbackUrl: string;
    };
  };
  "fast-mode-rollout-metrics": {
    request: FastModeRolloutMetricsParams;
    response: FastModeRolloutMetrics | null;
  };
  "refresh-remote-connections": {
    request: undefined;
    response: {
      remoteConnections: Array<RemoteConnection>;
    };
  };
  "save-codex-managed-remote-ssh-connections": {
    request: {
      remoteConnections: Array<RemoteSshConnection>;
    };
    response: {
      remoteConnections: Array<RemoteSshConnection>;
    };
  };
  "set-remote-connection-auto-connect": {
    request: {
      hostId: string;
      autoConnect: boolean;
    };
    response: {
      remoteConnections: Array<RemoteConnection>;
      state: AppServerConnectionState | null;
      errorMessage: string | null;
    };
  };
  "start-remote-chatgpt-login-port-forward": {
    request: {
      hostId: string;
      loginId: string;
    };
    response: {
      forwarded: boolean;
    };
  };
  "stop-remote-chatgpt-login-port-forward": {
    request: {
      hostId: string;
      loginId: string;
    };
    response: {
      stopped: boolean;
    };
  };
  "app-server-connection-state": {
    request: {
      hostId: string;
    };
    response: {
      state: AppServerConnectionState | null;
      errorMessage: string | null;
    };
  };
  "remote-workspace-directory-entries": {
    request: {
      hostId: string;
      directoryPath?: string | null;
      directoriesOnly?: boolean;
    };
    response: {
      directoryPath: string;
      parentPath: string | null;
      entries: Array<{
        name: string;
        path: string;
        type: "directory" | "file";
      }>;
    };
  };
  "workspace-directory-entries": {
    request: {
      workspaceRoot: string;
      directoryPath?: string | null;
      directoriesOnly?: boolean;
      includeHidden?: boolean;
    };
    response: {
      workspaceRoot: string;
      directoryPath: string;
      parentPath: string | null;
      entries: Array<{
        name: string;
        path: string;
        type: "directory" | "file";
        isSymlink?: boolean;
      }>;
    };
  };
  "account-info": {
    request: undefined;
    response:
      | {
          accountId: string;
          userId: string;
          plan: string;
          email: string | null;
        }
      | {
          accountId: null;
          userId: null;
          plan: null;
          email: null;
        };
  };
  "extension-info": {
    request: undefined;
    response: {
      version: string;
      buildNumber: string | null;
      buildFlavor: BuildFlavor | null;
    };
  };
  "third-party-notices": {
    request: undefined;
    response: {
      text: string | null;
    };
  };
  "locale-info": {
    request: undefined;
    response: {
      ideLocale: string;
      systemLocale: string;
    };
  };
  "os-info": {
    request: undefined;
    response: {
      platform: string;
      hasWsl: boolean;
      isVsCodeRunningInsideWsl: boolean;
    };
  };
  "child-processes": {
    request: undefined;
    response: {
      processes: Array<ChildProcessInfo>;
    };
  };
  "hotkey-window-hotkey-state": {
    request: undefined;
    response: HotkeyWindowHotkeyState;
  };
  "hotkey-window-set-hotkey": {
    request: {
      hotkey: string | null;
    };
    response: HotkeyWindowHotkeyMutationResponse;
  };
  "hotkey-window-set-dev-hotkey-override": {
    request: {
      enabled: boolean;
    };
    response: HotkeyWindowHotkeyMutationResponse;
  };
  "feedback-create-sentry-issue": {
    request: {
      classification: string;
      description: string;
      includeLogs: boolean;
      correlationId: string;
    };
    response: {
      reportId: string;
    };
  };
  "openai-api-key": {
    request: undefined;
    response: {
      value: string | null;
    };
  };
  "recommended-skills": {
    request: {
      refresh?: boolean;
    };
    response: RecommendedSkillsResponse;
  };
  "local-custom-agents": {
    request: {
      roots?: Array<string>;
    };
    response: LocalCustomAgentsResponse;
  };
  "install-recommended-skill": {
    request: {
      skillId: string;
      repoPath: string;
      installRoot: string | null;
    };
    response: {
      success: boolean;
      destination: string | null;
      error: string | null;
    };
  };
  "remove-skill": {
    request: {
      skillPath: string;
    };
    response: {
      success: boolean;
      deletedPath: string | null;
      error: string | null;
    };
  };
  "read-file": {
    request: {
      path: string;
    };
    response: {
      contents: string;
    };
  };
  "read-file-binary": {
    request: {
      path: string;
    };
    response: {
      contentsBase64: string;
    };
  };
  "read-git-file-binary": {
    request: {
      cwd: GitCwd | null;
      path: string;
      ref: "head" | "index";
    };
    response: {
      contentsBase64: string | null;
    };
  };
  "codex-agents-md": {
    request: undefined;
    response: {
      path: string;
      contents: string;
    };
  };
  "codex-agents-md-save": {
    request: {
      contents: string;
    };
    response: {
      path: string;
    };
  };
  "generate-thread-title": {
    request: {
      hostId: string;
      prompt: string;
      cwd?: string | null;
    };
    response: {
      title: string | null;
    };
  };
  "generate-commit-message": {
    request: {
      hostId: string;
      prompt: string;
      cwd?: string | null;
      conversationId?: string | null;
      model: string;
    };
    response: {
      message: string | null;
    };
  };
  "generate-pull-request-message": {
    request: {
      hostId: string;
      prompt: string;
      cwd?: string | null;
      conversationId?: string | null;
      model: string;
    };
    response: {
      title: string | null;
      body: string | null;
    };
  };
  "inbox-items": {
    request: {
      limit?: number;
    };
    response: {
      items: Array<InboxItem>;
    };
  };
  "list-automations": {
    request: undefined;
    response: {
      items: Array<Automation>;
    };
  };
  "developer-instructions": {
    request: {
      baseInstructions?: string | null;
      cwd?: string | null;
      threadId?: string | null;
    };
    response: {
      instructions: string;
    };
  };
  "automation-create": {
    request: AutomationCreateInput;
    response: {
      item: Automation;
    };
  };
  "automation-update": {
    request: AutomationUpdateInput;
    response: {
      item: Automation;
    };
  };
  "automation-delete": {
    request: Pick<Automation, "id">;
    response: {
      success: boolean;
    };
  };
  "automation-run-now": {
    request: Pick<Automation, "id"> & {
      collaborationMode?: AppServer.CollaborationMode | null;
    };
    response: {
      success: boolean;
    };
  };
  "list-pending-automation-run-threads": {
    /** Thread ids for automation runs that are pending acceptance. */
    request: undefined;
    response: {
      threadIds: Array<string>;
    };
  };
  "automation-run-archive": {
    request: {
      threadId: string;
      archivedAssistantMessage?: string | null;
      archivedUserMessage?: string | null;
      archivedReason?: AutomationArchiveReason;
    };
    response: {
      success: boolean;
    };
  };
  "automation-run-delete": {
    request: {
      threadId: string;
    };
    response: {
      success: boolean;
    };
  };
  "list-pinned-threads": {
    request: undefined;
    response: {
      threadIds: Array<string>;
    };
  };
  "set-thread-pinned": {
    request: {
      threadId: string;
      pinned: boolean;
    };
    response: {
      success: boolean;
    };
  };
  "set-pinned-threads-order": {
    request: {
      threadIds: Array<string>;
    };
    response: {
      success: boolean;
    };
  };
  "has-custom-cli-executable": {
    request: undefined;
    response: {
      hasCustomCliExecutable: boolean;
    };
  };
  "find-files": {
    request: {
      query: string;
      cwd?: string | null;
    };
    response: {
      files: Array<FileDescriptor>;
    };
  };
  "paths-exist": {
    request: {
      paths: Array<string>;
    };
    response: {
      existingPaths: Array<string>;
    };
  };
  "local-environment": {
    request: {
      configPath: string;
    };
    response: {
      environment: LocalEnvironmentResultWithPath;
    };
  };
  "local-environments": {
    request: {
      workspaceRoot: string;
    };
    response: {
      environments: Array<LocalEnvironmentResultWithPath>;
    };
  };
  "local-environment-config": {
    request: {
      configPath: string;
    };
    response: {
      configPath: string;
      exists: boolean;
      raw: string | null;
    };
  };
  "local-environment-config-save": {
    request: {
      configPath: string;
      raw: string;
    };
    response: {
      configPath: string;
      success: boolean;
    };
  };
  "ide-context": {
    request:
      | {
          // Required for Electron to determine which IDE workspace to connect to.
          workspaceRoot: string;
        }
      // Not required for VS Code.
      | undefined;
    response: {
      ideContext: IdeContext;
    };
  };
  "ipc-request": {
    request: {
      method: keyof IpcRequestMessageContent;
      params: IpcRequestMessageContent[keyof IpcRequestMessageContent]["params"];
      targetClientId?: string;
    };
    response: IpcResponseMessage;
  };
  "apply-patch": {
    request: ApplyPatchRequest & { hostConfig: HostConfig };
    response: ApplyPatchResult;
  };
  "open-in-targets": {
    request: { cwd: GitCwd | null };
    response: {
      preferredTarget?: OpenInTarget | null;
      availableTargets: Array<OpenInTarget>;
      targets: Array<{
        id: OpenInTarget;
        label: string;
        icon: string;
        hidden?: boolean;
        default?: boolean;
        available?: boolean;
      }>;
    };
  };
  "set-preferred-app": {
    request: { target: OpenInTarget };
    response: { success: boolean };
  };
  "terminal-shell-options": {
    request: undefined;
    response: {
      availableShells: Array<
        ConfigValueByKey[typeof ConfigurationKeys.INTEGRATED_TERMINAL_SHELL]
      >;
    };
  };
  "thread-terminal-snapshot": {
    request: {
      threadId: string;
    };
    response: {
      session: {
        cwd: string;
        shell: string;
        buffer: string;
        truncated: boolean;
      } | null;
    };
  };
  "pick-file": {
    request: {
      pickerTitle: string;
    };
    response: {
      file: FileDescriptor | null;
    };
  };
  "pick-files": {
    request: {
      pickerTitle: string;
    };
    response: {
      files: Array<FileDescriptor>;
    };
  };
  "open-file": {
    request: {
      /**
       * Supported path formats (resolved against the current VS Code workspace):
       * - Absolute filesystem path (POSIX or Windows), e.g. "/Users/alex/src/app.ts" or "C:\\repo\\app.ts".
       * - Workspace-relative path using "/" or "\\", e.g. "src/app.ts".
       * - Git diff paths prefixed with "a/" or "b/" (these prefixes are ignored), e.g. "a/src/app.ts".
       * - Paths that include the workspace folder name as a leading segment, e.g. "my-repo/src/app.ts".
       * - Bare filename or suffix path; a best-effort search will open the first match, e.g. "app.ts" or "src/app.ts".
       *
       * Notes:
       * - This field expects a filesystem path string, not a URI. Schemes like "file://", "vscode://", or "https://" are not accepted.
       */
      path: string;
      /** Optional preferred target; when omitted, the host chooses the preferred target. */
      target?: OpenInTarget | null;
      /** 1-based line number to select (optional). */
      line?: number;
      /** 1-based column number to select (optional, defaults to 1). */
      column?: number;
      /** Base directory to resolve relative paths against; pass null when unavailable. */
      cwd: GitCwd | null;
      /**
       * When this and target are provided, this target will be persisted as the preferred target for this path.
       */
      persistPreferredTargetPath?: string;
    };
    response: { success: boolean };
  };
  "add-context-file": {
    request: {
      path: string;
    };
    response: { success: boolean };
  };
  "git-origins": {
    request:
      | undefined
      | {
          /** Optional host id to resolve git metadata against. */
          hostId?: string;
          /**
           * Optional list of directories to resolve git origins for.
           * When omitted, the workspace root options are used.
           */
          dirs?: Array<string>;
        };
    response: {
      origins: Array<{
        /**
         * If dirs were requested, this will be the directory that was requested.
         * If not, it will be one of the workspace roots.
         * Either is either the same or a subdirectory of the root.
         */
        dir: string;
        root: GitRoot;
        originUrl: string | null;
        commonDir?: string | null;
      }>;
      homeDir: string;
    };
  };
  "git-push": {
    request: GitPushRequest;
    response: GitPushResponse;
  };
  "git-create-branch": {
    request: GitCreateBranchRequest;
    response: GitCreateBranchResponse;
  };
  "git-checkout-branch": {
    request: GitCheckoutBranchRequest;
    response: GitCheckoutBranchResponse;
  };
  "gh-cli-status": {
    request:
      | undefined
      | {
          hostId?: string;
        };
    response: GhCliStatus;
  };
  "gh-pr-create": {
    request: GhCreatePullRequestRequest;
    response: GhCreatePullRequestResponse;
  };
  "gh-pr-board": {
    request: GhPullRequestBoardRequest;
    response: GhPullRequestBoardResponse;
  };
  "gh-pr-status": {
    request: GhPullRequestStatusRequest;
    response: GhPullRequestStatusResponse;
  };
  "gh-pr-merge": {
    request: GhMergePullRequestRequest;
    response: GhMergePullRequestResponse;
  };
  /** Returns the merge-base commit hash between HEAD and the provided base branch. */
  "git-merge-base": {
    request: {
      gitRoot?: string;
      baseBranch: string;
      hostId?: string;
    };
    response: {
      mergeBaseSha: string | null;
    };
  };
  "prepare-worktree-snapshot": {
    request: {
      gitRoot: string;
      snapshotBranch: string | null;
    };
    response: {
      tarballPath: string;
      tarballFilename: string;
      tarballSize: number;
      repoName: string;
      branch: string | null;
      snapshotBranch: string;
      commitSha: string;
      remotes: Record<string, string>;
      contentType: string;
    };
  };
  "upload-worktree-snapshot": {
    request: {
      tarballPath: string;
      uploadUrl: string;
      contentLength: number;
      contentType: string;
    };
    response: { success: boolean };
  };
  "confirm-trace-recording-start": {
    request: undefined;
    response: { success: boolean };
  };
  "cancel-trace-recording-start": {
    request: undefined;
    response: { success: boolean };
  };
  "submit-trace-recording-details": {
    request: {
      note: string;
      conversationId: string | null;
    };
    response: { success: boolean };
  };
  "get-configuration": {
    request: {
      key: (typeof ConfigurationKeys)[keyof typeof ConfigurationKeys];
    };
    response: {
      value: unknown;
    };
  };
  "set-configuration": {
    request: {
      key: ConfigurationKey;
      value: ConfigValueByKey[ConfigurationKey];
    };
    response: { success: boolean };
  };
  "get-global-state": {
    request: {
      key: (typeof GlobalStateKey)[keyof typeof GlobalStateKey];
    };
    response: {
      value: unknown;
    };
  };
  "set-global-state": {
    request: {
      key: (typeof GlobalStateKey)[keyof typeof GlobalStateKey];
      value: unknown;
    };
    response: { success: boolean };
  };
  /**
   * Set a VS Code context key in the workbench. Useful for keybindings/menus.
   */
  "set-vs-context": {
    request: {
      key: string;
      value?: string | boolean;
    };
    response: { success: boolean };
  };
  "get-copilot-api-proxy-info": {
    request: undefined;
    response: {
      baseUrl: string;
      /** Value of the API key. */
      secret: string;
    } | null;
  };
  "mcp-codex-config": {
    request: undefined;
    response: {
      config: CodexConfig | null;
    };
  };
  "worktree-shell-environment-config": {
    request: {
      cwd: string;
    };
    response: {
      shellEnvironment: {
        version: 1;
        set: Record<string, string>;
        exclude: Array<string>;
      } | null;
    };
  };
  "is-copilot-api-available": {
    request: undefined;
    response: {
      available: boolean;
    };
  };
};

// This enforces that all of the VSCodeFetchRequest and VSCodeMutationRequest keys have a request and response.
type AssertSubtype<_Sub extends Super, Super> = true;
type BaseVSCodeFetchRequest = {
  request: unknown;
  response: unknown;
};
type _AssertAllVSCodeRequestsHaveRequestAndResponse = AssertSubtype<
  VSCodeFetchRequest,
  Record<string, BaseVSCodeFetchRequest>
>;
type _AssertHotkeyWindowMutationStateMatchesQueryResponse = AssertSubtype<
  HotkeyWindowHotkeyMutationResponse["state"],
  VSCodeFetchRequest["hotkey-window-hotkey-state"]["response"]
>;
declare const _useAssertRequest: _AssertAllVSCodeRequestsHaveRequestAndResponse;
declare const _useAssertHotkeyWindowMutationStateMatchesQueryResponse: _AssertHotkeyWindowMutationStateMatchesQueryResponse;
