import { QueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import type { ThreadStartResponse } from "app-server-types/v2";
import {
  applyPatches,
  castDraft,
  current,
  enablePatches,
  produce,
  produceWithPatches,
  type Patch,
  type WritableDraft,
} from "immer";
import findLast from "lodash/findLast";
import isEqual from "lodash/isEqual";
import last from "lodash/last";
import type {
  AgentMode,
  AppServerConnectionState,
  AppServerNotificationParamsForMethod,
  AppServerWebviewNotification,
  AppServerWebviewNotificationMethod,
  AppStateSnapshotFields,
  AppStateSnapshotReason,
  ConversationId,
  ImmerPatch,
  IpcRequestMessageContent,
  McpRequestId,
  PermissionsConfig,
  QueuedFollowUpMessage,
  QueuedFollowUpState,
  ThreadStreamStateChange,
  ThreadTitleState,
} from "protocol";
import {
  applyFeatureOverridesToThreadStartParams,
  buildWorkspaceWritePermissionsConfig,
  buildNewConversationParams,
  buildPermissionsConfigForMode,
  createConversationId,
  createDeferred,
  createMcpRequestId,
  filterFeatureOverridesForDesktopThreadStart,
  getIpcMessageVersion,
  INTERACTIVE_THREAD_SOURCE_KINDS,
} from "protocol";
import { v4 as uuidv4 } from "uuid";

import { registerIpcBroadcastHandler } from "@/ipc-broadcast";
import { ipcRequest } from "@/ipc-request";
import { getPendingRequestFromConversation } from "@/local-conversation/pending-request";
import {
  removePendingRequestForConversation,
  setPendingRequestForConversation,
} from "@/local-conversation/pending-request-atom";
import { messageBus } from "@/message-bus";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { terminalService } from "@/terminal/terminal-service";
import { ensureLength } from "@/utils/ensure-length";
import { getDefaultServiceTierValue } from "@/utils/local-service-tier";
import { logger } from "@/utils/logger";
import { codexQueryClientConfig } from "@/utils/query-client";
import { coerceServiceTier } from "@/utils/service-tier";
import type { DeepReadonly } from "@/utils/types";
import { fetchFromVSCode } from "@/vscode-api";

import {
  replyWithMcpServerElicitationResponse as replyWithMcpServerElicitationResponseAction,
  replyWithCommandExecutionApprovalDecision as replyWithCommandExecutionApprovalDecisionAction,
  replyWithFileChangeApprovalDecision as replyWithFileChangeApprovalDecisionAction,
  replyWithUserInputResponse as replyWithUserInputResponseAction,
  type ApprovalActionContext,
} from "./app-server-approval-actions";
import {
  DEFAULT_TIMEOUT_MS,
  OUTPUT_DELTA_FLUSH_INTERVAL_MS,
  OWNER_WINDOW_ERROR,
  RECENT_CONVERSATIONS_PAGE_SIZE,
  WINDOWS_SANDBOX_SETUP_TIMEOUT_MS,
  WINDOWS_SANDBOX_SETUP_TIMEOUT_TOMBSTONE_MS,
} from "./app-server-manager-constants";
import type {
  AppServerConfigNotice,
  ApprovalRequestEvent,
  AppServerConversationState,
  AppServerConversationTurn,
  CliResponse,
  CliRequest,
  LocalTurnStartParams,
  NotificationCallback,
  ReviewPaneSnapshotMetrics,
  StartConversationParams,
  StreamRole,
  ThreadSearchResult,
  TurnCompletedEvent,
  UserInputRequestEvent,
  WindowsSandboxSetupCompletion,
} from "./app-server-manager-types";
import type { LoginId } from "./app-server-notification-schema";
import { handleTurnDirectives as handleTurnDirectivesAction } from "./app-server-turn-directives";
import { appendCappedOutput } from "./append-capped-output";
import { PLAN_IMPLEMENTATION_REQUEST_METHOD } from "./conversation-request";
import {
  FrameTextDeltaQueue,
  type TextDeltaEntry,
} from "./frame-text-delta-queue";
import {
  FuzzyFileSearchController,
  type FuzzySearchSession,
} from "./fuzzy-file-search-controller";
import type { ItemForType, StoredUserMessageItem } from "./item-schema";
import {
  buildMcpServerElicitationResponse,
  getMcpServerElicitation,
} from "./mcp-server-elicitation";
import { OutputDeltaQueue } from "./output-delta-queue";
import {
  findMatchingPendingSteerIndex,
  INTERRUPTED_PENDING_STEER_PAUSED_REASON,
  pendingSteerTargetsTurn,
  type PendingSteerState,
} from "./pending-steer";
import { PrewarmedThreadManager } from "./prewarmed-thread-manager";
import { applyWorktreeShellEnvironmentConfig as applyWorktreeShellEnvironmentConfigRequest } from "./requests/apply-worktree-shell-environment-config";
import {
  archiveConversation as archiveConversationRequest,
  interruptSubagentDescendants as interruptSubagentDescendantsRequest,
  performArchiveConversation as performArchiveConversationRequest,
  type ArchiveConversationContext,
  type ArchiveConversationOptions,
  unarchiveConversation as unarchiveConversationRequest,
} from "./requests/archive-conversation";
import { editLastUserTurn } from "./requests/edit-last-user-turn";
import {
  forkConversationFromLatest as forkConversationFromLatestRequest,
  type ForkConversationFromLatestParams,
} from "./requests/fork-conversation-from-latest";
import {
  forkConversationFromTurn as forkConversationFromTurnRequest,
  type ForkConversationFromTurnParams,
} from "./requests/fork-conversation-from-turn";
import { listAllThreads as listAllThreadsRequest } from "./requests/list-threads";
import {
  installPlugin as installPluginRequest,
  listPlugins as listPluginsRequest,
  readPlugin as readPluginRequest,
  uninstallPlugin as uninstallPluginRequest,
} from "./requests/plugins";
import { searchThreads as searchThreadsRequest } from "./requests/search-threads";
import { startTurn } from "./requests/start-turn";
import { steerTurn } from "./requests/steer-turn";
import {
  generateConversationTitle as generateConversationTitleRequest,
  renameConversationTitle as renameConversationTitleRequest,
  setThreadTitle as setThreadTitleRequest,
} from "./requests/thread-title";
import { updateThreadGitBranch as updateThreadGitBranchRequest } from "./requests/update-thread-git-branch";
import {
  addCloudTaskSyntheticItem as addCloudTaskSyntheticItemAction,
  addPersonalityChangeSyntheticItem as addPersonalityChangeSyntheticItemAction,
  removePlanImplementationRequest as removePlanImplementationRequestAction,
  setPlanImplementationRequest,
  setPlanImplementationSyntheticItem,
} from "./synthetic-items";
import {
  buildDynamicToolFailureResponse,
  buildReadThreadTerminalToolResponse,
  hasReadableThreadTerminalSnapshot,
  READ_THREAD_TERMINAL_TOOL,
  READ_THREAD_TERMINAL_TOOL_NAME,
  validateReadThreadTerminalToolArguments,
} from "./thread-terminal-dynamic-tool";
import { broadcastQueuedFollowUpsChanged } from "./utils/broadcast-queued-follow-ups-changed";
import { buildApprovalActionContext } from "./utils/build-approval-action-context";
import {
  normalizeIncomingThreadItem,
  registerAgentNicknameFromThread,
  registerThreadMetadata as registerCollabThreadMetadata,
} from "./utils/collab-agent-tool-call-item";
import { collectAppStateMetrics } from "./utils/collect-app-state-metrics";
import {
  conversationMetaSnapshotEqual,
  type ConversationMetaSnapshot,
} from "./utils/conversation-meta-snapshot";
import { conversationsOrderKey } from "./utils/conversations-order-key";
import { createConversationStateFromThread } from "./utils/create-conversation-state-from-thread";
import { deserializeConversationState } from "./utils/deserialize-conversation-state";
import { ensureTurnDefaults } from "./utils/ensure-turn-defaults";
import { findItem } from "./utils/find-item";
import { findTurnForEvent } from "./utils/find-turn-for-event";
import { getConversationCwd } from "./utils/get-conversation-cwd";
import { getConversationIdForMcpParams } from "./utils/get-conversation-id-for-mcp-params";
import { getSubagentTitlePrompt } from "./utils/get-subagent-title-prompt";
import { getThreadConversationTimestamps } from "./utils/get-thread-conversation-timestamps";
import { getThreadIdForMutationEvent } from "./utils/get-thread-id-for-mutation-event";
import { handleAutomaticApprovalReviewNotification } from "./utils/handle-automatic-approval-review-notification";
import { upsertHookRunIntoTurn } from "./utils/hook-items";
import { inlineSkillIconForExtension } from "./utils/inline-skill-icon-for-extension";
import { isLocalConversationInProgress } from "./utils/is-local-conversation-in-progress";
import { requestHostAppStateSnapshot as snapshotState } from "./utils/request-host-app-state-snapshot";
import { getThreadTitle } from "./utils/thread-search";
import {
  cacheThreadTitle,
  getCachedThreadTitle,
  invalidateThreadSearchQueries as invalidateSearch,
  loadThreadTitleState,
} from "./utils/thread-search-query-cache";
import { toConversationMetaSnapshot } from "./utils/to-conversation-meta-snapshot";
import { upsertItem } from "./utils/upsert-item";
import { upsertMcpServerElicitationSyntheticItem } from "./utils/upsert-mcp-server-elicitation-synthetic-item";
import { upsertUserInputResponseSyntheticItem } from "./utils/upsert-user-input-response-synthetic-item";
import { WebviewSampler, type AppStateMetrics } from "./webview-sampler";

enablePatches();

const MAX_CONFIG_NOTICES = 20;

export class AppServerManager {
  private readonly requestPromises = new Map<
    McpRequestId,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      method: string;
      startedAtMs: number;
      conversationId: string | null;
      timeoutMs: number;
    }
  >();
  private defaultFeatureOverrides: Record<string, boolean> | null = null;
  private personality: AppServer.Personality | null = null;
  private readonly conversations = new Map<
    ConversationId,
    AppServerConversationState
  >();
  private readonly threadsById = new Map<string, AppServer.v2.Thread>();
  private readonly pendingCollabThreadReads = new Set<string>();
  private readonly archivingConversationIds = new Set<ConversationId>();
  private sortedConversations: Array<AppServerConversationState> | null = null;
  private sortedConversationIndexById = new Map<ConversationId, number>();
  private readonly streamingConversations = new Set<ConversationId>();
  private readonly processedDirectiveTurnKeys = new Set<string>();
  private readonly streamRoles = new Map<ConversationId, StreamRole>();
  private readonly conversationCallbacks = new Map<
    ConversationId,
    Array<(state: AppServerConversationState) => void>
  >();
  private recentConversationsPageCount = 1;
  private recentConversationsNextCursor: string | null = null;
  private recentConversationsSortKey: AppServer.v2.ThreadSortKey = "updated_at";
  public hasFetchedRecentConversations = false;
  private recentConversationIds: Array<ConversationId> = [];
  private pinnedConversationIds = new Set<ConversationId>();
  private readonly suppressedArchivedConversationIds =
    new Set<ConversationId>();
  private recentConversationCwdsCache: Array<string> = [];
  private recentConversationCwdsCacheKey = "";
  private anyConversationCallbacks: Array<
    (state: Array<AppServerConversationState>) => void
  > = [];
  private anyConversationMetaCallbacks: Array<
    (state: Array<AppServerConversationState>) => void
  > = [];
  private lastAnySnapshotById = new Map<
    ConversationId,
    ConversationMetaSnapshot
  >();
  private lastAnyOrderKey: string | null = null;
  private lastMetaSnapshotById = new Map<
    ConversationId,
    ConversationMetaSnapshot
  >();
  private lastMetaOrderKey: string | null = null;
  private turnCompletedListeners: Array<(evt: TurnCompletedEvent) => void> = [];
  private approvalRequestListeners: Array<(evt: ApprovalRequestEvent) => void> =
    [];
  private userInputRequestListeners: Array<
    (evt: UserInputRequestEvent) => void
  > = [];
  private readonly notificationCallbacks = new Map<
    AppServerWebviewNotificationMethod,
    Array<(notification: AppServerWebviewNotification) => void>
  >();
  private readonly outputDeltaQueue: OutputDeltaQueue<ConversationId>;
  private readonly frameTextDeltaQueue: FrameTextDeltaQueue<ConversationId>;
  private readonly webviewSampler: WebviewSampler;
  private readonly hostId: string;
  private connectionState: AppServerConnectionState = "disconnected";
  private mostRecentErrorMessage: string | null = null;
  private reviewPaneSnapshotMetrics: ReviewPaneSnapshotMetrics = {
    reviewDiffFilesTotal: 0,
    reviewDiffLinesTotal: 0,
    reviewDiffBytesEstimate: 0,
  };
  private readonly prewarmedThreadManager = new PrewarmedThreadManager();
  private readonly queryClient: QueryClient;

  constructor(
    hostId: string,
    queryClient: QueryClient = new QueryClient(codexQueryClientConfig),
  ) {
    this.hostId = hostId;
    this.queryClient = queryClient;
    this.webviewSampler = new WebviewSampler({
      enabled:
        __WINDOW_TYPE__ === "electron" && import.meta.env.MODE !== "test",
      getMetrics: (): AppStateMetrics =>
        collectAppStateMetrics({
          conversations: this.conversations,
          recentConversationIds: this.recentConversationIds,
          streamingConversations: this.streamingConversations,
          requestPromises: this.requestPromises,
          reviewPaneSnapshotMetrics: this.reviewPaneSnapshotMetrics,
        }),
    });
    this.fuzzyFileSearchController = new FuzzyFileSearchController(
      (method, params) => this.sendRequest(method, params),
    );

    this.outputDeltaQueue = new OutputDeltaQueue({
      flushIntervalMs: OUTPUT_DELTA_FLUSH_INTERVAL_MS,
      onFlush: (entries): void => {
        for (const entry of entries) {
          this.applyOutputDelta(
            entry.conversationId,
            entry.turnId,
            entry.itemId,
            entry.delta,
          );
        }
      },
    });
    this.frameTextDeltaQueue = new FrameTextDeltaQueue({
      onFlush: (entries): void => {
        this.applyFrameTextDeltas(entries);
      },
    });

    registerIpcBroadcastHandler(
      "thread-stream-state-changed",
      (message): void => {
        this.handleThreadStreamStateChanged(
          message.params.conversationId,
          message.params.change,
          message.sourceClientId,
        );
      },
    );
    registerIpcBroadcastHandler("thread-archived", (message): void => {
      if (message.params.hostId !== this.hostId) {
        return;
      }
      this.handleThreadArchived(message.params.conversationId);
    });
    registerIpcBroadcastHandler("thread-unarchived", (message): void => {
      if (message.params.hostId !== this.hostId) {
        return;
      }
      void this.handleThreadUnarchived(message.params.conversationId);
    });
    registerIpcBroadcastHandler("client-status-changed", (message): void => {
      if (message.params.status !== "connected") {
        return;
      }
      for (const conversationId of this.streamingConversations) {
        this.broadcastConversationSnapshot(conversationId);
      }
    });
  }

  getHostId(): string {
    return this.hostId;
  }

  setConnectionState(
    state: AppServerConnectionState,
    mostRecentErrorMessage?: string | null,
    source = "unknown",
  ): void {
    logger.info("remote_connections.manager_state_set", {
      safe: {
        hostId: this.hostId,
        source,
        previousState: this.connectionState,
        nextState: state,
      },
      sensitive: {
        previousErrorMessage: this.mostRecentErrorMessage,
        nextErrorMessage:
          mostRecentErrorMessage === undefined
            ? (this.mostRecentErrorMessage ?? null)
            : mostRecentErrorMessage,
      },
    });
    this.connectionState = state;
    this.mostRecentErrorMessage =
      mostRecentErrorMessage === undefined
        ? (this.mostRecentErrorMessage ?? null)
        : mostRecentErrorMessage;
    this.notifyAnyConversationCallbacks({ forceAny: true, forceMeta: true });
  }

  getConnectionState(): AppServerConnectionState {
    return this.connectionState;
  }

  getMostRecentErrorMessage(): string | null {
    return this.mostRecentErrorMessage;
  }

  getStreamRole(conversationId: ConversationId): StreamRole | null {
    return this.streamRoles.get(conversationId) ?? null;
  }

  getThreadRole(conversationId: ConversationId): "owner" | "follower" {
    return this.getStreamRole(conversationId)?.role === "owner"
      ? "owner"
      : "follower";
  }

  assertThreadFollowerOwner(conversationId: ConversationId): void {
    if (this.getStreamRole(conversationId)?.role !== "owner") {
      throw new Error(OWNER_WINDOW_ERROR);
    }
  }

  setDefaultFeatureOverrides(overrides: Record<string, boolean> | null): void {
    this.defaultFeatureOverrides = overrides;
  }

  setPersonality(personality: AppServer.Personality | null): void {
    this.personality = personality;
  }

  getPersonality(): DeepReadonly<AppServer.Personality> | null {
    return this.personality;
  }

  getEffectiveServiceTier(
    serviceTier: AppServer.ServiceTier | null | undefined,
  ): AppServer.ServiceTier | null | undefined {
    if (serviceTier === undefined) {
      return undefined;
    }
    return coerceServiceTier(serviceTier);
  }

  private activeLogin?: {
    loginId: LoginId;
    finished: boolean;
    stopRemotePortForward?: () => Promise<void>;
    complete: (data: {
      loginId: LoginId;
      success: boolean;
      error?: string;
    }) => void;
  };
  private activeWindowsSandboxSetup?: {
    mode: AppServer.v2.WindowsSandboxSetupMode;
    finished: boolean;
    timeoutId: ReturnType<typeof setTimeout> | null;
    complete: (result: WindowsSandboxSetupCompletion) => void;
    fail: (error: Error) => void;
  };
  private timedOutWindowsSandboxSetup?: {
    [mode in AppServer.v2.WindowsSandboxSetupMode]?: number;
  };

  private authStatusCallbacks: Array<
    (status: { authMethod: AppServer.AuthMode | null }) => void
  > = [];
  private configNoticeCallbacks: Array<() => void> = [];
  private configNotices: Array<AppServerConfigNotice> = [];
  private mcpLoginCallbacks: Array<
    (data: { name: string; success: boolean; error?: string }) => void
  > = [];
  private readonly fuzzyFileSearchController: FuzzyFileSearchController;
  private readonly mcpServerStatusPromises = new Map<
    string,
    Promise<AppServer.v2.ListMcpServerStatusResponse>
  >();

  addAuthStatusCallback(
    cb: (status: { authMethod: AppServer.AuthMode | null }) => void,
  ): void {
    this.authStatusCallbacks.push(cb);
  }

  removeAuthStatusCallback(
    cb: (status: { authMethod: AppServer.AuthMode | null }) => void,
  ): void {
    this.authStatusCallbacks = this.authStatusCallbacks.filter((c) => c !== cb);
  }

  getConfigNotices(): Array<AppServerConfigNotice> {
    return this.configNotices;
  }

  addConfigNoticeCallback(cb: () => void): () => void {
    this.configNoticeCallbacks.push(cb);
    return () => this.removeConfigNoticeCallback(cb);
  }

  removeConfigNoticeCallback(cb: () => void): void {
    this.configNoticeCallbacks = this.configNoticeCallbacks.filter(
      (c) => c !== cb,
    );
  }

  addMcpLoginCallback(
    cb: (data: { name: string; success: boolean; error?: string }) => void,
  ): () => void {
    this.mcpLoginCallbacks.push(cb);
    return () => this.removeMcpLoginCallback(cb);
  }

  removeMcpLoginCallback(
    cb: (data: { name: string; success: boolean; error?: string }) => void,
  ): void {
    this.mcpLoginCallbacks = this.mcpLoginCallbacks.filter((c) => c !== cb);
  }

  async loadThreadTitleCache(forceRefresh = false): Promise<ThreadTitleState> {
    return loadThreadTitleState({
      queryClient: this.queryClient,
      forceRefresh,
    });
  }

  private getCachedThreadTitle(conversationId: ConversationId): string | null {
    return getCachedThreadTitle({
      conversationId,
      queryClient: this.queryClient,
    });
  }

  cacheThreadTitle(conversationId: ConversationId, title: string): void {
    cacheThreadTitle({
      conversationId,
      queryClient: this.queryClient,
      title,
    });
  }

  applyThreadTitleStateUpdateAndNotify(
    conversation: AppServerConversationState,
  ): void {
    this.setConversation(conversation);
    this.notifyConversationCallbacks(conversation.id);
    const conversations = this.getRecentConversations();
    for (const callback of this.anyConversationCallbacks) {
      callback(conversations);
    }
  }

  async setThreadTitle(
    conversationId: ConversationId,
    title: string,
  ): Promise<void> {
    await setThreadTitleRequest(this, conversationId, title);
    invalidateSearch({
      hostId: this.hostId,
      queryClient: this.queryClient,
    });
  }

  async renameConversationTitle(
    conversationId: ConversationId,
    title: string,
  ): Promise<void> {
    await renameConversationTitleRequest(this, conversationId, title);
    invalidateSearch({
      hostId: this.hostId,
      queryClient: this.queryClient,
    });
  }

  private async hydrateCollabThreads(
    receiverThreadIds: Array<string>,
  ): Promise<void> {
    await this.loadThreadTitleCache();
    const missingThreadIds: Array<string> = [];
    for (const threadId of receiverThreadIds) {
      const conversationId = createConversationId(threadId);
      if (this.archivingConversationIds.has(conversationId)) {
        continue;
      }
      const existingThread = this.threadsById.get(threadId);
      if (existingThread) {
        if (this.conversations.has(conversationId)) {
          continue;
        }
        this.upsertHydratedCollabReceiverConversation(existingThread);
        continue;
      }
      if (this.pendingCollabThreadReads.has(threadId)) {
        continue;
      }
      missingThreadIds.push(threadId);
    }
    if (missingThreadIds.length === 0) {
      return;
    }

    for (const threadId of missingThreadIds) {
      this.pendingCollabThreadReads.add(threadId);
    }

    void Promise.all(
      missingThreadIds.map(async (threadId) => {
        try {
          const response = await this.sendRequest("thread/read", {
            threadId,
            includeTurns: false,
          } satisfies AppServer.v2.ThreadReadParams);
          if (
            this.archivingConversationIds.has(createConversationId(threadId))
          ) {
            return;
          }
          this.upsertHydratedCollabReceiverConversation(response.thread);
        } catch (error) {
          logger.debug("Failed to hydrate collab receiver thread", {
            safe: { threadId },
            sensitive: { error },
          });
        } finally {
          this.pendingCollabThreadReads.delete(threadId);
        }
      }),
    );
  }

  private upsertHydratedCollabReceiverConversation(
    thread: AppServer.v2.Thread,
  ): ConversationId {
    const conversationId = createConversationId(thread.id);
    const threadName = thread.name?.trim() ?? "";
    if (this.archivingConversationIds.has(conversationId)) {
      return conversationId;
    }
    this.ensureRecentConversationId(conversationId);

    registerCollabThreadMetadata({
      thread,
      threadsById: this.threadsById,
      conversations: this.conversations,
      updateConversationState: this.updateConversationState.bind(this),
    });
    const existing = this.conversations.get(conversationId);
    const cachedTitle = threadName || this.getCachedThreadTitle(conversationId);
    const shouldAutoName = !existing && !cachedTitle;
    const { updatedAt } = getThreadConversationTimestamps(thread);
    if (existing) {
      const nextState = produce(existing, (draft) => {
        draft.rolloutPath = thread.path || draft.rolloutPath;
        draft.cwd = thread.cwd || draft.cwd;
        draft.source = thread.source;
        draft.gitInfo = thread.gitInfo ?? draft.gitInfo;
        draft.updatedAt = Math.max(draft.updatedAt, updatedAt);
        if (!draft.title && cachedTitle) {
          draft.title = cachedTitle;
        }
        if (draft.turns.length === 0) {
          draft.resumeState = "needs_resume";
        }
      });
      this.setConversation(nextState);
      this.notifyConversationCallbacks(conversationId);
      return conversationId;
    }

    this.setConversation(
      createConversationStateFromThread({
        thread,
        hostId: this.hostId,
        conversationId,
        turns: [],
        cachedTitle,
        resumeState: "needs_resume",
        latestCollaborationMode: {
          mode: "default",
          settings: {
            reasoning_effort: "medium",
            model: "gpt-5.2-codex",
            developer_instructions: null,
          },
        },
      }),
    );
    this.notifyConversationCallbacks(conversationId);
    if (shouldAutoName) {
      const prompt = getSubagentTitlePrompt({
        conversationId,
        conversations: this.conversations,
      });
      void this.generateConversationTitle(
        conversationId,
        [{ type: "text", text: prompt, text_elements: [] }],
        thread.cwd ?? null,
      );
    }
    return conversationId;
  }

  private upsertConversationFromThread(
    thread: AppServer.v2.Thread,
  ): ConversationId {
    registerAgentNicknameFromThread(thread);
    const conversationId = createConversationId(thread.id);
    const threadName = thread.name?.trim() ?? "";
    this.ensureRecentConversationId(conversationId);
    const cachedTitle = threadName || this.getCachedThreadTitle(conversationId);
    const { updatedAt } = getThreadConversationTimestamps(thread);
    const gitInfo = thread.gitInfo;
    const existing = this.conversations.get(conversationId);
    const shouldAutoName = !existing && !cachedTitle;
    if (existing) {
      const nextState = produce(existing, (draft) => {
        draft.rolloutPath = thread.path || draft.rolloutPath;
        draft.cwd = thread.cwd || draft.cwd;
        draft.source = thread.source;
        draft.gitInfo = gitInfo ?? draft.gitInfo;
        draft.resumeState = "resumed";
        draft.updatedAt = updatedAt;
        if (!draft.title && cachedTitle) {
          draft.title = cachedTitle;
        }
      });
      this.setConversation(nextState);
      this.notifyConversationCallbacks(conversationId);
    } else {
      this.setConversation(
        createConversationStateFromThread({
          thread,
          hostId: this.hostId,
          conversationId,
          turns: [],
          cachedTitle,
          resumeState: "resumed",
          latestCollaborationMode: {
            mode: "default",
            settings: {
              model: "",
              reasoning_effort: null,
              developer_instructions: null,
            },
          },
        }),
      );
      this.notifyConversationCallbacks(conversationId);
    }
    this.markConversationStreaming(conversationId);
    if (shouldAutoName) {
      void this.generateConversationTitle(
        conversationId,
        [{ type: "text", text: thread.preview, text_elements: [] }],
        thread.cwd ?? null,
      );
    }
    return conversationId;
  }

  private updateTurnState(
    conversationId: ConversationId,
    turnId: string | null,
    updater: (turn: WritableDraft<AppServerConversationTurn>) => void,
    shouldBroadcast = true,
    findTurnOptions?: Parameters<typeof findTurnForEvent>[2],
  ): void {
    this.updateConversationState(
      conversationId,
      (draft) => {
        const targetTurn = findTurnForEvent(draft, turnId, findTurnOptions);
        if (!targetTurn) {
          return;
        }
        ensureTurnDefaults(targetTurn);
        updater(targetTurn);
      },
      shouldBroadcast,
    );
  }

  getConversation(
    conversationId: ConversationId,
  ): AppServerConversationState | null {
    return this.conversations.get(conversationId) ?? null;
  }

  registerPendingSteer(
    conversationId: ConversationId,
    pendingSteer: PendingSteerState,
  ): void {
    this.updateConversationState(conversationId, (draft) => {
      draft.pendingSteers = [...(draft.pendingSteers ?? []), pendingSteer];
    });
  }

  removePendingSteer(
    conversationId: ConversationId,
    pendingSteerId: string,
  ): void {
    this.updateConversationState(conversationId, (draft) => {
      draft.pendingSteers = (draft.pendingSteers ?? []).filter(
        (pendingSteer) => pendingSteer.id !== pendingSteerId,
      );
    });
  }

  setPendingSteerTurnId(
    conversationId: ConversationId,
    pendingSteerId: string,
    turnId: string,
  ): void {
    this.updateConversationState(conversationId, (draft) => {
      const pendingSteer = (draft.pendingSteers ?? []).find(
        (candidate) => candidate.id === pendingSteerId,
      );
      if (!pendingSteer) {
        return;
      }
      pendingSteer.targetTurnId = turnId;
    });
  }

  isConversationStreaming(conversationId: ConversationId): boolean {
    return this.streamingConversations.has(conversationId);
  }

  isConversationArchiving(conversationId: ConversationId): boolean {
    return this.archivingConversationIds.has(conversationId);
  }

  isConversationSuppressedAfterArchive(
    conversationId: ConversationId,
  ): boolean {
    return this.suppressedArchivedConversationIds.has(conversationId);
  }

  getConversationOrThrow(
    conversationId: ConversationId,
  ): AppServerConversationState {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    return conversation;
  }

  getConversations(): Array<AppServerConversationState> {
    const conversations =
      this.sortedConversations ?? this.rebuildConversationCache();
    return conversations.slice();
  }

  getRecentConversations(): Array<AppServerConversationState> {
    const conversations: Array<AppServerConversationState> = [];
    for (const conversationId of this.recentConversationIds) {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversations.push(conversation);
      }
    }
    return conversations.sort((first, second) => {
      switch (this.recentConversationsSortKey) {
        case "created_at":
          return second.createdAt - first.createdAt;
        case "updated_at":
          return second.updatedAt - first.updatedAt;
      }
    });
  }

  getRecentConversationCwds(): Array<string> {
    const cwdSet = new Set<string>();
    for (const conversationId of this.recentConversationIds) {
      const conversation = this.conversations.get(conversationId);
      if (!conversation?.cwd) {
        continue;
      }
      cwdSet.add(conversation.cwd);
    }
    const cwds = Array.from(cwdSet);
    cwds.sort();
    const cacheKey = cwds.join("\n");
    if (cacheKey === this.recentConversationCwdsCacheKey) {
      return this.recentConversationCwdsCache;
    }
    this.recentConversationCwdsCacheKey = cacheKey;
    this.recentConversationCwdsCache = cwds;
    return cwds;
  }

  getUnreadLocalConversationCount(
    excludeConversationIds?: Array<ConversationId>,
  ): number {
    const excludeSet =
      excludeConversationIds && excludeConversationIds.length > 0
        ? new Set(excludeConversationIds)
        : null;
    let unreadCount = 0;
    for (const conversationId of this.recentConversationIds) {
      if (excludeSet != null && excludeSet.has(conversationId)) {
        continue;
      }
      const conversation = this.conversations.get(conversationId);
      if (conversation?.hasUnreadTurn) {
        unreadCount += 1;
      }
    }
    return unreadCount;
  }

  getHasInProgressLocalConversation(): boolean {
    for (const conversationId of this.recentConversationIds) {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        continue;
      }
      if (isLocalConversationInProgress(conversation)) {
        return true;
      }
    }
    return false;
  }

  private rebuildConversationCache(): Array<AppServerConversationState> {
    const sorted = [...this.conversations.values()].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    this.sortedConversations = sorted;
    this.sortedConversationIndexById.clear();
    sorted.forEach((conversation, index) => {
      this.sortedConversationIndexById.set(conversation.id, index);
    });
    return sorted;
  }

  setConversation(conversation: AppServerConversationState): void {
    const nextConversation = {
      ...conversation,
      hostId:
        conversation.hostId === this.hostId ? conversation.hostId : this.hostId,
      pendingSteers: conversation.pendingSteers ?? [],
    };
    this.conversations.set(nextConversation.id, nextConversation);
    this.upsertConversationCache(nextConversation);
    const pendingRequest = getPendingRequestFromConversation(nextConversation);
    setPendingRequestForConversation(nextConversation.id, pendingRequest);
  }

  ensureRecentConversationId(conversationId: ConversationId): void {
    if (!this.recentConversationIds.includes(conversationId)) {
      this.recentConversationIds.unshift(conversationId);
    }
  }

  private upsertConversationCache(
    conversation: AppServerConversationState,
  ): void {
    const conversations = this.sortedConversations;
    if (!conversations) {
      return;
    }
    const existingIndex = this.sortedConversationIndexById.get(conversation.id);
    if (existingIndex == null) {
      this.insertConversationCache(conversation);
      return;
    }
    const existing = conversations[existingIndex];
    if (existing && existing.createdAt !== conversation.createdAt) {
      this.removeConversationFromSortedCache(conversation.id);
      this.insertConversationCache(conversation);
      return;
    }
    conversations[existingIndex] = conversation;
  }

  private insertConversationCache(
    conversation: AppServerConversationState,
  ): void {
    const conversations = this.sortedConversations;
    if (!conversations) {
      return;
    }
    const createdAt = conversation.createdAt;
    let low = 0;
    let high = conversations.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (conversations[mid].createdAt >= createdAt) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    conversations.splice(low, 0, conversation);
    for (let index = low; index < conversations.length; index += 1) {
      this.sortedConversationIndexById.set(conversations[index].id, index);
    }
  }

  private removeConversationFromSortedCache(
    conversationId: ConversationId,
  ): void {
    const conversations = this.sortedConversations;
    if (!conversations) {
      return;
    }
    const existingIndex = this.sortedConversationIndexById.get(conversationId);
    if (existingIndex == null) {
      return;
    }
    conversations.splice(existingIndex, 1);
    this.sortedConversationIndexById.delete(conversationId);
    for (let index = existingIndex; index < conversations.length; index += 1) {
      this.sortedConversationIndexById.set(conversations[index].id, index);
    }
  }

  addAnyConversationCallback(
    callback: (state: Array<AppServerConversationState>) => void,
  ): () => void {
    this.anyConversationCallbacks.push(callback);
    return () => {
      this.removeAnyConversationCallback(callback);
    };
  }

  addAnyConversationMetaCallback(
    callback: (state: Array<AppServerConversationState>) => void,
  ): () => void {
    this.anyConversationMetaCallbacks.push(callback);
    return () => {
      this.removeAnyConversationMetaCallback(callback);
    };
  }

  removeAnyConversationCallback(
    callback: (state: Array<AppServerConversationState>) => void,
  ): void {
    this.anyConversationCallbacks = this.anyConversationCallbacks.filter(
      (c) => c !== callback,
    );
  }

  removeAnyConversationMetaCallback(
    callback: (state: Array<AppServerConversationState>) => void,
  ): void {
    this.anyConversationMetaCallbacks =
      this.anyConversationMetaCallbacks.filter((c) => c !== callback);
  }

  addTurnCompletedListener(
    listener: (evt: TurnCompletedEvent) => void,
  ): () => void {
    this.turnCompletedListeners.push(listener);
    return () => {
      this.turnCompletedListeners = this.turnCompletedListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  addApprovalRequestListener(
    listener: (evt: ApprovalRequestEvent) => void,
  ): () => void {
    this.approvalRequestListeners.push(listener);
    return () => {
      this.approvalRequestListeners = this.approvalRequestListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  addUserInputRequestListener(
    listener: (evt: UserInputRequestEvent) => void,
  ): () => void {
    this.userInputRequestListeners.push(listener);
    return () => {
      this.userInputRequestListeners = this.userInputRequestListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  addConversationCallback(
    conversationId: ConversationId,
    callback: (state: AppServerConversationState) => void,
  ): () => void {
    const callbacks = this.conversationCallbacks.get(conversationId) ?? [];
    this.conversationCallbacks.set(conversationId, [...callbacks, callback]);
    return () => {
      this.removeConversationCallback(conversationId, callback);
    };
  }

  removeConversationCallback(
    conversationId: ConversationId,
    callback: (state: AppServerConversationState) => void,
  ): void {
    const callbacks = this.conversationCallbacks.get(conversationId);
    if (callbacks) {
      this.conversationCallbacks.set(
        conversationId,
        callbacks.filter((c) => c !== callback),
      );
    }
  }

  addNotificationCallback<M extends AppServerWebviewNotificationMethod>(
    methods: M | ReadonlyArray<M>,
    callback: NotificationCallback<M>,
  ): () => void {
    const methodList = Array.isArray(methods) ? methods : [methods];
    const storedCallback = callback as (
      notification: AppServerWebviewNotification,
    ) => void;

    for (const method of methodList) {
      const callbacks = this.notificationCallbacks.get(method) ?? [];
      this.notificationCallbacks.set(method, [...callbacks, storedCallback]);
    }

    return () => {
      for (const method of methodList) {
        const callbacks = this.notificationCallbacks.get(method);
        if (callbacks == null) {
          continue;
        }

        this.notificationCallbacks.set(
          method,
          callbacks.filter(
            (currentCallback) => currentCallback !== storedCallback,
          ),
        );
      }
    };
  }

  async refreshRecentConversations({
    sortKey,
  }: {
    sortKey?: AppServer.v2.ThreadSortKey;
  } = {}): Promise<void> {
    invalidateSearch({
      hostId: this.hostId,
      queryClient: this.queryClient,
    });
    const limit =
      RECENT_CONVERSATIONS_PAGE_SIZE * this.recentConversationsPageCount;

    const persistedTitles = await this.loadThreadTitleCache(true);
    const nextSortKey = sortKey ?? this.recentConversationsSortKey;
    this.recentConversationsSortKey = nextSortKey;
    const threadList = await this.sendRequest("thread/list", {
      limit,
      cursor: null,
      sortKey: nextSortKey,
      // Leave unspecified so we use the user's default model provider in
      // config.toml.
      modelProviders: null,
      archived: false,
      sourceKinds: INTERACTIVE_THREAD_SOURCE_KINDS,
    } satisfies AppServer.v2.ThreadListParams);
    this.hasFetchedRecentConversations = true;
    this.recentConversationsNextCursor = threadList.nextCursor;
    const previousConversationIds = this.recentConversationIds;
    this.recentConversationIds = [];
    const recentConversationIdSet = new Set<ConversationId>();

    for (const thread of threadList.data) {
      const conversationId = createConversationId(thread.id);
      if (!recentConversationIdSet.has(conversationId)) {
        recentConversationIdSet.add(conversationId);
        this.recentConversationIds.push(conversationId);
      }
      this.upsertRecentConversationState(
        conversationId,
        thread,
        persistedTitles,
      );
    }
    const missingConversationIds: Array<ConversationId> = [];
    for (const conversationId of previousConversationIds) {
      if (recentConversationIdSet.has(conversationId)) {
        continue;
      }
      const conversation = this.conversations.get(conversationId);
      if (
        conversation &&
        (conversation.resumeState === "resumed" ||
          this.pinnedConversationIds.has(conversationId))
      ) {
        recentConversationIdSet.add(conversationId);
        missingConversationIds.push(conversationId);
      }
    }
    if (missingConversationIds.length > 0) {
      this.recentConversationIds = [
        ...missingConversationIds,
        ...this.recentConversationIds,
      ];
    }

    this.notifyAnyConversationCallbacks();
  }

  async hydratePinnedThreads(threadIds: Array<string>): Promise<void> {
    if (threadIds.length === 0) {
      return;
    }
    const persistedTitles = await this.loadThreadTitleCache();
    const recentIdSet = new Set(this.recentConversationIds);
    const threadIdsToRead = threadIds.filter((threadId) => {
      const conversationId = createConversationId(threadId);
      if (this.suppressedArchivedConversationIds.has(conversationId)) {
        return false;
      }
      return (
        !recentIdSet.has(conversationId) ||
        !this.conversations.has(conversationId)
      );
    });
    let didUpdate = false;
    if (threadIdsToRead.length > 0) {
      const responses = await Promise.all(
        threadIdsToRead.map(async (threadId) => {
          try {
            return await this.sendRequest("thread/read", {
              threadId,
              includeTurns: false,
            } satisfies AppServer.v2.ThreadReadParams);
          } catch (error) {
            logger.warning(`Failed to read pinned thread`, {
              safe: {},
              sensitive: {
                threadId: threadId,
                error: error,
              },
            });
            return null;
          }
        }),
      );

      for (const response of responses) {
        if (!response) {
          continue;
        }
        const thread = response.thread;
        const conversationId = createConversationId(thread.id);
        if (!this.recentConversationIds.includes(conversationId)) {
          recentIdSet.add(conversationId);
          this.recentConversationIds.push(conversationId);
        }
        this.upsertRecentConversationState(
          conversationId,
          thread,
          persistedTitles,
        );
        didUpdate = true;
      }
    }

    if (didUpdate) {
      this.notifyAnyConversationCallbacks();
    }
  }

  setPinnedThreadIds(threadIds: Array<string>): void {
    this.pinnedConversationIds = new Set(
      threadIds
        .map((threadId) => createConversationId(threadId))
        .filter(
          (conversationId) =>
            !this.suppressedArchivedConversationIds.has(conversationId),
        ),
    );
  }

  async loadMoreRecentConversations(): Promise<void> {
    if (
      this.hasFetchedRecentConversations &&
      this.recentConversationsNextCursor == null
    ) {
      return;
    }
    const persistedTitles = await this.loadThreadTitleCache(true);
    const threadList = await this.sendRequest("thread/list", {
      limit: RECENT_CONVERSATIONS_PAGE_SIZE,
      cursor: this.recentConversationsNextCursor,
      sortKey: this.recentConversationsSortKey,
      // Leave unspecified so we use the user's default model provider in
      // config.toml.
      modelProviders: null,
      archived: false,
      sourceKinds: INTERACTIVE_THREAD_SOURCE_KINDS,
    } satisfies AppServer.v2.ThreadListParams);
    this.hasFetchedRecentConversations = true;
    this.recentConversationsNextCursor = threadList.nextCursor;
    const recentConversationIdSet = new Set(this.recentConversationIds);
    let appendedCount = 0;
    for (const thread of threadList.data) {
      const conversationId = createConversationId(thread.id);
      if (!recentConversationIdSet.has(conversationId)) {
        recentConversationIdSet.add(conversationId);
        this.recentConversationIds.push(conversationId);
        appendedCount += 1;
      }
      this.upsertRecentConversationState(
        conversationId,
        thread,
        persistedTitles,
      );
    }
    if (appendedCount > 0) {
      this.recentConversationsPageCount += 1;
    }
    this.notifyAnyConversationCallbacks();
  }

  async listAllThreads({
    modelProviders,
    archived = false,
  }: {
    modelProviders: Array<string> | null;
    archived?: boolean;
  }): Promise<Array<AppServer.v2.Thread>> {
    return listAllThreadsRequest(
      {
        sendRequest: this.sendRequest.bind(this),
        recentConversationsSortKey: this.recentConversationsSortKey,
      },
      {
        modelProviders,
        archived,
      },
    );
  }

  async listArchivedThreads(): Promise<Array<AppServer.v2.Thread>> {
    return this.listAllThreads({
      modelProviders: null,
      archived: true,
    });
  }

  async searchThreads({
    query,
    limit = RECENT_CONVERSATIONS_PAGE_SIZE,
  }: {
    query: string;
    limit?: number;
  }): Promise<Array<ThreadSearchResult>> {
    return searchThreadsRequest(
      {
        loadThreadTitleCache: this.loadThreadTitleCache.bind(this),
        sendRequest: this.sendRequest.bind(this),
        recentConversationsSortKey: this.recentConversationsSortKey,
      },
      {
        query,
        limit,
      },
    );
  }

  async readThread(
    threadId: string,
    { includeTurns = false }: { includeTurns?: boolean } = {},
  ): Promise<AppServer.v2.ThreadReadResponse> {
    return this.sendRequest("thread/read", {
      threadId,
      includeTurns,
    } satisfies AppServer.v2.ThreadReadParams);
  }

  hasMoreRecentConversations(): boolean {
    return (
      !this.hasFetchedRecentConversations ||
      this.recentConversationsNextCursor != null
    );
  }

  private upsertRecentConversationState(
    conversationId: ConversationId,
    thread: AppServer.v2.Thread,
    persistedTitles: ThreadTitleState,
  ): void {
    registerCollabThreadMetadata({
      thread,
      threadsById: this.threadsById,
      conversations: this.conversations,
      updateConversationState: (
        conversationId,
        updater,
        shouldBroadcast = true,
      ) =>
        this.updateConversationState(conversationId, updater, shouldBroadcast),
    });
    const persistedTitle = getThreadTitle(thread, persistedTitles);
    const updatedAtMs = Number(thread.updatedAt) * 1000;
    const updatedAt = Number.isFinite(updatedAtMs) ? updatedAtMs : null;
    const threadRuntimeStatus = thread.status ?? null;
    if (this.conversations.has(conversationId)) {
      this.updateConversationState(conversationId, (draft) => {
        if (!draft.title && persistedTitle) {
          draft.title = persistedTitle;
        }
        draft.source = thread.source;
        if (updatedAt != null) {
          draft.updatedAt = updatedAt;
        }
        if (draft.resumeState !== "needs_resume") {
          return;
        }
        draft.threadRuntimeStatus = threadRuntimeStatus;
      });

      return;
    }
    const summaryCwd = thread.cwd;
    const gitInfo = thread.gitInfo;
    const createdAtMs = Number(thread.createdAt) * 1000;
    const createdAt = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();
    const normalizedUpdatedAt = updatedAt ?? createdAt;

    this.setConversation({
      id: conversationId,
      hostId: this.hostId,
      // This will get overwritten by the thread/resume call so the values don't matter except for the preview.
      turns: [
        {
          params: {
            threadId: conversationId as string,
            input: [{ type: "text", text: thread.preview, text_elements: [] }],
            cwd: null,
            approvalPolicy: "on-request",
            sandboxPolicy: {
              type: "readOnly",
              access: {
                type: "fullAccess",
              },
              networkAccess: false,
            },
            model: "gpt-5.2-codex",
            effort: "medium",
            summary: "none",
            personality: null,
            outputSchema: null,
            collaborationMode: null,
          },
          turnId: null,
          turnStartedAtMs: null,
          finalAssistantStartedAtMs: null,
          status: "completed",
          error: null,
          diff: null,
          items: [],
        },
      ],
      pendingSteers: [],
      requests: [],
      createdAt,
      updatedAt: normalizedUpdatedAt,
      title: persistedTitle,
      source: thread.source,
      latestModel: "",
      latestReasoningEffort: null,
      previousTurnModel: null,
      latestCollaborationMode: {
        mode: "default",
        settings: {
          reasoning_effort: "medium",
          model: "gpt-5.2-codex",
          developer_instructions: null,
        },
      },
      hasUnreadTurn: false,
      threadRuntimeStatus,
      rolloutPath: thread.path ?? "",
      gitInfo,
      resumeState: "needs_resume",
      latestTokenUsageInfo: null,
      cwd: summaryCwd,
    });
  }

  needsResume(conversationId: ConversationId): boolean {
    const conversation = this.conversations.get(conversationId);
    return (
      !conversation ||
      conversation.resumeState === "needs_resume" ||
      this.getStreamRole(conversationId) == null
    );
  }

  getConversationCwd(conversationId: ConversationId): string | null {
    return this.conversations.get(conversationId)?.cwd ?? null;
  }

  clearPrewarmedThreads(): void {
    this.prewarmedThreadManager.clearAllPrewarmedThreadPromises();
  }

  markAllConversationsNeedResumeAfterReconnect(): void {
    // The websocket transport reconnected, so any cached stream ownership or
    // "already streaming" markers may be stale.
    const previousStreamingCount = this.streamingConversations.size;
    const previousRoleCount = this.streamRoles.size;
    let markedCount = 0;
    this.streamingConversations.clear();
    this.streamRoles.clear();
    for (const [conversationId, conversation] of this.conversations) {
      if (conversation.resumeState === "needs_resume") {
        continue;
      }
      markedCount += 1;
      this.updateConversationState(conversationId, (draft) => {
        draft.resumeState = "needs_resume";
      });
    }
    logger.info("websocket_reconnect_marked_threads_needing_resume", {
      safe: {
        conversationCount: this.conversations.size,
        markedCount,
        previousStreamingCount,
        previousRoleCount,
      },
      sensitive: {},
    });
  }

  private async startThread({
    model,
    serviceTier,
    cwd,
    permissions,
    approvalsReviewer,
  }: {
    model: string | null;
    serviceTier: AppServer.ServiceTier | null;
    cwd: string;
    permissions: PermissionsConfig;
    approvalsReviewer: AppServer.v2.ApprovalsReviewer;
  }): Promise<CliResponse["thread/start"]> {
    const createRequest = await this.buildNewConversationParams(
      model,
      serviceTier,
      cwd,
      permissions,
      approvalsReviewer,
    );
    return this.sendRequest("thread/start", createRequest, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  }

  /**
   * Opportunistically starts a background `thread/start` and caches the result by `cwd`.
   *
   * This is intended for new conversations. `startConversation` will try to consume
   * this cached response first so we can avoid an extra startup round trip.
   */
  prewarmConversation({
    cwd,
    workspaceRoots,
    collaborationMode,
    agentMode,
  }: {
    cwd: string;
    workspaceRoots: Array<string>;
    collaborationMode: AppServer.CollaborationMode | null;
    agentMode: AgentMode;
  }): Promise<AppServer.v2.ThreadStartResponse | null> {
    if (this.prewarmedThreadManager.hasPrewarmedThread(cwd)) {
      return Promise.resolve(null);
    }

    const prewarmedPromise = (async (): Promise<ThreadStartResponse | null> => {
      try {
        const config = await this.getUserSavedConfiguration(cwd);
        const prewarmModel = collaborationMode?.settings.model ?? null;
        const permissions = buildPermissionsConfigForMode(
          agentMode,
          workspaceRoots,
          config,
        );
        const response = await this.startThread({
          model: prewarmModel,
          serviceTier:
            this.getEffectiveServiceTier(getDefaultServiceTierValue()) ?? null,
          cwd,
          permissions,
          approvalsReviewer: permissions.approvalsReviewer,
        });
        this.prewarmedThreadManager.setPrewarmedThreadMetadata({
          cwd,
          conversationId: createConversationId(response.thread.id),
          createdAtSeconds: response.thread.createdAt,
        });
        return response;
      } catch (error) {
        logger.warning("Failed to prewarm conversation", {
          safe: {},
          sensitive: {
            cwd,
            error,
          },
        });
        this.prewarmedThreadManager.clearPrewarmedThreadPromise(cwd);
        return null;
      }
    })();

    this.prewarmedThreadManager.setPrewarmedThreadPromise(
      cwd,
      prewarmedPromise,
    );

    return prewarmedPromise;
  }

  /**
   * Starts a new conversation and immediately submits the first turn.
   *
   * Prewarm behavior:
   * - Attempts to consume a prewarmed `thread/start` response keyed by `cwd`.
   * - Falls back to a normal `thread/start` request when no prewarmed response exists.
   */
  async startConversation({
    input,
    collaborationMode,
    serviceTier,
    workspaceRoots,
    permissions = buildWorkspaceWritePermissionsConfig(workspaceRoots),
    approvalsReviewer,
    cwd,
    attachments,
  }: StartConversationParams): Promise<ConversationId> {
    const reasoningEffortForRequest =
      collaborationMode?.settings.reasoning_effort;
    const requestedServiceTier =
      serviceTier !== undefined
        ? coerceServiceTier(serviceTier)
        : getDefaultServiceTierValue();
    const effectiveServiceTier =
      this.getEffectiveServiceTier(requestedServiceTier) ?? null;
    const prewarmedResponse =
      await this.prewarmedThreadManager.consumePrewarmedThread(cwd);
    const conversationResponse =
      prewarmedResponse ??
      (await this.startThread({
        model: collaborationMode?.settings.model ?? null,
        serviceTier: effectiveServiceTier,
        cwd,
        permissions,
        approvalsReviewer,
      }));

    const conversationId = createConversationId(conversationResponse.thread.id);
    if (!this.recentConversationIds.includes(conversationId)) {
      this.recentConversationIds.unshift(conversationId);
    }
    logger.info("Conversation created", {
      safe: { conversationId },
      sensitive: {},
    });
    const requestedCwd = cwd ?? null;
    const responseCwd = conversationResponse.cwd ?? null;
    const threadCwd = conversationResponse.thread.cwd;
    const effectiveCwd = getConversationCwd({
      requestedCwd,
      responseCwd,
      threadCwd,
      fallbackCwd: workspaceRoots[0],
    });
    const originUrlFromThread =
      conversationResponse.thread.gitInfo?.originUrl ?? null;
    const originUrl =
      originUrlFromThread ??
      (effectiveCwd
        ? await fetchFromVSCode("git-origins", {
            params: { dirs: [effectiveCwd], hostId: this.hostId },
            select: (o) =>
              o.origins.find((o) => effectiveCwd === o.dir)?.originUrl ??
              o.origins.find((origin) => effectiveCwd.startsWith(origin.root))
                ?.originUrl,
          })
        : null);
    const gitInfo =
      conversationResponse.thread.gitInfo ??
      (originUrl
        ? {
            branch: null,
            sha: null,
            originUrl,
          }
        : null);
    registerAgentNicknameFromThread(conversationResponse.thread);

    const createdAtMs = Number(conversationResponse.thread.createdAt) * 1000;
    const createdAt = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();
    const threadUpdatedAtMs =
      Number(conversationResponse.thread.updatedAt) * 1000;
    const updatedAt = Number.isFinite(threadUpdatedAtMs)
      ? threadUpdatedAtMs
      : createdAt;
    this.setConversation({
      id: conversationId,
      hostId: this.hostId,
      turns: [],
      pendingSteers: [],
      requests: [],
      createdAt,
      updatedAt,
      title: null,
      latestModel: conversationResponse.model,
      latestReasoningEffort: conversationResponse.reasoningEffort ?? null,
      previousTurnModel: null,
      latestCollaborationMode: collaborationMode ?? {
        mode: "default",
        settings: {
          model: conversationResponse.model,
          reasoning_effort: conversationResponse.reasoningEffort ?? null,
          developer_instructions: null,
        },
      },
      hasUnreadTurn: false,
      rolloutPath: conversationResponse.thread.path ?? "",
      cwd: effectiveCwd,
      gitInfo,
      resumeState: "resumed",
      latestTokenUsageInfo: null,
      source: conversationResponse.thread.source,
    });
    this.notifyConversationCallbacks(conversationId);

    this.markConversationStreaming(conversationId);
    this.setConversationStreamRole(conversationId, { role: "owner" });

    void this.generateConversationTitle(
      conversationId,
      input,
      effectiveCwd ?? null,
    );

    await startTurn(this, conversationId, {
      cwd: effectiveCwd,
      approvalPolicy: permissions.approvalPolicy,
      approvalsReviewer,
      sandboxPolicy: permissions.sandboxPolicy,
      model: collaborationMode != null ? null : conversationResponse.model,
      serviceTier: effectiveServiceTier,
      // This could potentially be different than
      // conversationResponse.reasoningEffort.
      effort: reasoningEffortForRequest,
      input,
      attachments,
      collaborationMode,
    });

    return conversationId;
  }

  forkConversationFromLatest(
    params: ForkConversationFromLatestParams,
  ): Promise<ConversationId> {
    return forkConversationFromLatestRequest(this, params);
  }

  forkConversationFromTurn(
    params: ForkConversationFromTurnParams,
  ): Promise<ConversationId> {
    return forkConversationFromTurnRequest(this, params);
  }

  private generateConversationTitle(
    conversationId: ConversationId,
    input: Array<AppServer.v2.UserInput>,
    cwd: string | null,
  ): Promise<void> {
    return generateConversationTitleRequest(this, conversationId, input, cwd);
  }

  async interruptConversation(conversationId: ConversationId): Promise<void> {
    await interruptSubagentDescendantsRequest(
      this.getArchiveConversationContext(),
      conversationId,
    );
    await this.interruptConversationSelf(conversationId);
  }

  private async interruptConversationSelf(
    conversationId: ConversationId,
  ): Promise<void> {
    const role = this.getStreamRole(conversationId);
    const followerInterruptResponse = await this.sendThreadFollowerRequest(
      role,
      "thread-follower-interrupt-turn",
      { conversationId },
    );
    if (followerInterruptResponse) {
      return;
    }

    // First, deny any pending approval, elicitation, or user input requests for this conversation.
    const conversationState = this.conversations.get(conversationId);
    if (conversationState) {
      // Copy request IDs to avoid mutation issues while responding.
      const pendingRequestIds = conversationState.requests.map((request) => ({
        id: request.id,
        method: request.method,
      }));
      if (pendingRequestIds.length > 0) {
        for (const request of pendingRequestIds) {
          const mcpRequestId = createMcpRequestId(request.id);
          // Respond with a denial to reject the pending action.
          if (request.method === "item/commandExecution/requestApproval") {
            this.replyWithCommandExecutionApprovalDecision(
              conversationId,
              mcpRequestId,
              "decline",
            );
            continue;
          }
          if (request.method === "item/fileChange/requestApproval") {
            this.replyWithFileChangeApprovalDecision(
              conversationId,
              mcpRequestId,
              "decline",
            );
            continue;
          }
          if (request.method === "item/tool/requestUserInput") {
            this.replyWithUserInputResponse(conversationId, mcpRequestId, {
              answers: {},
            });
            continue;
          }
          if (request.method === "mcpServer/elicitation/request") {
            this.replyWithMcpServerElicitationResponse(
              conversationId,
              mcpRequestId,
              buildMcpServerElicitationResponse("decline"),
            );
            continue;
          }
        }
      }
    }

    // Then, send the interrupt to stop the current turn.
    const latestTurn = findLast(
      conversationState?.turns ?? [],
      (turn) => turn.turnId != null,
    );
    const latestTurnId = latestTurn?.turnId ?? null;

    if (latestTurnId && latestTurn?.status === "inProgress") {
      await this.sendRequest("turn/interrupt", {
        threadId: conversationState?.id ?? conversationId,
        turnId: latestTurnId,
      });
      return;
    }

    try {
      await this.cleanBackgroundTerminals(conversationId);
    } catch (error) {
      logger.warning(
        "Failed to clean background terminals after interrupt fallback",
        {
          safe: { conversationId },
          sensitive: { error },
        },
      );
    }
  }

  async cleanBackgroundTerminals(
    conversationId: ConversationId,
    options?: { allowOverlayDirect?: boolean },
  ): Promise<void> {
    const role = this.getStreamRole(conversationId);
    if (!options?.allowOverlayDirect && role?.role === "follower") {
      throw new Error(
        "Please continue this conversation on the window where it was started.",
      );
    }

    const conversationState = this.conversations.get(conversationId);
    await this.sendRequest("thread/backgroundTerminals/clean", {
      threadId: conversationState?.id ?? conversationId,
    });
    this.updateConversationState(
      conversationId,
      (draft) => {
        for (const turn of draft.turns) {
          const interruptedIds =
            turn.interruptedCommandExecutionItemIds == null
              ? new Set<string>()
              : new Set(turn.interruptedCommandExecutionItemIds);
          let changed = false;
          for (const item of turn.items) {
            if (
              item.type !== "commandExecution" ||
              item.status !== "inProgress"
            ) {
              continue;
            }
            interruptedIds.add(item.id);
            changed = true;
          }
          if (!changed) {
            continue;
          }
          turn.interruptedCommandExecutionItemIds = [...interruptedIds];
        }
      },
      false,
    );
  }

  async handleThreadFollowerStartTurn(
    params: IpcRequestMessageContent["thread-follower-start-turn"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-start-turn"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    const result = await startTurn(this, params.conversationId, {
      ...params.turnStartParams,
    });
    return { result };
  }

  async handleThreadFollowerSteerTurn(
    params: IpcRequestMessageContent["thread-follower-steer-turn"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-steer-turn"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    const result = await steerTurn(this, params.conversationId, {
      input: params.input,
      attachments: params.attachments,
      restoreMessage: params.restoreMessage,
    });
    return { result };
  }

  async handleThreadFollowerInterruptTurn(
    params: IpcRequestMessageContent["thread-follower-interrupt-turn"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-interrupt-turn"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    await this.interruptConversation(params.conversationId);
    return { ok: true };
  }

  async handleThreadFollowerSetCollaborationMode(
    params: IpcRequestMessageContent["thread-follower-set-collaboration-mode"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-set-collaboration-mode"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    await this.setLatestCollaborationModeForConversation(
      params.conversationId,
      params.collaborationMode,
    );
    return { ok: true };
  }

  async handleThreadFollowerEditLastUserTurn(
    params: IpcRequestMessageContent["thread-follower-edit-last-user-turn"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-edit-last-user-turn"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    const conversation = this.getConversation(params.conversationId);
    const turn =
      conversation?.turns.find(
        (conversationTurn) => conversationTurn.turnId === params.turnId,
      ) ?? null;
    if (turn == null) {
      throw new Error("Conversation state not found.");
    }
    await editLastUserTurn(this, {
      conversationId: params.conversationId,
      turn,
      message: params.message,
      agentMode: params.agentMode,
    });
    return { ok: true };
  }

  async handleThreadFollowerCommandApprovalDecision(
    params: IpcRequestMessageContent["thread-follower-command-approval-decision"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-command-approval-decision"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    this.replyWithCommandExecutionApprovalDecision(
      params.conversationId,
      params.requestId,
      params.decision,
    );
    return { ok: true };
  }

  async handleThreadFollowerFileApprovalDecision(
    params: IpcRequestMessageContent["thread-follower-file-approval-decision"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-file-approval-decision"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    this.replyWithFileChangeApprovalDecision(
      params.conversationId,
      params.requestId,
      params.decision,
    );
    return { ok: true };
  }

  async handleThreadFollowerSubmitUserInput(
    params: IpcRequestMessageContent["thread-follower-submit-user-input"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-submit-user-input"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    this.replyWithUserInputResponse(
      params.conversationId,
      params.requestId,
      params.response,
    );
    return { ok: true };
  }

  async handleThreadFollowerSubmitMcpServerElicitationResponse(
    params: IpcRequestMessageContent["thread-follower-submit-mcp-server-elicitation-response"]["params"],
  ): Promise<
    IpcRequestMessageContent["thread-follower-submit-mcp-server-elicitation-response"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    this.replyWithMcpServerElicitationResponse(
      params.conversationId,
      params.requestId,
      params.response,
    );
    return { ok: true };
  }

  async handleThreadFollowerSetQueuedFollowUpsState(
    params: IpcRequestMessageContent["thread-follower-set-queued-follow-ups-state"]["params"],
    setQueuedFollowUpsState: (state: QueuedFollowUpState) => Promise<void>,
  ): Promise<
    IpcRequestMessageContent["thread-follower-set-queued-follow-ups-state"]["response"]
  > {
    this.assertThreadFollowerOwner(params.conversationId);
    await setQueuedFollowUpsState(params.state);
    broadcastQueuedFollowUpsChanged(
      params.conversationId,
      params.state[params.conversationId] ?? [],
    );
    return { ok: true };
  }

  private getArchiveConversationContext(): ArchiveConversationContext {
    return {
      hostId: this.hostId,
      conversations: this.conversations,
      threadsById: this.threadsById,
      archivingConversationIds: this.archivingConversationIds,
      isConversationSuppressedAfterArchive: (conversationId) =>
        this.suppressedArchivedConversationIds.has(conversationId),
      addSuppressedArchivedConversationId: (conversationId) => {
        this.suppressedArchivedConversationIds.add(conversationId);
        this.notifyAnyConversationCallbacks({ forceAny: true });
      },
      deleteSuppressedArchivedConversationId: (conversationId) => {
        this.suppressedArchivedConversationIds.delete(conversationId);
        this.notifyAnyConversationCallbacks({ forceAny: true });
      },
      archiveThread: async (conversationId) => {
        await this.sendRequest("thread/archive", {
          threadId: conversationId,
        });
      },
      unarchiveThread: async (conversationId) => {
        await this.sendRequest("thread/unarchive", {
          threadId: conversationId,
        } satisfies AppServer.v2.ThreadUnarchiveParams);
      },
      removeConversationFromCache: (conversationId) => {
        this.removeConversationFromCache(conversationId);
      },
      interruptConversationSelf: (conversationId) =>
        this.interruptConversationSelf(conversationId),
    };
  }

  async archiveConversation(
    conversationId: ConversationId,
    options: ArchiveConversationOptions = {},
  ): Promise<void> {
    await archiveConversationRequest(
      this.getArchiveConversationContext(),
      conversationId,
      options,
    );
  }

  async unarchiveConversation(conversationId: ConversationId): Promise<void> {
    await unarchiveConversationRequest(
      this.getArchiveConversationContext(),
      conversationId,
    );
  }

  private async performArchiveConversation(
    conversationId: ConversationId,
    archiveCwd: string,
    options: ArchiveConversationOptions = {},
  ): Promise<void> {
    await performArchiveConversationRequest(
      this.getArchiveConversationContext(),
      conversationId,
      archiveCwd,
      options,
    );
  }

  addCloudTaskSyntheticItem(
    conversationId: ConversationId,
    taskId: string,
  ): void {
    addCloudTaskSyntheticItemAction(this, conversationId, taskId);
  }

  addPersonalityChangeSyntheticItem(
    conversationId: ConversationId,
    personality: AppServer.Personality,
  ): void {
    addPersonalityChangeSyntheticItemAction(this, conversationId, personality);
  }

  removePlanImplementationRequest(
    conversationId: ConversationId,
    turnId: string,
  ): void {
    removePlanImplementationRequestAction(this, conversationId, turnId);
  }

  async loginWithApiKey(apiKey: string): Promise<void> {
    const response = await this.sendRequest("account/login/start", {
      type: "apiKey",
      apiKey,
    });
    if (response.type !== "apiKey") {
      throw new Error("Unexpected response type for account/login/start");
    }
  }

  async loginWithChatGpt(abortController: AbortController): Promise<{
    loginId: LoginId;
    authUrl: string;
    completion: Promise<{ success: boolean; error?: string }>;
  }> {
    if (this.activeLogin && !this.activeLogin.finished) {
      throw new Error("A ChatGPT login is already in progress");
    }
    const loginResponse = await this.sendRequest("account/login/start", {
      type: "chatgpt",
    });

    if (loginResponse.type !== "chatgpt") {
      throw new Error("Unexpected response type for account/login/start");
    }

    const { loginId, authUrl } = loginResponse;
    if (typeof authUrl !== "string" || authUrl.length === 0) {
      throw new Error("Missing authUrl in account/login/start response");
    }

    const stopRemotePortForward =
      __WINDOW_TYPE__ === "electron" && this.hostId !== DEFAULT_HOST_ID
        ? async (): Promise<void> => {
            await fetchFromVSCode("stop-remote-chatgpt-login-port-forward", {
              params: {
                hostId: this.hostId,
                loginId,
              },
            });
          }
        : undefined;
    if (stopRemotePortForward != null) {
      try {
        await fetchFromVSCode("start-remote-chatgpt-login-port-forward", {
          params: {
            hostId: this.hostId,
            loginId,
          },
        });
      } catch (error) {
        await this.sendRequest("account/login/cancel", { loginId }).catch(
          () => {},
        );
        throw error;
      }
    }

    let cleanup = (): void => {};
    const completionDeferred = createDeferred<{
      success: boolean;
      error?: string;
    }>();
    const stopRemoteChatgptLoginPortForward = async ({
      trigger,
    }: {
      trigger: "aborted" | "completed";
    }): Promise<void> => {
      if (entry.stopRemotePortForward == null) {
        logger.info("remote_chatgpt_login_port_forward_stop_skipped", {
          safe: {
            hostId: this.hostId,
            loginId,
            trigger,
          },
          sensitive: {},
        });
        return;
      }
      logger.info("remote_chatgpt_login_port_forward_stop_requested", {
        safe: {
          hostId: this.hostId,
          loginId,
          trigger,
        },
        sensitive: {},
      });
      await entry.stopRemotePortForward();
      logger.info("remote_chatgpt_login_port_forward_stop_finished", {
        safe: {
          hostId: this.hostId,
          loginId,
          trigger,
        },
        sensitive: {},
      });
    };
    const entry: NonNullable<typeof this.activeLogin> = {
      loginId: loginId as LoginId,
      finished: false,
      stopRemotePortForward,
      complete: (data: {
        loginId: LoginId;
        success: boolean;
        error?: string;
      }): void => {
        if (data.loginId !== loginId || entry.finished) {
          return;
        }
        entry.finished = true;
        cleanup();
        void stopRemoteChatgptLoginPortForward({
          trigger: "completed",
        }).catch((error) => {
          logger.warning("failed to stop remote chatgpt login port forward", {
            safe: {
              hostId: this.hostId,
              loginId,
              trigger: "completed",
            },
            sensitive: { error },
          });
        });
        completionDeferred.resolve({
          success: data.success,
          error: data.error,
        });
      },
    };
    this.activeLogin = entry;

    const signal = abortController.signal;
    const onAbort = (): void => {
      if (entry.finished) {
        return;
      }
      logger.info("remote_chatgpt_login_abort_requested", {
        safe: {
          hostId: this.hostId,
          loginId,
        },
        sensitive: {},
      });
      entry.finished = true;
      cleanup();
      void stopRemoteChatgptLoginPortForward({
        trigger: "aborted",
      }).catch((error) => {
        logger.warning("failed to stop remote chatgpt login port forward", {
          safe: {
            hostId: this.hostId,
            loginId,
            trigger: "aborted",
          },
          sensitive: { error },
        });
      });
      logger.info("remote_chatgpt_login_cancel_requested", {
        safe: {
          hostId: this.hostId,
          loginId,
        },
        sensitive: {},
      });
      this.sendRequest("account/login/cancel", { loginId }).catch(() => {});
      interface AbortError extends Error {
        aborted: true;
      }
      const abortErr: AbortError = Object.assign(new Error("Login aborted"), {
        name: "AbortError",
        aborted: true as const,
      });
      completionDeferred.reject(abortErr as AbortError);
    };

    if (signal.aborted) {
      // Abort already requested before we started.
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    cleanup = (): void => {
      signal.removeEventListener("abort", onAbort);
      if (this.activeLogin?.loginId === loginId) {
        this.activeLogin = undefined;
      }
    };

    return {
      loginId: loginId as LoginId,
      authUrl,
      completion: completionDeferred.promise,
    };
  }

  async logout(): Promise<void> {
    await this.sendRequest("account/logout", undefined);
  }

  async startWindowsSandboxSetup(
    mode: AppServer.v2.WindowsSandboxSetupMode,
    cwd?: string | null,
  ): Promise<{
    started: boolean;
    completion?: Promise<WindowsSandboxSetupCompletion>;
  }> {
    if (this.timedOutWindowsSandboxSetup != null) {
      for (const tombstonedMode of Object.keys(
        this.timedOutWindowsSandboxSetup,
      ) as Array<AppServer.v2.WindowsSandboxSetupMode>) {
        const expiresAt = this.timedOutWindowsSandboxSetup[tombstonedMode];
        if (expiresAt == null || Date.now() < expiresAt) {
          continue;
        }
        delete this.timedOutWindowsSandboxSetup[tombstonedMode];
      }
      if (Object.keys(this.timedOutWindowsSandboxSetup).length === 0) {
        this.timedOutWindowsSandboxSetup = undefined;
      }
    }

    if (
      this.activeWindowsSandboxSetup &&
      !this.activeWindowsSandboxSetup.finished
    ) {
      throw new Error("Windows sandbox setup already in progress");
    }

    if (this.timedOutWindowsSandboxSetup?.[mode] != null) {
      throw new Error(
        "Cannot retry the same Windows sandbox setup mode immediately after a timeout",
      );
    }

    const completionDeferred = createDeferred<WindowsSandboxSetupCompletion>();
    const entry: NonNullable<typeof this.activeWindowsSandboxSetup> = {
      mode,
      finished: false,
      timeoutId: null,
      complete: (result): void => {
        if (entry.finished) {
          return;
        }
        entry.finished = true;
        if (entry.timeoutId != null) {
          clearTimeout(entry.timeoutId);
          entry.timeoutId = null;
        }
        if (this.activeWindowsSandboxSetup === entry) {
          this.activeWindowsSandboxSetup = undefined;
        }
        completionDeferred.resolve(result);
      },
      fail: (error): void => {
        if (entry.finished) {
          return;
        }
        entry.finished = true;
        if (entry.timeoutId != null) {
          clearTimeout(entry.timeoutId);
          entry.timeoutId = null;
        }
        if (this.activeWindowsSandboxSetup === entry) {
          this.activeWindowsSandboxSetup = undefined;
        }
        completionDeferred.reject(error);
      },
    };

    this.activeWindowsSandboxSetup = entry;

    let response: AppServer.v2.WindowsSandboxSetupStartResponse;
    try {
      response = await this.sendRequest("windowsSandbox/setupStart", {
        mode,
        cwd,
      });
    } catch (error) {
      if (this.activeWindowsSandboxSetup === entry) {
        this.activeWindowsSandboxSetup = undefined;
      }
      entry.finished = true;
      throw error;
    }

    if (!response.started) {
      if (this.activeWindowsSandboxSetup === entry) {
        this.activeWindowsSandboxSetup = undefined;
      }
      entry.finished = true;
      return { started: false };
    }

    if (!entry.finished) {
      entry.timeoutId = setTimeout(() => {
        this.timedOutWindowsSandboxSetup = {
          ...this.timedOutWindowsSandboxSetup,
          [mode]: Date.now() + WINDOWS_SANDBOX_SETUP_TIMEOUT_TOMBSTONE_MS,
        };
        entry.fail(
          new Error("Timed out waiting for Windows sandbox setup completion"),
        );
      }, WINDOWS_SANDBOX_SETUP_TIMEOUT_MS);
    }

    return {
      started: true,
      completion: completionDeferred.promise,
    };
  }

  logoutWithoutServer(): void {
    for (const cb of this.authStatusCallbacks) {
      cb({ authMethod: null });
    }
  }

  listApps(
    params: AppServer.v2.AppsListParams,
  ): Promise<AppServer.v2.AppsListResponse> {
    return this.sendRequest("app/list", params);
  }

  listPlugins(
    params: AppServer.v2.PluginListParams,
  ): Promise<AppServer.v2.PluginListResponse> {
    return listPluginsRequest(this, params);
  }

  readPlugin(
    params: AppServer.v2.PluginReadParams,
  ): Promise<AppServer.v2.PluginReadResponse> {
    return readPluginRequest(this, params);
  }

  installPlugin(
    params: AppServer.v2.PluginInstallParams,
  ): Promise<AppServer.v2.PluginInstallResponse> {
    return installPluginRequest(this, params);
  }

  uninstallPlugin(
    params: AppServer.v2.PluginUninstallParams,
  ): Promise<AppServer.v2.PluginUninstallResponse> {
    return uninstallPluginRequest(this, params);
  }

  async listSkills(
    cwds: Array<string>,
    options?: {
      forceReload?: boolean;
    },
  ): Promise<AppServer.v2.SkillsListResponse> {
    const params: AppServer.v2.SkillsListParams = {
      ...(cwds.length > 0 ? { cwds } : {}),
      ...(options?.forceReload ? { forceReload: true } : {}),
    };
    logger.info("Skills/list request", {
      safe: {
        cwdsCount: cwds.length,
        forceReload: params.forceReload === true,
      },
      sensitive: {},
    });
    const response = await this.sendRequest("skills/list", params);
    let missingShortDescriptionCount = 0;
    const affectedCwds = new Set<string>();
    for (const entry of response.data) {
      for (const skill of entry.skills) {
        const shortDescription =
          skill.shortDescription ??
          (skill as { short_description?: string | null }).short_description;
        if (!shortDescription) {
          missingShortDescriptionCount += 1;
          affectedCwds.add(entry.cwd);
        }
      }
    }
    if (missingShortDescriptionCount > 0) {
      logger.info(
        "Skills/list missing short_description count affectedCwdsCount",
        {
          safe: {
            missingShortDescriptionCount,
            affectedCwdsCount: affectedCwds.size,
          },
          sensitive: {},
        },
      );
    }
    logger.info("Skills/list ok", {
      safe: { entryCount: response.data.length },
      sensitive: {},
    });
    if (__WINDOW_TYPE__ === "extension") {
      const iconJobs: Array<Promise<void>> = [];
      for (const entry of response.data) {
        for (const skill of entry.skills) {
          const iconSmall = skill.interface?.iconSmall ?? null;
          const iconLarge = skill.interface?.iconLarge ?? null;
          if (iconSmall) {
            iconJobs.push(
              inlineSkillIconForExtension(skill, "iconSmall", iconSmall),
            );
          }
          if (iconLarge) {
            iconJobs.push(
              inlineSkillIconForExtension(skill, "iconLarge", iconLarge),
            );
          }
        }
      }
      await Promise.all(iconJobs);
    }
    return response;
  }

  writeSkillConfig(
    params: AppServer.v2.SkillsConfigWriteParams,
  ): Promise<AppServer.v2.SkillsConfigWriteResponse> {
    return this.sendRequest("skills/config/write", params);
  }

  async getAccount(): Promise<AppServer.v2.GetAccountResponse> {
    return this.sendRequest("account/read", {
      refreshToken: false,
    });
  }

  getGitDiffToRemote(cwd: string): Promise<AppServer.GitDiffToRemoteResponse> {
    return this.sendRequest("gitDiffToRemote", { cwd });
  }

  async getUserSavedConfiguration(cwd?: string): Promise<AppServer.v2.Config> {
    const response = await this.readConfig({
      includeLayers: false,
      cwd: cwd ?? null,
    });
    return response.config;
  }

  readConfig(
    params: AppServer.v2.ConfigReadParams,
  ): Promise<AppServer.v2.ConfigReadResponse> {
    return this.sendRequest("config/read", params);
  }

  getConfigRequirements(): Promise<AppServer.v2.ConfigRequirementsReadResponse> {
    return this.sendRequest("configRequirements/read", undefined);
  }

  loginMcpServer(
    params: AppServer.v2.McpServerOauthLoginParams,
  ): Promise<AppServer.v2.McpServerOauthLoginResponse> {
    return this.sendRequest("mcpServer/oauth/login", params);
  }

  listMcpServers(
    params: AppServer.v2.ListMcpServerStatusParams,
  ): Promise<AppServer.v2.ListMcpServerStatusResponse> {
    const key = JSON.stringify(params);
    const existingPromise = this.mcpServerStatusPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }
    const requestPromise = this.sendRequest("mcpServerStatus/list", params);
    this.mcpServerStatusPromises.set(key, requestPromise);
    return requestPromise.finally(() => {
      this.mcpServerStatusPromises.delete(key);
    });
  }

  writeConfigValue(
    params: AppServer.v2.ConfigValueWriteParams,
  ): Promise<AppServer.v2.ConfigWriteResponse> {
    return this.sendRequest("config/value/write", params);
  }

  batchWriteConfigValue(
    params: AppServer.v2.ConfigBatchWriteParams,
  ): Promise<AppServer.v2.ConfigWriteResponse> {
    return this.sendRequest("config/batchWrite", params);
  }

  async createFuzzyFileSearchSession(params: {
    roots: Array<string>;
    onUpdated?: (
      notification: AppServer.FuzzyFileSearchSessionUpdatedNotification,
    ) => void;
    onCompleted?: (
      notification: AppServer.FuzzyFileSearchSessionCompletedNotification,
    ) => void;
  }): Promise<FuzzySearchSession> {
    return this.fuzzyFileSearchController.createSession(params);
  }

  listModels(
    params: AppServer.v2.ModelListParams,
  ): Promise<AppServer.v2.ModelListResponse> {
    return this.sendRequest("model/list", params);
  }

  listCollaborationModes(): Promise<AppServer.v2.CollaborationModeListResponse> {
    return this.sendRequest("collaborationMode/list", {});
  }

  setDefaultModelConfig(
    model: string | null,
    reasoningEffort: AppServer.ReasoningEffort | null,
  ): Promise<AppServer.v2.ConfigWriteResponse> {
    const edits: Array<AppServer.v2.ConfigEdit> = [
      {
        keyPath: "model",
        value: model,
        mergeStrategy: "upsert",
      },
      {
        keyPath: "model_reasoning_effort",
        value: reasoningEffort,
        mergeStrategy: "upsert",
      },
    ];

    // Write to the default file path and expected version for user's config file.
    return this.sendRequest("config/batchWrite", {
      edits,
      filePath: null,
      expectedVersion: null,
    });
  }

  submitFeedback(
    params: AppServer.v2.FeedbackUploadParams,
  ): Promise<AppServer.v2.FeedbackUploadResponse> {
    return this.sendRequest("feedback/upload", params);
  }

  onNotification<M extends AppServerWebviewNotificationMethod>(
    method: M,
    params: AppServerNotificationParamsForMethod<M>,
  ): void {
    const notification = { method, params } as AppServerWebviewNotification;
    if (this.shouldIgnoreThreadMutationAsFollower(method, params)) {
      return;
    }
    if (method !== "item/commandExecution/outputDelta") {
      logger.trace(`Received app server notification`, {
        safe: { method },
        sensitive: {},
      });
    }
    switch (notification.method) {
      case "mcpServer/oauthLogin/completed": {
        const { name, success, error } = notification.params;
        this.mcpLoginCallbacks.forEach((cb) =>
          cb({ name, success, ...(error ? { error } : {}) }),
        );
        if (!success) {
          logger.debug(`MCP server OAuth login failed`, {
            safe: {},
            sensitive: {
              name,
              error,
            },
          });
        } else {
          logger.info(`MCP server OAuth login completed`, {
            safe: {},
            sensitive: {
              name,
            },
          });
        }
        break;
      }
      case "thread/started": {
        const { thread } = notification.params;
        const conversationId = createConversationId(thread.id);
        if (
          this.prewarmedThreadManager.isPrewarmedConversation(conversationId)
        ) {
          break;
        }
        const upsertedConversationId =
          this.upsertConversationFromThread(thread);
        snapshotState("thread_started");
        this.broadcastConversationSnapshot(upsertedConversationId);
        break;
      }
      case "thread/name/updated": {
        const { threadId, threadName } = notification.params;
        const conversationId = createConversationId(threadId);
        const trimmedTitle = threadName?.trim() ?? "";
        if (trimmedTitle.length === 0) {
          break;
        }
        cacheThreadTitle({
          conversationId,
          queryClient: this.queryClient,
          title: trimmedTitle,
        });
        if (!this.conversations.has(conversationId)) {
          break;
        }
        this.updateConversationState(conversationId, (draft) => {
          draft.title = trimmedTitle;
        });
        break;
      }
      case "thread/status/changed": {
        const { threadId, status } = notification.params;
        if (!status) {
          logger.warning("Invalid thread/status/changed notification payload", {
            safe: {},
            sensitive: { params },
          });
          break;
        }
        const conversationId = createConversationId(threadId);
        const conversation = this.conversations.get(conversationId);
        if (!conversation || conversation.resumeState !== "needs_resume") {
          break;
        }
        this.updateConversationState(conversationId, (draft) => {
          draft.threadRuntimeStatus = status;
        });
        break;
      }
      case "thread/realtime/started":
      case "thread/realtime/outputAudio/delta":
      case "thread/realtime/error":
      case "thread/realtime/closed": {
        break;
      }
      case "thread/archived": {
        const { threadId } = notification.params;
        this.handleThreadArchived(createConversationId(threadId));
        break;
      }
      case "thread/unarchived": {
        const { threadId } = notification.params;
        void this.handleThreadUnarchived(createConversationId(threadId));
        break;
      }
      case "skills/changed": {
        break;
      }
      case "turn/started": {
        const { threadId, turn } = notification.params;
        const conversationId = createConversationId(threadId);
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
          logger.error("Received turn/started for unknown conversation", {
            safe: { conversationId },
            sensitive: {},
          });
          break;
        }

        this.markConversationStreaming(conversationId);
        this.updateConversationState(conversationId, (draft) => {
          const latestTurn = last(draft.turns);
          if (
            latestTurn &&
            (latestTurn.turnId == null || latestTurn.turnId === turn.id)
          ) {
            // Reuse the placeholder created by startTurn; preserve params the UI set.
            latestTurn.turnId = turn.id;
            latestTurn.turnStartedAtMs =
              latestTurn.turnStartedAtMs ?? Date.now();
            ensureTurnDefaults(latestTurn, turn.status);
            latestTurn.error = turn.error;
          } else {
            const defaultPermissions = buildWorkspaceWritePermissionsConfig([]);
            let fallbackParams: LocalTurnStartParams;
            if (latestTurn?.params) {
              // `latestTurn.params` is an Immer draft type which is expensive for
              // TS to instantiate; cast it to the non-draft shape we persist.
              const previousParams =
                latestTurn.params as unknown as LocalTurnStartParams;
              fallbackParams = {
                threadId: conversationId as string,
                input: [],
                cwd: previousParams.cwd,
                approvalPolicy: previousParams.approvalPolicy,
                sandboxPolicy: previousParams.sandboxPolicy,
                model: previousParams.model,
                serviceTier: coerceServiceTier(previousParams.serviceTier),
                effort: previousParams.effort,
                summary: "none",
                personality: previousParams.personality,
                outputSchema: previousParams.outputSchema,
                collaborationMode: previousParams.collaborationMode,
                attachments: [],
              };
            } else {
              fallbackParams = {
                threadId: conversationId as string,
                input: [],
                cwd: draft.cwd ?? null,
                approvalPolicy: defaultPermissions.approvalPolicy,
                sandboxPolicy: defaultPermissions.sandboxPolicy,
                model: draft.latestModel,
                serviceTier: null,
                effort: draft.latestReasoningEffort,
                summary: "none",
                personality: null,
                outputSchema: null,
                collaborationMode: draft.latestCollaborationMode,
              };
            }
            const targetTurn = castDraft<AppServerConversationTurn>({
              params: fallbackParams,
              turnId: turn.id,
              turnStartedAtMs: Date.now(),
              finalAssistantStartedAtMs: null,
              status: turn.status,
              error: turn.error,
              diff: null,
              items: [],
            });
            draft.turns.push(targetTurn);
          }
          const targetTurn = last(draft.turns) ?? latestTurn;
          if (!targetTurn) {
            return;
          }

          draft.latestModel = targetTurn.params.model ?? draft.latestModel;
          draft.latestReasoningEffort =
            targetTurn.params.effort ?? draft.latestReasoningEffort;
          draft.latestCollaborationMode =
            targetTurn.params.collaborationMode ??
            draft.latestCollaborationMode;

          ensureTurnDefaults(targetTurn, turn.status);
          targetTurn.turnId = turn.id;
          targetTurn.error = turn.error;

          for (const existingTurn of draft.turns) {
            for (const item of existingTurn.items) {
              if (
                item.type === "planImplementation" &&
                item.turnId !== turn.id
              ) {
                item.isCompleted = true;
              }
            }
          }
          draft.requests = draft.requests.filter((request) => {
            if (request.method !== PLAN_IMPLEMENTATION_REQUEST_METHOD) {
              return true;
            }
            return request.params.turnId === turn.id;
          });
        });
        this.broadcastConversationSnapshot(conversationId);
        snapshotState("turn_started");
        break;
      }
      case "turn/completed": {
        this.frameTextDeltaQueue.flushNow();
        const { threadId, turn } = notification.params;
        const conversationId = createConversationId(threadId);
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
          logger.error("Received turn/completed for unknown conversation", {
            safe: { conversationId },
            sensitive: {},
          });
          break;
        }

        let planContent: string | null = null;
        let incompleteTodoListStepCount: number | null = null;
        let completedIncompleteTodoListStepCount: number | null = null;
        this.updateTurnState(conversationId, turn.id, (targetTurn) => {
          targetTurn.turnId = turn.id;
          targetTurn.status = turn.status;
          targetTurn.error = turn.error;
          if (turn.status !== "completed") {
            return;
          }

          const todoListItem = findLast(
            targetTurn.items,
            (candidate): candidate is ItemForType<"todo-list"> =>
              candidate.type === "todo-list",
          );
          if (todoListItem) {
            const completedPlanStepCount = todoListItem.plan.filter(
              (step) => step.status === "completed",
            ).length;
            if (completedPlanStepCount < todoListItem.plan.length) {
              incompleteTodoListStepCount = todoListItem.plan.length;
              completedIncompleteTodoListStepCount = completedPlanStepCount;
            }
          }

          const planItem = findLast(
            targetTurn.items,
            (candidate): candidate is ItemForType<"plan"> =>
              candidate.type === "plan",
          );
          if (!planItem) {
            return;
          }
          const trimmedPlanContent = planItem.text.trim();
          if (trimmedPlanContent.length === 0) {
            return;
          }
          planContent = trimmedPlanContent;
        });
        if (
          incompleteTodoListStepCount != null &&
          completedIncompleteTodoListStepCount != null
        ) {
          logger.info("turn_completed_with_incomplete_plan", {
            safe: {
              conversationId,
              turnId: turn.id,
              planStepCount: incompleteTodoListStepCount,
              completedPlanStepCount: completedIncompleteTodoListStepCount,
            },
            sensitive: {},
          });
        }
        if (planContent) {
          setPlanImplementationSyntheticItem(
            this,
            conversationId,
            turn.id,
            planContent,
          );
          setPlanImplementationRequest(
            this,
            conversationId,
            turn.id,
            planContent,
          );
        }
        let restoredQueuedFollowUps: Array<QueuedFollowUpMessage> = [];
        this.updateConversationState(conversationId, (draft) => {
          draft.hasUnreadTurn = true;
          const completedTurn =
            findLast(
              draft.turns,
              (candidate) => candidate.turnId === turn.id,
            ) ?? null;
          if (
            completedTurn == null ||
            (draft.pendingSteers?.length ?? 0) === 0
          ) {
            return;
          }
          const restoredPendingSteers = (draft.pendingSteers ?? []).filter(
            (pendingSteer) =>
              pendingSteerTargetsTurn(
                pendingSteer,
                turn.id,
                completedTurn.turnStartedAtMs,
              ),
          );
          // Only restore steers that belong to this completed turn. Core clears
          // active_turn before it emits TurnComplete, so a new turn can start and
          // reach the app before the older turn/completed notification lands.
          if (restoredPendingSteers.length === 0) {
            return;
          }
          restoredQueuedFollowUps = restoredPendingSteers.map(
            (pendingSteer) => {
              const restoredMessage = current(pendingSteer.restoreMessage);
              const {
                pausedReason: _pausedReason,
                ...restoredMessageWithoutPause
              } = restoredMessage;
              return {
                ...(turn.status === "completed"
                  ? restoredMessageWithoutPause
                  : restoredMessage),
                ...(turn.status === "interrupted"
                  ? {
                      pausedReason: INTERRUPTED_PENDING_STEER_PAUSED_REASON,
                    }
                  : turn.status === "completed"
                    ? {}
                    : {
                        pausedReason:
                          "Run ended before the steer was accepted.",
                      }),
              };
            },
          );
          draft.pendingSteers = (draft.pendingSteers ?? []).filter(
            (pendingSteer) =>
              !pendingSteerTargetsTurn(
                pendingSteer,
                turn.id,
                completedTurn.turnStartedAtMs,
              ),
          );
        });
        this.broadcastConversationSnapshot(conversationId);
        snapshotState("turn_completed");

        const lastAgentMessage = this.getLastAgentMessageForTurn(
          conversationId,
          turn.id,
        );
        this.handleTurnDirectives(conversationId, turn.id, lastAgentMessage);
        this.turnCompletedListeners.forEach((listener) =>
          listener({
            conversationId,
            turnId: turn.id,
            lastAgentMessage,
            restoredQueuedFollowUps,
          }),
        );
        break;
      }
      case "turn/diff/updated": {
        const { turnId, diff, threadId } = notification.params;
        const conversationId = createConversationId(threadId);
        this.updateTurnState(conversationId, turnId, (turn) => {
          turn.diff = diff;
        });
        break;
      }
      case "turn/plan/updated": {
        const { threadId, turnId, plan, explanation } = notification.params;
        const conversationId = createConversationId(threadId);
        this.updateTurnState(conversationId, turnId, (turn) => {
          const syntheticItem: ItemForType<"todo-list"> = {
            id: uuidv4(),
            type: "todo-list",
            explanation: explanation ?? null,
            plan,
          };
          turn.items.push(syntheticItem);
        });
        break;
      }
      case "hook/started":
      case "hook/completed": {
        const { threadId, turnId, run } = notification.params;
        const conversationId = createConversationId(threadId);
        if (!this.conversations.has(conversationId)) {
          logger.error(
            `Received ${notification.method} for unknown conversation`,
            {
              safe: { conversationId },
            },
          );
          break;
        }

        if (notification.method === "hook/started") {
          this.markConversationStreaming(conversationId);
        }

        this.updateTurnState(
          conversationId,
          turnId,
          (turn) => {
            upsertHookRunIntoTurn(turn.items, run);
          },
          true,
          notification.method === "hook/started"
            ? { rebindLatestInProgressPlaceholder: true }
            : undefined,
        );
        break;
      }
      case "item/started": {
        const { item, threadId, turnId } = notification.params;

        const conversationId = createConversationId(threadId);
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
          logger.error("Received item/started for unknown conversation", {
            safe: { conversationId },
            sensitive: {},
          });
          break;
        }

        this.markConversationStreaming(conversationId);
        this.updateConversationState(conversationId, (draft) => {
          const turn = findTurnForEvent(draft, turnId, {
            synthesizeMissingTurn: true,
          });
          if (!turn) {
            return;
          }
          ensureTurnDefaults(turn);
          const matchingPendingSteerIndex =
            item.type === "userMessage"
              ? findMatchingPendingSteerIndex(
                  draft.pendingSteers,
                  item.content,
                  turn.turnId,
                  turn.turnStartedAtMs,
                )
              : -1;
          if (item.type === "userMessage" && matchingPendingSteerIndex >= 0) {
            // Keep matching steers in the queued-input UI until core confirms
            // acceptance with item/completed.
            return;
          }
          if (item.type === "agentMessage") {
            turn.finalAssistantStartedAtMs = Date.now();
          }
          if (item.type === "userMessage") {
            return;
          }
          const normalizedItem = normalizeIncomingThreadItem({
            item,
            threadsById: this.threadsById,
            onCollabAgentToolCall: (collabItem) => {
              void this.hydrateCollabThreads(collabItem.receiverThreadIds);
            },
          });
          const draftItem = castDraft(
            normalizedItem.type === "contextCompaction"
              ? { ...normalizedItem, completed: false }
              : normalizedItem,
          );
          upsertItem(turn, draftItem);
        });

        break;
      }
      case "item/completed": {
        this.frameTextDeltaQueue.flushNow();
        const { item, threadId, turnId } = notification.params;
        const conversationId = createConversationId(threadId);
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
          logger.error("Received item/completed for unknown conversation", {
            safe: { conversationId },
            sensitive: {},
          });
          break;
        }

        this.updateConversationState(conversationId, (draft) => {
          const turn =
            item.type === "userMessage"
              ? findTurnForEvent(draft, turnId)
              : turnId == null
                ? (last(draft.turns) ?? null)
                : (findLast(
                    draft.turns,
                    (candidate) => candidate.turnId === turnId,
                  ) ?? null);
          if (!turn) {
            return;
          }
          ensureTurnDefaults(turn);
          const normalizedItem = normalizeIncomingThreadItem({
            item,
            threadsById: this.threadsById,
            onCollabAgentToolCall: (collabItem) => {
              void this.hydrateCollabThreads(collabItem.receiverThreadIds);
            },
          });
          const draftItem = castDraft(
            normalizedItem.type === "contextCompaction"
              ? { ...normalizedItem, completed: true }
              : normalizedItem,
          );
          if (item.type === "userMessage") {
            const matchingPendingSteerIndex = findMatchingPendingSteerIndex(
              draft.pendingSteers,
              item.content,
              turn.turnId,
              turn.turnStartedAtMs,
            );
            // Search by turn + content instead of queue head only: this
            // completion can belong to a newer turn whose start reached the app
            // before an older turn's completion cleanup finished.
            if (matchingPendingSteerIndex >= 0) {
              const pendingSteer = (draft.pendingSteers ?? [])[
                matchingPendingSteerIndex
              ];
              draft.pendingSteers = (draft.pendingSteers ?? []).filter(
                (_, index) => index !== matchingPendingSteerIndex,
              );
              const pendingSteerItem: StoredUserMessageItem = {
                ...item,
                attachments: pendingSteer?.attachments,
              };
              upsertItem(turn, castDraft(pendingSteerItem));
              return;
            }
            upsertItem(turn, draftItem);
            return;
          }
          if (!findItem(turn, item.id, item.type)) {
            return;
          }
          upsertItem(turn, draftItem);
        });

        break;
      }
      case "item/autoApprovalReview/started":
      case "item/autoApprovalReview/completed": {
        handleAutomaticApprovalReviewNotification(
          notification.params,
          this.conversations,
          this.updateConversationState.bind(this),
        );
        break;
      }
      case "item/agentMessage/delta": {
        const { itemId, delta, threadId, turnId } = notification.params;
        if (this.webviewSampler.recordDeltaBytes(delta)) {
          snapshotState("delta_burst");
        }
        const conversationId = createConversationId(threadId);
        this.frameTextDeltaQueue.enqueue({
          conversationId,
          turnId,
          itemId,
          target: { type: "agentMessage" },
          delta,
        });
        break;
      }
      case "item/plan/delta": {
        const { itemId, delta, threadId, turnId } = notification.params;
        if (this.webviewSampler.recordDeltaBytes(delta)) {
          snapshotState("delta_burst");
        }
        const conversationId = createConversationId(threadId);
        this.frameTextDeltaQueue.enqueue({
          conversationId,
          turnId,
          itemId,
          target: { type: "plan" },
          delta,
        });
        break;
      }
      case "item/reasoning/summaryTextDelta": {
        const { itemId, delta, summaryIndex, threadId, turnId } =
          notification.params;
        if (this.webviewSampler.recordDeltaBytes(delta)) {
          snapshotState("delta_burst");
        }
        const conversationId = createConversationId(threadId);
        this.frameTextDeltaQueue.enqueue({
          conversationId,
          turnId,
          itemId,
          target: {
            type: "reasoningSummary",
            summaryIndex,
          },
          delta,
        });
        break;
      }
      case "item/reasoning/summaryPartAdded": {
        // This can just be a no-op, as we'll populate the next summary part once
        // the next item/reasoning/summaryTextDelta notification arrives.
        break;
      }
      case "item/reasoning/textDelta": {
        const { itemId, delta, contentIndex, threadId, turnId } =
          notification.params;
        if (this.webviewSampler.recordDeltaBytes(delta)) {
          snapshotState("delta_burst");
        }
        const conversationId = createConversationId(threadId);
        this.frameTextDeltaQueue.enqueue({
          conversationId,
          turnId,
          itemId,
          target: {
            type: "reasoningContent",
            contentIndex,
          },
          delta,
        });
        break;
      }
      case "item/commandExecution/outputDelta": {
        const { itemId, delta, threadId, turnId } = notification.params;
        if (this.webviewSampler.recordDeltaBytes(delta)) {
          snapshotState("delta_burst");
        }
        const conversationId = createConversationId(threadId);
        this.outputDeltaQueue.enqueue({
          conversationId,
          turnId,
          itemId,
          delta,
        });
        break;
      }
      case "item/fileChange/outputDelta": {
        const { delta } = notification.params;
        if (this.webviewSampler.recordDeltaBytes(delta)) {
          snapshotState("delta_burst");
        }
        // No-op, this is just the output of the apply_patch tool call
        // and we don't render it anywhere.
        break;
      }
      case "serverRequest/resolved": {
        const { threadId, requestId } = notification.params;
        const conversationId = createConversationId(threadId);
        this.updateConversationState(conversationId, (draft) => {
          draft.requests = draft.requests.filter(
            (request) => request.id !== requestId,
          );
        });
        break;
      }
      case "item/mcpToolCall/progress": {
        const { itemId, message, threadId, turnId } = notification.params;
        const conversationId = createConversationId(threadId);
        this.updateTurnState(conversationId, turnId, (turn) => {
          const item = findItem(turn, itemId, "mcpToolCall");
          if (item) {
            logger.debug("Ignoring mcpToolCall progress message", {
              safe: { itemId, message },
              sensitive: {},
            });
          }
        });
        break;
      }
      case "account/updated": {
        const { authMode } = notification.params;
        for (const cb of this.authStatusCallbacks) {
          cb({ authMethod: authMode ?? null });
        }
        break;
      }
      case "account/login/completed": {
        const { loginId, success, error } = notification.params;
        const active = this.activeLogin;
        if (active && active.loginId === loginId) {
          active.complete({
            loginId: loginId as LoginId,
            success,
            ...(error != null ? { error } : {}),
          });
        }
        break;
      }
      case "windowsSandbox/setupCompleted": {
        const { mode, success, error } = notification.params;
        const active = this.activeWindowsSandboxSetup;
        if (!active) {
          if (this.timedOutWindowsSandboxSetup?.[mode] != null) {
            delete this.timedOutWindowsSandboxSetup[mode];
            if (Object.keys(this.timedOutWindowsSandboxSetup).length === 0) {
              this.timedOutWindowsSandboxSetup = undefined;
            }
          }
          logger.warning(
            "Received windowsSandbox/setupCompleted without active setup",
            {
              safe: { mode, success },
              sensitive: { error },
            },
          );
          break;
        }
        if (active.mode !== mode) {
          if (this.timedOutWindowsSandboxSetup?.[mode] != null) {
            delete this.timedOutWindowsSandboxSetup[mode];
            if (Object.keys(this.timedOutWindowsSandboxSetup).length === 0) {
              this.timedOutWindowsSandboxSetup = undefined;
            }
          }
          logger.warning(
            "Received windowsSandbox/setupCompleted for wrong mode",
            {
              safe: { expectedMode: active.mode, mode, success },
              sensitive: { error },
            },
          );
          break;
        }
        active.complete({ mode, success, error });
        break;
      }
      case "account/rateLimits/updated": {
        break;
      }
      case "app/list/updated": {
        break;
      }
      case "model/rerouted": {
        const { threadId, turnId, fromModel, toModel, reason } =
          notification.params;
        const conversationId = createConversationId(threadId);
        this.updateTurnState(conversationId, turnId, (turn) => {
          const modelReroutedItem: ItemForType<"modelRerouted"> = {
            id: uuidv4(),
            type: "modelRerouted",
            fromModel,
            toModel,
            reason,
          };
          turn.items.push(modelReroutedItem);
        });
        break;
      }
      case "thread/tokenUsage/updated": {
        const { threadId, tokenUsage } = notification.params;
        const conversationId = createConversationId(threadId);
        this.updateConversationState(conversationId, (draft) => {
          draft.latestTokenUsageInfo = tokenUsage;
        });
        break;
      }
      case "deprecationNotice": {
        const { summary, details } = notification.params;
        this.setLatestConfigNotice({
          kind: "deprecation",
          level: "warning",
          summary,
          details,
        });
        logger.warning("Deprecation notice", {
          safe: { summary, details },
          sensitive: {},
        });
        break;
      }
      case "configWarning": {
        const { summary, details, path, range } = notification.params;
        this.setLatestConfigNotice({
          kind: "configWarning",
          level: "warning",
          summary,
          details,
          ...(path != null ? { path } : {}),
          ...(range != null ? { range } : {}),
        });
        logger.debug("Config warning", {
          safe: { summary, details },
          sensitive: {},
        });
        break;
      }
      case "fuzzyFileSearch/sessionUpdated": {
        this.fuzzyFileSearchController.onSessionUpdated(notification.params);
        break;
      }
      case "fuzzyFileSearch/sessionCompleted": {
        this.fuzzyFileSearchController.onSessionCompleted(notification.params);
        break;
      }
      case "error": {
        const { error, willRetry, threadId, turnId } = notification.params;
        const { message, codexErrorInfo, additionalDetails } = error;

        const conversationId = createConversationId(threadId);
        this.updateTurnState(conversationId, turnId, (turn) => {
          turn.items.push({
            id: uuidv4(),
            type: "error",
            message,
            willRetry,
            errorInfo: codexErrorInfo,
            additionalDetails: additionalDetails ?? null,
          });
        });
        break;
      }
    }

    const callbacks = this.notificationCallbacks.get(notification.method);
    if (callbacks == null) {
      return;
    }

    for (const callback of callbacks) {
      callback(notification);
    }
  }

  onResult(id: McpRequestId, result: unknown): void {
    const promise = this.requestPromises.get(id);
    if (promise) {
      logger.debug("Request completed", {
        safe: {
          id,
          method: String(promise.method),
          conversationId: promise.conversationId || "none",
          durationMs: Date.now() - promise.startedAtMs,
          pendingCountAfter: this.requestPromises.size - 1,
        },
        sensitive: {},
      });
      promise.resolve(result);
      this.requestPromises.delete(id);
    } else {
      logger.error("No promise for request ID", {
        safe: { id },
        sensitive: {},
      });
    }
  }

  onRequest(serverRequest: AppServer.ServerRequest): void {
    const { id, method, params } = serverRequest;
    if (this.shouldIgnoreThreadMutationAsFollower(method, params)) {
      return;
    }
    logger.debug("Received server request", {
      safe: {},
      sensitive: {
        id,
        method,
        params: params,
      },
    });

    switch (method) {
      case "item/permissions/requestApproval": {
        logger.warning("Ignoring unsupported permissions approval request", {
          safe: { method, id },
          sensitive: {},
        });
        break;
      }
      case "item/fileChange/requestApproval":
      case "item/commandExecution/requestApproval": {
        const threadId =
          "threadId" in params && typeof params.threadId === "string"
            ? params.threadId
            : null;
        if (!threadId) {
          logger.error(`Missing threadId for approval request`, {
            safe: {},
            sensitive: {
              id,
              params: params,
            },
          });
          return;
        }
        const conversationId = createConversationId(threadId);
        this.updateConversationState(conversationId, (draft) => {
          draft.requests.push(serverRequest);
          draft.hasUnreadTurn = true;
        });
        this.approvalRequestListeners.forEach((listener) =>
          listener({
            conversationId,
            requestId: id as McpRequestId,
            kind:
              method === "item/commandExecution/requestApproval"
                ? "commandExecution"
                : "fileChange",
            reason: (params as { reason?: string }).reason ?? null,
          }),
        );
        break;
      }
      case "item/tool/requestUserInput": {
        const threadId =
          "threadId" in params && typeof params.threadId === "string"
            ? params.threadId
            : null;
        if (!threadId) {
          logger.error(`Missing threadId for user input request`, {
            safe: {},
            sensitive: {
              id,
              params: params,
            },
          });
          return;
        }
        const conversationId = createConversationId(threadId);
        const requestId = createMcpRequestId(id);
        this.updateConversationState(conversationId, (draft) => {
          draft.requests.push(serverRequest);
          draft.hasUnreadTurn = true;
          upsertUserInputResponseSyntheticItem(
            draft,
            requestId,
            params,
            {},
            false,
          );
        });
        const firstQuestion = params.questions[0]?.question.trim() ?? null;
        this.userInputRequestListeners.forEach((listener) =>
          listener({
            conversationId,
            requestId,
            turnId: params.turnId,
            questionCount: params.questions.length,
            firstQuestion: firstQuestion?.length ? firstQuestion : null,
          }),
        );
        break;
      }
      case "item/tool/call": {
        void this.handleDynamicToolCallRequest(serverRequest);
        break;
      }
      case "mcpServer/elicitation/request": {
        const elicitation = getMcpServerElicitation(params);
        if (elicitation == null) {
          const response = buildMcpServerElicitationResponse("decline");
          logger.info(`Sending server response`, {
            safe: {},
            sensitive: {
              id,
              method,
              response,
            },
          });
          messageBus.dispatchMessage("mcp-response", {
            hostId: this.hostId,
            response: {
              id: createMcpRequestId(id),
              result: response,
            },
          });
          break;
        }

        const conversationId = createConversationId(params.threadId);
        this.updateConversationState(conversationId, (draft) => {
          draft.requests.push(castDraft(serverRequest));
          draft.hasUnreadTurn = true;
          upsertMcpServerElicitationSyntheticItem(
            draft,
            createMcpRequestId(id),
            params,
            false,
            null,
            elicitation,
          );
        });
        break;
      }
      case "account/chatgptAuthTokens/refresh":
        break;
      case "applyPatchApproval":
      case "execCommandApproval": {
        logger.warning("Ignored legacy approval request", {
          safe: { method, id },
          sensitive: {},
        });
        break;
      }
    }
  }

  private async handleDynamicToolCallRequest(
    serverRequest: Extract<
      AppServer.ServerRequest,
      { method: "item/tool/call" }
    >,
  ): Promise<void> {
    const { id, params } = serverRequest;
    const { threadId, tool } = params;
    if (!threadId) {
      logger.error(`Missing threadId for dynamic tool call request`, {
        safe: {},
        sensitive: {
          id,
          params,
        },
      });
      return;
    }

    let response: AppServer.v2.DynamicToolCallResponse;

    if (tool !== READ_THREAD_TERMINAL_TOOL_NAME) {
      response = buildDynamicToolFailureResponse(
        `Unsupported dynamic tool: ${tool}`,
      );
      this.sendDynamicToolCallResponse(id, response);
      return;
    }

    const argumentError = validateReadThreadTerminalToolArguments(
      params.arguments,
    );
    if (argumentError != null) {
      response = buildDynamicToolFailureResponse(argumentError);
      this.sendDynamicToolCallResponse(id, response);
      return;
    }

    const localTerminalSnapshot = terminalService.getSnapshotForConversation(
      createConversationId(threadId),
    );
    if (hasReadableThreadTerminalSnapshot(localTerminalSnapshot)) {
      response = buildReadThreadTerminalToolResponse(localTerminalSnapshot);
      this.sendDynamicToolCallResponse(id, response);
      return;
    }

    try {
      const terminalSnapshot = await fetchFromVSCode(
        "thread-terminal-snapshot",
        {
          params: {
            threadId,
          },
        },
      );
      response = buildReadThreadTerminalToolResponse(terminalSnapshot.session);
    } catch (error) {
      logger.error("Failed to resolve thread terminal snapshot", {
        safe: {
          threadId,
          tool,
        },
        sensitive: { error },
      });
      response = buildDynamicToolFailureResponse(
        "Failed to read the app terminal for this thread.",
      );
    }

    this.sendDynamicToolCallResponse(id, response);
  }

  private sendDynamicToolCallResponse(
    requestId: AppServer.RequestId,
    response: AppServer.v2.DynamicToolCallResponse,
  ): void {
    logger.info(`Sending server response`, {
      safe: {},
      sensitive: {
        id: requestId,
        response,
      },
    });
    messageBus.dispatchMessage("mcp-response", {
      hostId: this.hostId,
      response: {
        id: createMcpRequestId(requestId),
        result: response,
      },
    });
  }

  private applyOutputDelta(
    conversationId: ConversationId,
    turnId: string | null,
    itemId: string,
    delta: string,
  ): void {
    this.updateTurnState(
      conversationId,
      turnId,
      (turn) => {
        const targetItem = findItem(turn, itemId, "commandExecution");
        if (targetItem) {
          const truncationPrefix = "[output truncated]\n";
          const current = targetItem.aggregatedOutput ?? "";
          const rawCurrent = current.startsWith(truncationPrefix)
            ? current.slice(truncationPrefix.length)
            : current;
          const { next, didTruncate } = appendCappedOutput({
            current: rawCurrent,
            delta,
          });
          targetItem.aggregatedOutput =
            didTruncate || rawCurrent !== current
              ? truncationPrefix + next
              : next;
          return;
        }
        logger.error("Dropping commandExecution/outputDelta for missing item", {
          safe: { itemId, conversationId, turnId },
          sensitive: {},
        });
      },
      false,
    );
  }

  private applyFrameTextDeltas(
    entries: Array<TextDeltaEntry<ConversationId>>,
  ): void {
    if (entries.length === 0) {
      return;
    }

    const entriesByConversation = new Map<
      ConversationId,
      Array<TextDeltaEntry<ConversationId>>
    >();
    for (const entry of entries) {
      const existingEntries = entriesByConversation.get(entry.conversationId);
      if (existingEntries) {
        existingEntries.push(entry);
      } else {
        entriesByConversation.set(entry.conversationId, [entry]);
      }
    }

    for (const [conversationId, conversationEntries] of entriesByConversation) {
      this.updateConversationState(conversationId, (draft) => {
        for (const entry of conversationEntries) {
          const targetTurn = findTurnForEvent(draft, entry.turnId);
          if (!targetTurn) {
            continue;
          }

          switch (entry.target.type) {
            case "agentMessage": {
              const targetItem = findItem(
                targetTurn,
                entry.itemId,
                "agentMessage",
              );
              if (targetItem) {
                targetItem.text = (targetItem.text ?? "") + entry.delta;
              }
              break;
            }
            case "plan": {
              const targetItem = findItem(targetTurn, entry.itemId, "plan");
              if (targetItem) {
                targetItem.text = (targetItem.text ?? "") + entry.delta;
              }
              break;
            }
            case "reasoningSummary": {
              const targetItem = findItem(
                targetTurn,
                entry.itemId,
                "reasoning",
              );
              if (!targetItem) {
                break;
              }
              const summaryIndex = entry.target.summaryIndex;
              if (!Number.isSafeInteger(summaryIndex) || summaryIndex < 0) {
                logger.warning("Invalid reasoning summary index", {
                  safe: { summaryIndex: String(summaryIndex) },
                  sensitive: {},
                });
                break;
              }
              const summary = ensureLength(
                targetItem.summary,
                summaryIndex,
                "",
              );
              summary[summaryIndex] = summary[summaryIndex] + entry.delta;
              break;
            }
            case "reasoningContent": {
              const targetItem = findItem(
                targetTurn,
                entry.itemId,
                "reasoning",
              );
              if (!targetItem) {
                break;
              }
              const contentIndex = entry.target.contentIndex;
              if (!Number.isSafeInteger(contentIndex) || contentIndex < 0) {
                logger.warning("Invalid reasoning content index", {
                  safe: { contentIndex: String(contentIndex) },
                  sensitive: {},
                });
                break;
              }
              const content = ensureLength(
                targetItem.content,
                contentIndex,
                "",
              );
              content[contentIndex] = content[contentIndex] + entry.delta;
              break;
            }
          }
        }
      });
    }
  }

  private shouldIgnoreThreadMutationAsFollower(
    method:
      | AppServerWebviewNotificationMethod
      | AppServer.ServerRequest["method"],
    params: { [key: string]: unknown },
  ): boolean {
    const isThreadMutationMethod =
      method.startsWith("turn/") ||
      method.startsWith("item/") ||
      method === "thread/started" ||
      method === "thread/status/changed" ||
      method === "thread/tokenUsage/updated" ||
      method === "error";
    if (!isThreadMutationMethod) {
      return false;
    }

    const threadId = getThreadIdForMutationEvent(params);
    if (!threadId) {
      return false;
    }

    const role = this.getStreamRole(createConversationId(threadId));
    return role?.role === "follower";
  }

  private getApprovalActionContext(): ApprovalActionContext {
    return buildApprovalActionContext({
      hostId: this.hostId,
      getStreamRole: this.getStreamRole.bind(this),
      conversations: this.conversations,
      updateConversationState: this.updateConversationState.bind(this),
      upsertMcpServerElicitationSyntheticItem,
      upsertUserInputResponseSyntheticItem,
    });
  }

  /**
   * Responds to a server-initiated command execution approval request.
   */
  replyWithCommandExecutionApprovalDecision(
    conversationId: ConversationId,
    requestId: McpRequestId,
    decision: AppServer.v2.CommandExecutionApprovalDecision,
  ): void {
    replyWithCommandExecutionApprovalDecisionAction(
      this.getApprovalActionContext(),
      conversationId,
      requestId,
      decision,
    );
  }

  /**
   * Responds to a server-initiated file change approval request.
   */
  replyWithFileChangeApprovalDecision(
    conversationId: ConversationId,
    requestId: McpRequestId,
    decision: AppServer.v2.FileChangeApprovalDecision,
  ): void {
    replyWithFileChangeApprovalDecisionAction(
      this.getApprovalActionContext(),
      conversationId,
      requestId,
      decision,
    );
  }

  /**
   * Responds to a server-initiated request_user_input prompt.
   */
  replyWithUserInputResponse(
    conversationId: ConversationId,
    requestId: McpRequestId,
    response: AppServer.v2.ToolRequestUserInputResponse,
  ): void {
    replyWithUserInputResponseAction(
      this.getApprovalActionContext(),
      conversationId,
      requestId,
      response,
    );
  }

  replyWithMcpServerElicitationResponse(
    conversationId: ConversationId,
    requestId: McpRequestId,
    response: AppServer.v2.McpServerElicitationRequestResponse,
  ): void {
    replyWithMcpServerElicitationResponseAction(
      this.getApprovalActionContext(),
      conversationId,
      requestId,
      response,
    );
  }

  onError(id: McpRequestId, error: unknown): void {
    const promise = this.requestPromises.get(id);
    if (promise) {
      logger.error("Request failed", {
        safe: {
          id,
          method: String(promise.method),
          durationMs: Date.now() - promise.startedAtMs,
          timeoutMs: promise.timeoutMs,
          pendingCountAfter: this.requestPromises.size - 1,
        },
        sensitive: {
          conversationId: promise.conversationId ?? "none",
          error: error,
        },
      });
      promise.reject(error);
      this.requestPromises.delete(id);
      return;
    }
    logger.error(`Received app server error`, {
      safe: {},
      sensitive: {
        id,
        error: error,
      },
    });
  }

  async sendRequest<M extends keyof CliResponse>(
    method: M,
    params: CliRequest<M>["params"],
    opts?: { timeoutMs?: number },
  ): Promise<CliRequest<M>["response"]> {
    return this.sendUntypedRequest<CliRequest<M>["response"]>(
      String(method),
      params,
      opts,
    );
  }

  async updateThreadGitBranch(
    conversationId: ConversationId,
    branch: string,
  ): Promise<boolean> {
    return updateThreadGitBranchRequest(this, conversationId, branch);
  }

  private async sendUntypedRequest<T>(
    method: string,
    params: unknown,
    opts?: { timeoutMs?: number },
  ): Promise<T> {
    const requestId = uuidv4() as McpRequestId;
    const timeoutMs = opts?.timeoutMs ?? 0;
    const conversationId = getConversationIdForMcpParams(params);
    const pendingCountBefore = this.requestPromises.size;
    const promise = new Promise<T>((resolve, reject) => {
      let timeoutId: number | undefined;
      if (opts?.timeoutMs) {
        timeoutId = window.setTimeout(() => {
          logger.warning("mcp_request_timeout", {
            safe: {
              requestId,
              method: String(method),
              conversationId: conversationId ?? "none",
              timeoutMs: opts.timeoutMs ?? 0,
              pendingCount: this.requestPromises.size,
            },
            sensitive: {},
          });
          reject(new Error("Timeout"));
        }, opts.timeoutMs);
      }
      this.requestPromises.set(requestId, {
        resolve: (r) => {
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }
          resolve(r as T);
        },
        reject: (e) => {
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }
          reject(e);
        },
        method,
        startedAtMs: Date.now(),
        conversationId,
        timeoutMs,
      });
    });
    logger.debug("mcp_request_enqueued", {
      safe: {
        requestId,
        method: String(method),
        conversationId: conversationId ?? "none",
        timeoutMs,
        pendingCountBefore,
        pendingCountAfter: this.requestPromises.size,
      },
      sensitive: {},
    });
    const request = {
      id: requestId,
      method,
      params,
    };
    messageBus.dispatchMessage("mcp-request", {
      request: request as unknown as AppServer.ClientRequest,
      hostId: this.hostId,
    });
    return promise;
  }

  async sendThreadFollowerRequest<
    M extends
      | "thread-follower-start-turn"
      | "thread-follower-steer-turn"
      | "thread-follower-interrupt-turn"
      | "thread-follower-set-model-and-reasoning"
      | "thread-follower-set-collaboration-mode"
      | "thread-follower-edit-last-user-turn"
      | "thread-follower-set-queued-follow-ups-state",
  >(
    role: StreamRole | null,
    method: M,
    params: IpcRequestMessageContent[M]["params"],
  ): Promise<IpcRequestMessageContent[M]["response"] | null> {
    if (role?.role !== "follower") {
      return null;
    }
    const response = await ipcRequest(method, params, {
      targetClientId: role.ownerClientId,
    });
    if (response.resultType === "error") {
      throw new Error(response.error);
    }
    return response.result;
  }

  async setLatestCollaborationModeForConversation(
    conversationId: ConversationId,
    collaborationMode: AppServer.CollaborationMode,
  ): Promise<void> {
    const role = this.getStreamRole(conversationId);
    const followerSetModeResponse = await this.sendThreadFollowerRequest(
      role,
      "thread-follower-set-collaboration-mode",
      {
        conversationId,
        collaborationMode,
      },
    );
    if (followerSetModeResponse) {
      return;
    }

    this.updateConversationState(conversationId, (draft) => {
      draft.latestCollaborationMode = collaborationMode;
    });
  }

  syncQueuedFollowUpsState(
    conversationId: ConversationId,
    state: QueuedFollowUpState,
  ): void {
    const role = this.getStreamRole(conversationId);
    void this.sendThreadFollowerRequest(
      role,
      "thread-follower-set-queued-follow-ups-state",
      {
        conversationId,
        state,
      },
    ).catch((error) => {
      logger.error("Failed to forward queued follow-ups", {
        safe: { conversationId },
        sensitive: { error },
      });
    });
  }

  async buildNewConversationParams(
    model: string | null,
    serviceTier: AppServer.ServiceTier | null | undefined,
    cwd: string,
    permissions: PermissionsConfig,
    approvalsReviewer: AppServer.v2.ApprovalsReviewer,
    options?: {
      includeDeveloperInstructions?: boolean;
      threadId?: string | null;
    },
  ): Promise<AppServer.v2.ThreadStartParams> {
    const effectiveServiceTier = this.getEffectiveServiceTier(serviceTier);
    let params = await buildNewConversationParams(
      model,
      effectiveServiceTier,
      () => fetchFromVSCode("get-copilot-api-proxy-info"),
      cwd,
      permissions,
      async () => {
        const response = await fetchFromVSCode("mcp-codex-config");
        return response.config;
      },
      this.personality,
      approvalsReviewer,
    );
    const overrides =
      __WINDOW_TYPE__ === "electron"
        ? filterFeatureOverridesForDesktopThreadStart(
            this.defaultFeatureOverrides,
            (await fetchFromVSCode("os-info")).platform,
          )
        : this.defaultFeatureOverrides;
    // Defaults are best-effort; they may be unset until the webview publishes
    // its Statsig values to the shared object.
    params = applyFeatureOverridesToThreadStartParams(params, overrides);
    if (__WINDOW_TYPE__ === "electron") {
      params = await applyWorktreeShellEnvironmentConfigRequest(
        this,
        params,
        cwd,
      );
      params = {
        ...params,
        dynamicTools: [READ_THREAD_TERMINAL_TOOL],
      };
      if (options?.includeDeveloperInstructions !== false) {
        const developerInstructions = await fetchFromVSCode(
          "developer-instructions",
          {
            params: {
              baseInstructions: params.developerInstructions ?? null,
              cwd: params.cwd ?? cwd,
              threadId: options?.threadId ?? null,
            },
          },
        );
        params = {
          ...params,
          developerInstructions: developerInstructions.instructions,
        };
      }
    }
    return params;
  }

  private getLastAgentMessageForTurn(
    conversationId: ConversationId,
    turnId: string,
  ): string | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    const targetTurn =
      conversation.turns.find((candidate) => candidate.turnId === turnId) ??
      null;
    if (!targetTurn) {
      return null;
    }

    const agentMessage = findLast(
      targetTurn.items,
      (candidate): candidate is ItemForType<"agentMessage"> =>
        candidate.type === "agentMessage",
    );
    if (!agentMessage) {
      return null;
    }

    return agentMessage.text;
  }

  private handleTurnDirectives(
    conversationId: ConversationId,
    turnId: string,
    markdown: string | null,
  ): void {
    handleTurnDirectivesAction(
      {
        processedDirectiveTurnKeys: this.processedDirectiveTurnKeys,
        getConversation: (targetConversationId) => {
          return this.conversations.get(targetConversationId);
        },
        performArchiveConversation: (
          targetConversationId,
          archiveCwd,
          options,
        ) => {
          return this.performArchiveConversation(
            targetConversationId,
            archiveCwd,
            options,
          );
        },
        refreshRecentConversations: () => {
          return this.refreshRecentConversations();
        },
      },
      conversationId,
      turnId,
      markdown,
    );
  }

  updateConversationState(
    conversationId: ConversationId,
    recipe: (draft: WritableDraft<AppServerConversationState>) => void,
    shouldBroadcast = true,
  ): void {
    const conversationState = this.conversations.get(conversationId);
    if (!conversationState) {
      logger.error("Conversation state not found", {
        safe: { conversationId },
        sensitive: {},
      });
      return;
    }
    if (shouldBroadcast) {
      const [newState, patches] = produceWithPatches(conversationState, recipe);
      this.setConversation(newState);
      this.notifyConversationCallbacks(conversationId);
      this.broadcastIpcStatePatches(conversationId, patches);
      return;
    }
    const nextState = produce(conversationState, recipe);
    this.setConversation(nextState);
    this.notifyConversationCallbacks(conversationId);
  }

  setReviewPaneSnapshotMetrics(metrics: ReviewPaneSnapshotMetrics): void {
    this.reviewPaneSnapshotMetrics = metrics;
  }

  collectAppStateSnapshot(
    reason: AppStateSnapshotReason,
  ): AppStateSnapshotFields {
    return this.webviewSampler.collectSnapshot(reason);
  }

  private broadcastIpcStatePatches(
    conversationId: ConversationId,
    patches: Array<Patch>,
  ): void {
    if (patches.length === 0) {
      return;
    }
    const role = this.getStreamRole(conversationId);
    if (role?.role !== "owner") {
      return;
    }
    messageBus.dispatchMessage("thread-stream-state-changed", {
      conversationId,
      change: {
        type: "patches",
        patches: patches as Array<ImmerPatch>,
      },
      version: getIpcMessageVersion("thread-stream-state-changed"),
    });
  }

  broadcastConversationSnapshot(conversationId: ConversationId): void {
    const role = this.getStreamRole(conversationId);
    if (role?.role !== "owner") {
      return;
    }
    const conversationState = this.conversations.get(conversationId);
    if (!conversationState) {
      return;
    }
    messageBus.dispatchMessage("thread-stream-state-changed", {
      conversationId,
      change: {
        type: "snapshot",
        conversationState: conversationState as unknown as Record<
          string,
          unknown
        >,
      },
      version: getIpcMessageVersion("thread-stream-state-changed"),
    });
  }

  markConversationStreaming(conversationId: ConversationId): void {
    this.streamingConversations.add(conversationId);
  }

  setConversationStreamRole(
    conversationId: ConversationId,
    role: StreamRole,
  ): void {
    this.streamRoles.set(conversationId, role);
  }

  private handleThreadStreamStateChanged(
    conversationId: ConversationId,
    change: ThreadStreamStateChange,
    sourceClientId: string,
  ): void {
    const role = this.getStreamRole(conversationId);
    if (role?.role === "owner" && change.type !== "snapshot") {
      // If we are the owner, don't accept patches because they came from another host and aren't valid to apply on top of whatever state we had.
      return;
    }

    if (change.type === "snapshot") {
      const conversationState = deserializeConversationState(
        change.conversationState,
        this.hostId,
      );
      this.setConversation(conversationState);
      this.markConversationStreaming(conversationId);
      this.notifyConversationCallbacks(conversationId);
      this.setConversationStreamRole(conversationId, {
        role: "follower",
        ownerClientId: sourceClientId,
      });
      return;
    }
    // We have accepted a state from another host, we are now a follower.
    this.setConversationStreamRole(conversationId, {
      role: "follower",
      ownerClientId: sourceClientId,
    });
    if (change.type === "patches") {
      const conversationState = this.conversations.get(conversationId);
      if (!conversationState) {
        return;
      }
      try {
        const nextState = applyPatches(conversationState, change.patches);
        this.setConversation(nextState);
        this.notifyConversationCallbacks(conversationState.id);
      } catch (error) {
        logger.warning("Failed to apply patches for", {
          safe: { conversationId: conversationState.id },
          sensitive: {
            conversationId: conversationState.id,
            error: error,
          },
        });
      }
    }
  }

  private handleThreadArchived(conversationId: ConversationId): void {
    invalidateSearch({
      hostId: this.hostId,
      queryClient: this.queryClient,
    });
    if (
      !this.conversations.has(conversationId) &&
      !this.streamingConversations.has(conversationId) &&
      !this.streamRoles.has(conversationId)
    ) {
      return;
    }
    this.removeConversationFromCache(conversationId);
  }

  private async handleThreadUnarchived(
    conversationId: ConversationId,
  ): Promise<void> {
    invalidateSearch({
      hostId: this.hostId,
      queryClient: this.queryClient,
    });
    this.suppressedArchivedConversationIds.delete(conversationId);
    this.notifyAnyConversationCallbacks({ forceAny: true });
    await this.refreshRecentConversations({
      sortKey: this.recentConversationsSortKey,
    });
  }

  markConversationAsRead(conversationId: ConversationId): void {
    const conversationState = this.conversations.get(conversationId);
    if (!conversationState || !conversationState.hasUnreadTurn) {
      return;
    }
    this.updateConversationState(conversationId, (draft) => {
      draft.hasUnreadTurn = false;
    });
  }

  markConversationAsUnread(conversationId: ConversationId): void {
    const conversationState = this.conversations.get(conversationId);
    if (!conversationState || conversationState.hasUnreadTurn) {
      return;
    }
    this.updateConversationState(conversationId, (draft) => {
      draft.hasUnreadTurn = true;
    });
  }

  private notifyConversationCallbacks(conversationId: ConversationId): void {
    const state = this.conversations.get(conversationId);
    if (!state) {
      logger.error("No conversation state for conversation ID", {
        safe: { conversationId },
        sensitive: {},
      });
      return;
    }
    const callbacks = this.conversationCallbacks.get(conversationId);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(state);
      }
    }
    const nextMetaSnapshot = toConversationMetaSnapshot(state);
    const lastAnySnapshot = this.lastAnySnapshotById.get(conversationId);
    const shouldNotifyAny =
      !lastAnySnapshot ||
      !conversationMetaSnapshotEqual(lastAnySnapshot, nextMetaSnapshot);
    this.lastAnySnapshotById.set(conversationId, nextMetaSnapshot);

    const lastMetaSnapshot = this.lastMetaSnapshotById.get(conversationId);
    const shouldNotifyMeta =
      !lastMetaSnapshot ||
      !conversationMetaSnapshotEqual(lastMetaSnapshot, nextMetaSnapshot);
    this.lastMetaSnapshotById.set(conversationId, nextMetaSnapshot);

    if (!shouldNotifyAny && !shouldNotifyMeta) {
      return;
    }
    this.notifyAnyConversationCallbacks({
      forceAny: shouldNotifyAny,
      forceMeta: shouldNotifyMeta,
    });
  }

  private notifyAnyConversationCallbacks({
    forceAny = false,
    forceMeta = false,
  }: {
    forceAny?: boolean;
    forceMeta?: boolean;
  } = {}): void {
    const conversations = this.getRecentConversations();
    const orderKey = conversationsOrderKey(conversations);
    const shouldNotifyAny = forceAny || orderKey !== this.lastAnyOrderKey;
    const shouldNotifyMeta = forceMeta || orderKey !== this.lastMetaOrderKey;
    if (shouldNotifyAny) {
      this.lastAnyOrderKey = orderKey;
      for (const callback of this.anyConversationCallbacks) {
        callback(conversations);
      }
    }
    if (shouldNotifyMeta) {
      this.lastMetaOrderKey = orderKey;
      for (const callback of this.anyConversationMetaCallbacks) {
        callback(conversations);
      }
    }
  }

  private removeConversationFromCache(conversationId: ConversationId): void {
    terminalService.closeForConversation(conversationId);
    removePendingRequestForConversation(conversationId);
    this.conversations.delete(conversationId);
    this.pinnedConversationIds.delete(conversationId);
    this.removeConversationFromSortedCache(conversationId);
    this.streamingConversations.delete(conversationId);
    this.conversationCallbacks.delete(conversationId);
    this.streamRoles.delete(conversationId);
    this.lastAnySnapshotById.delete(conversationId);
    this.lastMetaSnapshotById.delete(conversationId);
    this.recentConversationIds = this.recentConversationIds.filter(
      (id) => id !== conversationId,
    );
    this.notifyAnyConversationCallbacks();
  }

  private setLatestConfigNotice(notice: AppServerConfigNotice): void {
    const existingIndex = this.configNotices.findIndex((existing) =>
      isEqual(existing, notice),
    );
    const nextNotices =
      existingIndex === -1
        ? [...this.configNotices, notice]
        : [
            ...this.configNotices.slice(0, existingIndex),
            ...this.configNotices.slice(existingIndex + 1),
            notice,
          ];
    this.configNotices = nextNotices.slice(-MAX_CONFIG_NOTICES);
    for (const callback of this.configNoticeCallbacks) {
      callback();
    }
  }

  public __setConversationForStorybook(
    conversation: AppServerConversationState,
  ): void {
    this.setConversation(conversation);
    if (!this.recentConversationIds.includes(conversation.id)) {
      this.recentConversationIds.unshift(conversation.id);
    }
    this.notifyConversationCallbacks(conversation.id);
  }
}
