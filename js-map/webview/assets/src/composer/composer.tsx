import path from "path";

import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import sortBy from "lodash/sortBy";
import { useScope } from "maitai";
import type {
  AdhocEnvironment,
  AgentMode,
  AsyncThreadStartingState,
  BuildStartConversationParamsInput,
  CodeTaskDetailsResponse,
  CommentInputItem,
  ConversationId,
  FileDescriptor,
  GhPullRequestCheck,
  GitRepository,
  IdeContext,
  ImageAssetPointer,
  PriorConversation,
  QueuedFollowUpMessage,
  ReviewFindingComment,
  VSCodeFetchRequest,
} from "protocol";
import {
  buildHotkeyWindowRemoteConversationRoute,
  buildHotkeyWindowWorktreeInitRoute,
  buildHotkeyWindowThreadRoute,
  buildLocalConversationRoute,
  buildRemoteConversationRoute,
  buildPermissionsConfigForMode,
  createConversationId,
  createGitCwd,
  isCodexWorktree,
  maybeErrorToString,
} from "protocol";
import type { ReactNode, SetStateAction } from "react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  defineMessages,
  FormattedMessage,
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from "react-intl";
import { useLocation, useNavigate } from "react-router";
import { v4 as uuidv4 } from "uuid";

import type { AppServerManager } from "@/app-server/app-server-manager";
import {
  useAppServerManagerForConversationId,
  useAppServerManagerForHost,
  useLocalConversationCwd,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { maybeResumeConversation } from "@/app-server/requests/maybe-resume-conversation";
import { startTurn } from "@/app-server/requests/start-turn";
import {
  isSteerTurnInactiveError,
  steerTurn,
} from "@/app-server/requests/steer-turn";
import {
  releaseStartTurnLock,
  tryAcquireStartTurnLock,
} from "@/app-server/start-turn-lock";
import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { buildWorktreeLabelFromInput } from "@/app-server/utils/build-worktree-label-from-input";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { useCodexCloudAccess } from "@/auth/use-codex-cloud-access";
import { buildCodeCommentPromptData } from "@/code-comment-directives";
import {
  createWorktreeSnapshotUploadUrl,
  finishWorktreeSnapshotUpload,
  useCreateCloudTaskMutation,
  useFollowUpToCloudTaskMutation,
} from "@/codex-api";
import { runCommand } from "@/commands/run-command";
import { isCompactWindowContextFromWindow } from "@/compact-window/is-compact-window-context";
import {
  RateLimitModelLimitBanner,
  RateLimitUpsellBanner,
} from "@/components/rate-limit-upsell-banner";
import { toast$ } from "@/components/toaster/toast-signal";
import { WindowsSandboxBanner } from "@/components/windows/windows-sandbox-banner";
import {
  ABOVE_COMPOSER_PORTAL_ID,
  ABOVE_COMPOSER_QUEUE_PORTAL_ID,
} from "@/composer/above-composer-portal-id";
import { ComposerExternalFooter } from "@/composer/composer-external-footer";
import { routeCharacterInputToComposer } from "@/composer/focus-composer";
import { WorktreeEnvironmentDropdown } from "@/composer/worktree-environment-dropdown";
import { useGitDefaultBranch } from "@/git-rpc/use-git-default-branch";
import type { HomeLocationState } from "@/home-page";
import { useEnterBehavior } from "@/hooks/use-enter-behavior";
import { useFollowUpQueueMode } from "@/hooks/use-follow-up-queue-mode";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import { useWindowType } from "@/hooks/use-window-type";
import { useShowWindowsSandboxBanner } from "@/hooks/use-windows-sandbox-banner";
import { useWindowsSandboxRequirement } from "@/hooks/use-windows-sandbox-requirement";
import { useWindowsSandboxSetup } from "@/hooks/use-windows-sandbox-setup";
import { isHotkeyWindowContextFromWindow } from "@/hotkey-window/is-hotkey-window-context";
import { HotkeyWindowNewSlashCommand } from "@/hotkey-window/slash-commands/hotkey-window-new-slash-command";
import { HotkeyWindowResumeSlashCommand } from "@/hotkey-window/slash-commands/hotkey-window-resume-slash-command";
import { HotkeyWindowSelectProjectSlashCommand } from "@/hotkey-window/slash-commands/hotkey-window-select-project-slash-command";
import CommentIcon from "@/icons/comment.svg";
import Document from "@/icons/document.svg";
import PastedTextIcon from "@/icons/pasted-text.svg";
import WarningIcon from "@/icons/warning.svg";
import { detectIsMacOS } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { getAgentMentionColorCssValueForSessionId } from "@/local-conversation/items/multi-agent-mentions";
import { useResolvedLocalEnvironmentSelection } from "@/local-conversation/local-environment-selection";
import { shouldRenderPendingRequestInComposer } from "@/local-conversation/pending-request";
import { usePendingRequest } from "@/local-conversation/pending-request-atom";
import { useForkConversationActions } from "@/local-conversation/use-fork-conversation-actions";
import { messageBus, useMessage } from "@/message-bus";
import { usePlugins } from "@/plugins/use-plugins";
import {
  mapCloudTaskToPriorConversation,
  mapLocalConversationToPriorConversation,
} from "@/prior-conversation";
import { productEventLogger$ } from "@/product-event-signal";
import type { ServiceTierAnalyticsValue } from "@/product-events";
import { useCustomPrompts } from "@/prompts/custom-prompts";
import {
  buildPromptContextSection,
  renderComposerPrompt,
} from "@/prompts/render-prompt";
import { useEnabledInstalledApps } from "@/queries/apps-queries";
import { useRateLimit } from "@/queries/usage-queries";
import { useSelectedRemoteProject } from "@/remote-projects/remote-projects";
import { AppScope } from "@/scopes/app-scope";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { useSkills } from "@/skills/use-skills";
import { useGate } from "@/statsig/statsig";
import { terminalService } from "@/terminal/terminal-service";
import { uploadImageDataUrlForCodex } from "@/uploads/upload-image";
import { gitRootForOriginUrl, useGitRootForCwd } from "@/utils/git-root";
import { logger } from "@/utils/logger";
import { shouldShowReauthError } from "@/utils/maybe-error-to-string";
import { normalizeFsPath, normalizePath } from "@/utils/path";
import { setPersistedValue } from "@/utils/persisted-atom-store";

import "prosemirror-view/style/prosemirror.css";
import {
  getRateLimitResetAt,
  isCoreRateLimitReached,
} from "@/utils/rate-limit-status";
import { stripLineInfoFromLabel } from "@/utils/strip-line-info-from-label";
import type { ExtractDiscriminated, MaybePromise } from "@/utils/types";
import { useDebouncedValue } from "@/utils/use-debounced-value";
import { useEnvironment } from "@/utils/use-environment";
import {
  getActiveRateLimitAlertData,
  getActiveRateLimitEntry,
  getRateLimitBannerMode,
  getRateLimitEntries,
  getRateLimitEntryResetAt,
  getRateLimitName,
  isDefaultRateLimitName,
  isSelectedModelRateLimitReached,
} from "@/utils/use-rate-limit";
import {
  fetchFromVSCode,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";
import { usePendingWorktreeActions } from "@/worktrees-v2/pending-worktree-store";

import { AboveComposerSuggestions } from "./above-composer-suggestions";
import { AtMentionList } from "./at-mention-list";
import { CommentAttachments } from "./attachments/comment-attachments";
import { ComposerAttachmentPill } from "./attachments/composer-attachment-pill";
import { FileAttachment } from "./attachments/file-attachment";
import { ImageAttachment } from "./attachments/image";
import { AutocompleteOverlay } from "./autocomplete-overlay";
import {
  collectBackgroundSubagentLatestReferences,
  getBackgroundSubagentParentTurnKey,
} from "./background-subagents";
import { BackgroundSubagentsPanel } from "./background-subagents-panel";
import { getBackgroundTerminals } from "./background-terminals";
import { BackgroundTerminalsPanel } from "./background-terminals-panel";
import { buildStartConversationParams } from "./build-start-conversation-params";
import {
  aAgentMode,
  aComposerBestOfN,
  aDefaultComposerAutoContext,
  aSkipThreadBranchMismatchConfirm,
} from "./composer-atoms";
import { ComposerBranchMismatchDialog } from "./composer-branch-mismatch-dialog";
import {
  getFollowUpConversationId,
  type FollowUpProps,
} from "./composer-follow-up";
import { useComposerPromptHistory } from "./composer-history";
import type { ComposerImageDataUrl } from "./composer-image-data-url";
import { ComposerInternalFooter } from "./composer-internal-footer";
import {
  getInProgressFollowUpAction,
  handleComposerFocusedShortcut,
} from "./composer-shortcuts";
import {
  getComposerStateId,
  useComposerViewState,
  useMigrateComposerViewState,
  type ComposerImageAttachment,
  type ComposerViewState,
} from "./composer-view-state";
import { createImageLocalInputItem } from "./create-image-local-input-item";
import { dedupeFileDescriptors } from "./dedupe-file-descriptors";
import { expandCustomPrompt } from "./expand-custom-prompt";
import {
  HOTKEY_WINDOW_HOME_ABOVE_COMPOSER_UI_OPEN_ATTR,
  isHotkeyWindowHomePathname,
} from "./hotkey-window-home-composer-menu";
import { buildImageFileAttachments } from "./image-file-attachments";
import { isLikelyImageFile } from "./is-likely-image-file";
import { PendingRequestItemPanel } from "./pending-request-item-panel";
import { mentionUiKey } from "./prosemirror/at-mentions-plugin";
import { ComposerControllerScope } from "./prosemirror/composer-controller-context";
import { setCustomKeymapHandlers } from "./prosemirror/custom-keymap-plugin";
import { hasSerializedPromptMentions } from "./prosemirror/prompt-text";
import { RichTextInput } from "./prosemirror/rich-text-input";
import { skillMentionUiKey } from "./prosemirror/skill-mentions-plugin";
import { slashCommandUiKey } from "./prosemirror/slash-commands-plugin";
import { addTransactionListener } from "./prosemirror/transaction-event-plugin";
import {
  useComposerController,
  useComposerControllerState,
} from "./prosemirror/use-composer-controller";
import { useQueuedFollowUps } from "./queued-follow-ups-store";
import { QueuedMessageList } from "./queued-message-list";
import { ReviewSlashCommand } from "./review-mode/use-register-review-command";
import { SkillMentionAutocompleteOverlay } from "./skill-mention-autocomplete-overlay";
import { SkillsSlashCommands } from "./skills-slash-commands";
import { ForkSlashCommand } from "./slash-commands/fork-slash-command";
import { IdeContextSlashCommand } from "./slash-commands/ide-context-slash-command";
import { McpSlashCommand } from "./slash-commands/mcp-slash-command";
import { ModelSlashCommand } from "./slash-commands/model-slash-command";
import { PersonalitySlashCommand } from "./slash-commands/personality-slash-command";
import { PlanModeSlashCommand } from "./slash-commands/plan-mode-slash-command";
import { ReasoningSlashCommand } from "./slash-commands/reasoning-slash-command";
import {
  aSlashCommands,
  aSlashCommandMenuOpen,
  type SlashCommand,
} from "./slash-commands/slash-command";
import { SlashCommandMenuController } from "./slash-commands/slash-command-menu-controller";
import { SpeedSlashCommand } from "./slash-commands/speed-slash-command";
import { StatusSlashCommand } from "./slash-commands/status-slash-command";
import {
  getSubmitBlockMessage,
  getSubmitBlockReason,
} from "./submit-block-reason";
import { SubmitBlockedDialog } from "./submit-blocked-dialog";
import { useAtMentionSections } from "./use-at-mention-sections";
import { useBackgroundSubagentMentionItems } from "./use-background-subagent-mention-items";
import { useCollaborationMode } from "./use-collaboration-mode";
import { useAtMentionAutocomplete } from "./use-file-mention-autocomplete";
import { useHasAboveComposerPortalContent } from "./use-has-above-composer-portal-content";
import { useIdeContextIpcStatus } from "./use-ide-context-ipc-status";
import { useModelInputCapability } from "./use-model-input-capability";
import { usePersonality } from "./use-personality";
import { useSelectedRemoteHostId } from "./use-selected-remote-host-id";
import { useSkillMentionAutocomplete } from "./use-skill-mention-autocomplete";
import { useSyncCommentsToComposerViewState } from "./use-sync-comments-to-composer-view-state";
import { resolveWorktreeSubmitPaths } from "./worktree-submit-paths";

/** Whether the composer is currently set to follow-up with a local or cloud task. */
export type ComposerMode = "local" | "cloud" | "worktree";

/**
 * working-tree: Create a new cloud task that references the previous task and includes the current working tree.
 * direct-follow-up: Follow-up directly to the existing task but does not include any new code changes.
 */
export type CloudFollowUpStartingState = "working-tree" | "direct-follow-up";

export type BaseComposerSubmitContext = {
  prompt: string;
  addedFiles: Array<FileDescriptor>;
  fileAttachments: Array<FileDescriptor>;
  ideContext: IdeContext | null;
  priorConversation?: PriorConversation;

  /**
   * Images the user has attached. Each `src` can be a data: URI or a local file URL/path.
   * When in cloud mode, we start uploading immediately and attach an asset pointer when ready.
   */
  imageAttachments: Array<ComposerImageAttachment>;
  commentAttachments?: Array<CommentInputItem>;
  pullRequestChecks?: Array<GhPullRequestCheck>;
  reviewFindings?: Array<ReviewFindingComment>;
};

export type LocalComposerSubmitContext = BaseComposerSubmitContext & {
  workspaceRoots?: VSCodeFetchRequest["active-workspace-roots"]["response"];
  collaborationMode?: AppServer.CollaborationMode;
};

/**
 * Helps simplify the many permutations of different types of cloud tasks that can be created.
 */
type CloudTaskSubmissionType =
  | {
      type: "new-task";
      startingState:
        | {
            type: "working-tree";
          }
        | {
            type: "branch";
            branchName: string;
          }
        // Create a new task that references an existing task.
        // This is the mechanism by which you can follow-up on a previous cloud task
        // but include the current working tree.
        | {
            type: "fork-cloud-task";
            taskDetails: CodeTaskDetailsResponse;
          }
        // Create a new task that references a local conversation.
        // This is the mechanism by which you can move a local task to the cloud.
        | {
            type: "fork-local-task";
            conversationId: ConversationId;
          };
    }
  | {
      type: "follow-up";
      taskId: string;
      turnId: string;
    };

export type CloudComposerSubmitContext = BaseComposerSubmitContext & {
  cloudTaskType: CloudTaskSubmissionType;
  repo: GitRepository | null;
  bestOfN?: number;
};

type LocalExecutionOptions = {
  appServerManager?: AppServerManager;
  workspaceRoots?: Array<string>;
};

type PendingBranchMismatchFollowUp = {
  context: LocalComposerSubmitContext;
  cwd: string;
  inProgressMessageType?: "steer" | "queue" | "stop";
  localExecutionOptions?: LocalExecutionOptions;
  restoreMessage?: QueuedFollowUpMessage;
};

const EMPTY_TURNS: Array<AppServerConversationTurn> = [];

function formatLineInfo(file: FileDescriptor): string | undefined {
  if (file.startLine == null) {
    return undefined;
  }
  if (file.endLine != null && file.endLine !== file.startLine) {
    return `${file.startLine}-${file.endLine}`;
  }
  return `${file.startLine}`;
}

function buildQueuedLocalContext(
  queuedMessage: QueuedFollowUpMessage,
): LocalComposerSubmitContext {
  return {
    ...queuedMessage.context,
    workspaceRoots: queuedMessage.context.workspaceRoots
      ? { roots: queuedMessage.context.workspaceRoots }
      : undefined,
  };
}

function buildQueuedFollowUpMessageFromLocalContext({
  context,
  cwd,
  messageId = uuidv4(),
  createdAt = Date.now(),
}: {
  context: LocalComposerSubmitContext;
  cwd: string;
  messageId?: string;
  createdAt?: number;
}): QueuedFollowUpMessage {
  return {
    id: messageId,
    text: context.prompt,
    context: {
      ...context,
      workspaceRoots: context.workspaceRoots?.roots,
    },
    cwd,
    createdAt,
  };
}

function sendQueuedMessageNow({
  conversationId,
  messageId,
  queuedMessageActions,
  onSubmitLocal,
}: {
  conversationId: ConversationId | null;
  messageId: string;
  queuedMessageActions: ReturnType<typeof useQueuedFollowUps>["actions"];
  onSubmitLocal: (
    context: LocalComposerSubmitContext,
    cwd: string,
    worktreeStartingState?: AsyncThreadStartingState,
    localExecutionOptions?: LocalExecutionOptions,
    restoreMessage?: QueuedFollowUpMessage,
  ) => MaybePromise;
}): void {
  if (!conversationId) {
    return;
  }
  if (!tryAcquireStartTurnLock(conversationId)) {
    return;
  }
  const queuedMessage = queuedMessageActions.dequeue(messageId);
  if (!queuedMessage) {
    releaseStartTurnLock(conversationId);
    return;
  }
  const queuedContext = buildQueuedLocalContext(queuedMessage);
  void (async (): Promise<void> => {
    try {
      await onSubmitLocal(
        queuedContext,
        queuedMessage.cwd,
        undefined,
        undefined,
        queuedMessage,
      );
    } catch {
      queuedMessageActions.requeue(queuedMessage);
    } finally {
      releaseStartTurnLock(conversationId);
    }
  })();
}

async function startLocalFollowUpTurn({
  manager,
  context,
  targetConversationId,
  cwd,
  agentMode,
  activeCollaborationMode,
}: {
  manager: AppServerManager;
  context: LocalComposerSubmitContext;
  targetConversationId: ConversationId;
  cwd: string;
  agentMode: AgentMode;
  activeCollaborationMode: AppServer.CollaborationMode | null | undefined;
}): Promise<void> {
  if (isClosedSubagentConversation(manager, targetConversationId)) {
    throw new Error(CLOSED_AGENT_SEND_ERROR_CODE);
  }
  if (manager.needsResume(targetConversationId)) {
    await maybeResumeConversation(manager, {
      conversationId: targetConversationId,
      model: null,
      reasoningEffort: null,
      workspaceRoots: context.workspaceRoots?.roots ?? [cwd],
      collaborationMode: context.collaborationMode ?? activeCollaborationMode,
    });
  }
  const imageFileAttachments = buildImageFileAttachments(
    context.imageAttachments,
  );
  const input: Array<AppServer.v2.UserInput> = [
    {
      type: "text",
      text: renderComposerPrompt(context),
      text_elements: [],
    },
    ...context.imageAttachments.map((img) =>
      createImageLocalInputItem(img.src, img.localPath),
    ),
  ];
  const attachments = dedupeFileDescriptors([
    ...context.fileAttachments,
    ...context.addedFiles,
    ...imageFileAttachments,
  ]);
  const config = await manager.getUserSavedConfiguration(cwd);
  const permissions = buildPermissionsConfigForMode(
    agentMode,
    context.workspaceRoots?.roots ?? [],
    config,
  );

  await startTurn(manager, targetConversationId, {
    input,
    cwd,
    model: null,
    effort: null,
    approvalPolicy: permissions.approvalPolicy,
    approvalsReviewer: permissions.approvalsReviewer,
    sandboxPolicy: permissions.sandboxPolicy,
    attachments,
    collaborationMode: context.collaborationMode ?? activeCollaborationMode,
  });
}

async function steerLocalFollowUpTurn({
  manager,
  context,
  targetConversationId,
  cwd,
  agentMode,
  activeCollaborationMode,
  restoreMessage,
}: {
  manager: AppServerManager;
  context: LocalComposerSubmitContext;
  targetConversationId: ConversationId;
  cwd: string;
  agentMode: AgentMode;
  activeCollaborationMode: AppServer.CollaborationMode | null | undefined;
  restoreMessage: QueuedFollowUpMessage;
}): Promise<void> {
  if (isClosedSubagentConversation(manager, targetConversationId)) {
    throw new Error(CLOSED_AGENT_SEND_ERROR_CODE);
  }
  if (manager.needsResume(targetConversationId)) {
    await maybeResumeConversation(manager, {
      conversationId: targetConversationId,
      model: null,
      reasoningEffort: null,
      workspaceRoots: context.workspaceRoots?.roots ?? [cwd],
      collaborationMode: context.collaborationMode ?? activeCollaborationMode,
    });
  }
  const imageFileAttachments = buildImageFileAttachments(
    context.imageAttachments,
  );
  const input: Array<AppServer.v2.UserInput> = [
    {
      type: "text",
      text: renderComposerPrompt(context),
      text_elements: [],
    },
    ...context.imageAttachments.map((img) =>
      createImageLocalInputItem(img.src, img.localPath),
    ),
  ];
  const attachments = dedupeFileDescriptors([
    ...context.fileAttachments,
    ...context.addedFiles,
    ...imageFileAttachments,
  ]);

  try {
    await steerTurn(manager, targetConversationId, {
      input,
      attachments,
      restoreMessage,
    });
  } catch (error) {
    if (!isSteerTurnInactiveError(error)) {
      throw error;
    }
    await startLocalFollowUpTurn({
      manager,
      context,
      targetConversationId,
      cwd,
      agentMode,
      activeCollaborationMode,
    });
  }
}

export function Composer({
  className,
  disableAutoFocus = false,
  aboveComposerContent,
  isResponseInProgress = false,
  followUp,
  onSubmitSuccess,
  showWorkspaceDropdownInFooter = true,
  showExternalFooter = true,
  surfaceClassName,
  footerBranchName,
  threadBranchName,
  showFooterBranchWhen = "local",
  freeUpsellButton,
  onLocalConversationCreated,
  showHotkeyWindowHomeFooterControls = false,
  placeholderText,
  hotkeyWindowHomeOverflowMenu,
}: {
  className?: string;
  disableAutoFocus?: boolean;
  aboveComposerContent?: ReactNode;
  isResponseInProgress?: boolean;
  followUp?: FollowUpProps;
  onSubmitSuccess?: () => void;
  showWorkspaceDropdownInFooter?: boolean;
  showExternalFooter?: boolean;
  surfaceClassName?: string;
  footerBranchName?: string | null;
  threadBranchName?: string | null;
  showFooterBranchWhen?: "local" | "always";
  freeUpsellButton?: ReactNode;
  onLocalConversationCreated?: (conversationId: ConversationId) => void;
  showHotkeyWindowHomeFooterControls?: boolean;
  placeholderText?: string;
  hotkeyWindowHomeOverflowMenu?: ReactNode;
}): React.ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const conversationId =
    followUp?.type === "local" ? followUp.localConversationId : null;
  const mcpManager = useAppServerManagerForConversationId(conversationId);
  const { createPendingWorktree } = usePendingWorktreeActions();
  const scope = useScope(AppScope);
  const {
    activeMode: activeCollaborationMode,
    modes: collaborationModes,
    isLoading: isCollaborationModeLoading,
    setSelectedMode: setSelectedCollaborationMode,
  } = useCollaborationMode(conversationId);
  const { serviceTierSettings } = useServiceTierSettings(conversationId);
  const [agentMode] = useAtom(aAgentMode);
  const handleSubmitLocal = async (
    context: LocalComposerSubmitContext,
    cwd: string,
    worktreeStartingState?: AsyncThreadStartingState,
    localExecutionOptions?: LocalExecutionOptions,
    restoreMessage?: QueuedFollowUpMessage,
  ): Promise<void> => {
    switch (followUp?.type) {
      case "local": {
        return handleLocalFollowUpToLocalConversation(
          context,
          followUp,
          cwd,
          restoreMessage,
        );
      }
      case "cloud": {
        return handleLocalFollowUpToCloudConversation(
          context,
          followUp,
          localExecutionOptions,
        );
      }
      case undefined: {
        return handleNewLocalConversation(
          context,
          cwd,
          worktreeStartingState,
          localExecutionOptions,
        );
      }
    }
  };

  async function buildStartConversationParamsInput({
    appServerManager = mcpManager,
    context,
    prompt,
    workspaceRoots,
    cwd,
  }: {
    appServerManager?: AppServerManager;
    context: LocalComposerSubmitContext;
    prompt: string;
    workspaceRoots: Array<string>;
    cwd: string;
  }): Promise<BuildStartConversationParamsInput> {
    const input: Array<AppServer.v2.UserInput> = [
      { type: "text", text: prompt, text_elements: [] },
      ...context.imageAttachments.map((img) =>
        createImageLocalInputItem(img.src, img.localPath),
      ),
    ];
    const config = await appServerManager.getUserSavedConfiguration(cwd);
    return {
      input,
      workspaceRoots,
      cwd,
      fileAttachments: context.fileAttachments,
      addedFiles: context.addedFiles,
      agentMode,
      model: null,
      serviceTier: serviceTierSettings.serviceTier,
      reasoningEffort: null,
      collaborationMode: activeCollaborationMode,
      config,
    };
  }

  const handleNewLocalConversation = async (
    context: LocalComposerSubmitContext,
    cwd: string,
    worktreeStartingState?: AsyncThreadStartingState,
    localExecutionOptions?: LocalExecutionOptions,
  ): Promise<void> => {
    // New local conversation
    const workspaceRootList =
      localExecutionOptions?.workspaceRoots ??
      (context.workspaceRoots?.roots ? context.workspaceRoots.roots : ["/"]);
    const appServerManager =
      localExecutionOptions?.appServerManager ?? mcpManager;
    const imageFileAttachments = buildImageFileAttachments(
      context.imageAttachments,
    );

    const prompt = renderComposerPrompt(context);
    try {
      const startConversationParamsInput =
        await buildStartConversationParamsInput({
          appServerManager,
          context,
          prompt,
          workspaceRoots: workspaceRootList,
          cwd,
        });
      const baseParams = buildStartConversationParams(
        startConversationParamsInput,
      );
      const params = {
        ...baseParams,
        attachments: dedupeFileDescriptors([
          ...(baseParams.attachments ?? []),
          ...imageFileAttachments,
        ]),
      };
      const newConversationId =
        await appServerManager.startConversation(params);
      if (!__STORYBOOK__ && location.pathname === "/") {
        setPersistedValue("has-seen-multi-agent-composer-banner", true);
      }

      // Clear the transient home-page mode draft so it does not carry into the next new thread.
      setSelectedCollaborationMode(null);
      if (!worktreeStartingState) {
        if (onLocalConversationCreated) {
          onLocalConversationCreated(newConversationId);
        } else {
          void navigate(`/local/${newConversationId}`);
        }
      }
    } catch (error) {
      logger.error(`Error creating local task`, {
        safe: {},
        sensitive: { error: error },
      });
      // TODO: include specific git stderr in this toast once we broadcast it
      const toastText = isWorktreeInitFailure(error)
        ? buildWorktreeInitFailureToast(intl)
        : shouldShowReauthError(error)
          ? intl.formatMessage({
              id: "composer.localTaskError.cloudRequirements.v2",
              defaultMessage:
                "Error starting thread. Please log out and sign in again",
              description:
                "Toast text shown when starting a thread fails because cloud requirements could not be loaded",
            })
          : intl.formatMessage(
              {
                id: "composer.localTaskError.v2",
                defaultMessage: "Error starting thread{br}{error}",
                description:
                  "Toast text shown when we failed to start a thread",
              },
              {
                br: <br />,
                error: maybeErrorToString(error),
              },
            );
      scope.get(toast$).danger(toastText, {
        id: "composer.taskError",
      });
    }
  };

  const handleNewWorktreeConversation = async (
    context: LocalComposerSubmitContext,
    cwd: string,
    worktreeStartingState: AsyncThreadStartingState,
    localEnvironmentConfigPath: string | null,
    worktreeExecutionOptions?: LocalExecutionOptions,
  ): Promise<void> => {
    // This starts the worktree creation process but queues the conversation start params to be run with the worktree cwd once it's ready.
    const workspaceRootList =
      worktreeExecutionOptions?.workspaceRoots ??
      (context.workspaceRoots?.roots ? context.workspaceRoots.roots : ["/"]);
    const appServerManager =
      worktreeExecutionOptions?.appServerManager ?? mcpManager;
    const prompt = renderComposerPrompt(context);
    const startConversationParamsInput =
      await buildStartConversationParamsInput({
        appServerManager,
        context,
        prompt,
        workspaceRoots: workspaceRootList,
        cwd,
      });
    const pendingWorktreeId = createPendingWorktree({
      hostId: appServerManager.getHostId(),
      label: buildWorktreeLabelFromInput(startConversationParamsInput.input),
      sourceWorkspaceRoot: cwd,
      startingState: worktreeStartingState,
      localEnvironmentConfigPath,
      launchMode: "start-conversation",
      prompt,
      startConversationParamsInput,
      sourceConversationId: null,
      sourceCollaborationMode: null,
    });
    if (!__STORYBOOK__ && location.pathname === "/") {
      setPersistedValue("has-seen-multi-agent-composer-banner", true);
    }
    // Clear the transient home-page mode draft so it does not carry into the next new thread.
    setSelectedCollaborationMode(null);
    if (isHotkeyWindowContextFromWindow()) {
      messageBus.dispatchMessage("open-in-hotkey-window", {
        path: buildHotkeyWindowWorktreeInitRoute(pendingWorktreeId),
      });
      return;
    }
    void navigate(`/worktree-init-v2/${pendingWorktreeId}`);
  };

  const syncFollowUpThreadBranch = async (): Promise<void> => {
    if (followUp?.type !== "local") {
      return;
    }

    const currentBranch = footerBranchName?.trim() ?? "";
    if (currentBranch.length === 0) {
      return;
    }

    await mcpManager.updateThreadGitBranch(
      followUp.localConversationId,
      currentBranch,
    );
  };

  const handleLocalFollowUpToLocalConversation = async (
    context: LocalComposerSubmitContext,
    followUp: ExtractDiscriminated<FollowUpProps, "type", "local">,
    cwd: string,
    restoreMessage?: QueuedFollowUpMessage,
  ): Promise<void> => {
    await syncFollowUpThreadBranch();
    if (isResponseInProgress) {
      await steerLocalFollowUpTurn({
        manager: mcpManager,
        context,
        targetConversationId: followUp.localConversationId,
        cwd,
        agentMode,
        activeCollaborationMode,
        restoreMessage:
          restoreMessage ??
          buildQueuedFollowUpMessageFromLocalContext({ context, cwd }),
      });
      return;
    }
    await startLocalFollowUpTurn({
      manager: mcpManager,
      context,
      targetConversationId: followUp.localConversationId,
      cwd,
      agentMode,
      activeCollaborationMode,
    });
  };

  const handleLocalFollowUpToCloudConversation = async (
    context: LocalComposerSubmitContext,
    followUp: ExtractDiscriminated<FollowUpProps, "type", "cloud">,
    localExecutionOptions?: LocalExecutionOptions,
  ): Promise<void> => {
    const workspaceRootList =
      localExecutionOptions?.workspaceRoots ??
      (context.workspaceRoots?.roots ? context.workspaceRoots.roots : ["/"]);
    const appServerManager =
      localExecutionOptions?.appServerManager ?? mcpManager;

    const forkTaskDetails =
      followUp.selectedTurn &&
      followUp.selectedTurn.id !==
        followUp.taskDetails.current_assistant_turn?.id
        ? {
            ...followUp.taskDetails,
            current_assistant_turn: followUp.selectedTurn,
            current_diff_task_turn: followUp.selectedTurn,
          }
        : followUp.taskDetails;
    const priorConversation = mapCloudTaskToPriorConversation(forkTaskDetails);
    const imageFileAttachments = buildImageFileAttachments(
      context.imageAttachments,
    );
    const prompt = renderComposerPrompt({
      ...context,
      priorConversation,
    });
    const cwd = workspaceRootList[0];
    if (!cwd) {
      throw new Error("No project root found");
    }
    const startConversationParamsInput =
      await buildStartConversationParamsInput({
        appServerManager,
        context,
        prompt,
        workspaceRoots: workspaceRootList,
        cwd,
      });
    const baseParams = buildStartConversationParams(
      startConversationParamsInput,
    );
    const params = {
      ...baseParams,
      attachments: dedupeFileDescriptors([
        ...(baseParams.attachments ?? []),
        ...imageFileAttachments,
      ]),
    };
    const newConversationId = await appServerManager.startConversation(params);
    // Clear the transient home-page mode draft so it does not carry into the next new thread.
    setSelectedCollaborationMode(null);
    if (onLocalConversationCreated) {
      onLocalConversationCreated(newConversationId);
    } else {
      void navigate(`/local/${newConversationId}`);
    }
  };

  const handleStop = async (): Promise<void> => {
    if (followUp?.type === "local") {
      await mcpManager.interruptConversation(followUp.localConversationId);
    }
  };

  const handleCleanBackgroundTerminals = async (): Promise<void> => {
    if (followUp?.type === "local") {
      await mcpManager.cleanBackgroundTerminals(followUp.localConversationId);
    }
  };

  return (
    // Outer div ensures we don't inherit anything like a flex row-gap from the parent which would cause a gap to be added
    // when the portal is rendered.
    <div className={className}>
      <div
        id={ABOVE_COMPOSER_PORTAL_ID}
        className="relative px-5 empty:hidden"
      />
      <div
        id={ABOVE_COMPOSER_QUEUE_PORTAL_ID}
        className="relative px-5 empty:hidden"
      />
      <ComposerControllerScope>
        {!showHotkeyWindowHomeFooterControls && aboveComposerContent ? (
          <div className="px-5 pb-2 empty:hidden">{aboveComposerContent}</div>
        ) : null}
        <ComposerContent
          followUp={followUp}
          activeCollaborationMode={activeCollaborationMode}
          collaborationModes={collaborationModes}
          isCollaborationModeLoading={isCollaborationModeLoading}
          serviceTierForTelemetry={
            serviceTierSettings.serviceTier ?? "standard"
          }
          setSelectedCollaborationMode={setSelectedCollaborationMode}
          disableAutoFocus={disableAutoFocus}
          isResponseInProgress={isResponseInProgress}
          onSubmitLocal={handleSubmitLocal}
          onSubmitWorktree={handleNewWorktreeConversation}
          onStop={handleStop}
          onCleanBackgroundTerminals={handleCleanBackgroundTerminals}
          onSubmitSuccess={onSubmitSuccess}
          showWorkspaceDropdownInFooter={showWorkspaceDropdownInFooter}
          showExternalFooter={showExternalFooter}
          showHotkeyWindowHomeFooterControls={
            showHotkeyWindowHomeFooterControls
          }
          placeholderText={placeholderText}
          hotkeyWindowHomeOverflowMenu={hotkeyWindowHomeOverflowMenu}
          surfaceClassName={surfaceClassName}
          footerBranchName={footerBranchName}
          threadBranchName={threadBranchName}
          showFooterBranchWhen={showFooterBranchWhen}
          freeUpsellButton={freeUpsellButton}
        />
      </ComposerControllerScope>
    </div>
  );
}

function ComposerContent({
  followUp,
  activeCollaborationMode,
  collaborationModes,
  isCollaborationModeLoading,
  serviceTierForTelemetry,
  setSelectedCollaborationMode,
  disableAutoFocus,
  isResponseInProgress,
  showExternalFooter,
  showHotkeyWindowHomeFooterControls,
  placeholderText,
  hotkeyWindowHomeOverflowMenu,
  onSubmitLocal,
  onSubmitWorktree,
  onStop,
  onCleanBackgroundTerminals,
  onSubmitSuccess,
  showWorkspaceDropdownInFooter,
  surfaceClassName,
  footerBranchName,
  threadBranchName,
  showFooterBranchWhen,
  freeUpsellButton,
}: {
  activeCollaborationMode: AppServer.CollaborationMode | null;
  collaborationModes: Array<AppServer.CollaborationMode>;
  isCollaborationModeLoading: boolean;
  serviceTierForTelemetry: ServiceTierAnalyticsValue;
  setSelectedCollaborationMode: (mode: AppServer.ModeKind | null) => void;
  disableAutoFocus: boolean;
  isResponseInProgress: boolean;
  showExternalFooter: boolean;
  showHotkeyWindowHomeFooterControls: boolean;
  placeholderText: string | undefined;
  hotkeyWindowHomeOverflowMenu: ReactNode | undefined;
  onSubmitLocal: (
    context: LocalComposerSubmitContext,
    cwd: string,
    worktreeStartingState?: AsyncThreadStartingState,
    localExecutionOptions?: LocalExecutionOptions,
    restoreMessage?: QueuedFollowUpMessage,
  ) => MaybePromise;
  onSubmitWorktree: (
    context: LocalComposerSubmitContext,
    cwd: string,
    worktreeStartingState: AsyncThreadStartingState,
    localEnvironmentConfigPath: string | null,
    worktreeExecutionOptions?: LocalExecutionOptions,
  ) => MaybePromise;
  onStop: () => void;
  onCleanBackgroundTerminals: () => Promise<void>;
  onSubmitSuccess: (() => void) | undefined;
  showWorkspaceDropdownInFooter: boolean;
  surfaceClassName: string | undefined;
  footerBranchName: string | null | undefined;
  threadBranchName: string | null | undefined;
  showFooterBranchWhen: "local" | "always" | undefined;
  freeUpsellButton: ReactNode | undefined;
  followUp?: FollowUpProps;
}): React.ReactElement {
  const windowType = useWindowType();
  const queryClient = useQueryClient();
  const createCloudTaskMutation = useCreateCloudTaskMutation();
  const followUpToCloudTaskMutation = useFollowUpToCloudTaskMutation();
  const isElectron = windowType === "electron";
  const agentMode = useAtomValue(aAgentMode);

  const conversationId =
    followUp?.type === "local" ? followUp.localConversationId : null;
  const mcpManager = useAppServerManagerForConversationId(conversationId);
  const worktreeExecutionTarget = useWebviewExecutionTarget(conversationId);
  const worktreeExecutionTargetManager = useAppServerManagerForHost(
    worktreeExecutionTarget.hostId,
  );
  const followUpConversationId = getFollowUpConversationId(followUp);
  const { access: codexAccess } = useCodexCloudAccess();
  const selectedModel = activeCollaborationMode?.settings.model ?? null;
  const { data: rateLimit } = useRateLimit();
  const hasAvailableCredits =
    rateLimit?.credits?.unlimited === true ||
    rateLimit?.credits?.has_credits === true;
  const coreRateLimitBlocked = isCoreRateLimitReached(rateLimit);
  const selectedModelRateLimitReached = isSelectedModelRateLimitReached(
    rateLimit,
    selectedModel,
  );
  const rateLimitEntries = getRateLimitEntries(rateLimit);
  const activeRateLimitName = getRateLimitName(rateLimit);
  const activeRateLimitEntry = getActiveRateLimitEntry(rateLimitEntries, {
    activeLimitName: activeRateLimitName,
    selectedModel,
  });
  const activeRateLimitAlertData = getActiveRateLimitAlertData(
    rateLimitEntries,
    {
      activeLimitName: activeRateLimitName,
      selectedModel,
    },
  );
  const rateLimitBannerMode = getRateLimitBannerMode({
    coreRateLimitBlocked,
    selectedModelRateLimitReached,
  });
  const showCoreRateLimitUpsell =
    rateLimitBannerMode === "upsell" && !hasAvailableCredits;
  const showModelLimitBanner = rateLimitBannerMode === "model_limit";
  const blockedTopLevelIsCore =
    coreRateLimitBlocked && isDefaultRateLimitName(activeRateLimitName);
  const modelLimitName = blockedTopLevelIsCore
    ? null
    : (activeRateLimitEntry?.limitName ?? selectedModel ?? activeRateLimitName);
  const modelLimitResetAt = blockedTopLevelIsCore
    ? getRateLimitResetAt(rateLimit)
    : (activeRateLimitAlertData?.resetsAt ??
      getRateLimitEntryResetAt(activeRateLimitEntry));
  const statusThreadId =
    followUpConversationId == null ? null : `${followUpConversationId}`;
  const localConversationCwd = useLocalConversationCwd(conversationId);
  const pendingRequest = usePendingRequest(conversationId);
  let pendingRequestKey: string | number | null = null;
  if (pendingRequest != null) {
    switch (pendingRequest.type) {
      case "userInput":
        pendingRequestKey = pendingRequest.item.requestId;
        break;
      case "approval":
        pendingRequestKey =
          pendingRequest.item.approvalRequestId ?? pendingRequest.item.callId;
        break;
      case "implementPlan":
        pendingRequestKey = pendingRequest.turnId;
        break;
      case "mcpServerElicitation":
        pendingRequestKey = pendingRequest.requestId;
        break;
    }
  }
  const pendingSteers =
    useLocalConversationSelector(
      conversationId,
      (conversation) => conversation?.pendingSteers,
    ) ?? [];
  const localConversationTurns =
    useLocalConversationSelector(
      conversationId,
      (conversation) => conversation?.turns,
    ) ?? EMPTY_TURNS;
  const localConversationBackgroundState = useMemo(
    () => (conversationId == null ? null : { turns: localConversationTurns }),
    [conversationId, localConversationTurns],
  );
  const checkedOutBranchName = footerBranchName?.trim() ?? "";
  const storedThreadBranchName = threadBranchName?.trim() ?? "";
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const hasActiveConversationTerminalSession =
    conversationId != null &&
    terminalService.getSessionForConversation(conversationId) != null;

  const backgroundTerminals = getBackgroundTerminals(
    localConversationBackgroundState,
    hasActiveConversationTerminalSession,
  );
  const {
    memberships: backgroundSubagentMemberships,
    rows: backgroundSubagentRows,
    mentionItems: backgroundSubagentMentionItems,
    firstApproval: firstBackgroundSubagentApproval,
  } = useBackgroundSubagentMentionItems({
    activeConversationId: conversationId,
    conversation: localConversationBackgroundState,
    enabled: isBackgroundSubagentsEnabled,
    manager: mcpManager,
  });
  const backgroundSubagentLatestReferences =
    collectBackgroundSubagentLatestReferences({
      conversation: localConversationBackgroundState,
      memberships: backgroundSubagentMemberships,
    });
  const currentBackgroundSubagentParentTurnKey =
    getBackgroundSubagentParentTurnKey(localConversationBackgroundState);
  const visibleBackgroundSubagentRows = backgroundSubagentRows.filter((row) => {
    return (
      backgroundSubagentLatestReferences.get(row.conversationId)
        ?.parentTurnKey === currentBackgroundSubagentParentTurnKey
    );
  });
  const showChildApprovalPanel = firstBackgroundSubagentApproval != null;
  const showParentPendingRequestPanel =
    shouldRenderPendingRequestInComposer(pendingRequest);
  const isApprovalRequestVisible =
    pendingRequest?.type === "approval" || showChildApprovalPanel;
  const showPendingRequest =
    conversationId != null &&
    (showParentPendingRequestPanel || showChildApprovalPanel);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const isSlashCommandMenuOpen = useAtomValue(aSlashCommandMenuOpen);
  const [shouldShowWindowsSandboxBanner] = useShowWindowsSandboxBanner();
  const { isRequired: isWindowsSandboxRequired } =
    useWindowsSandboxRequirement();
  const { isPending: isWindowsSandboxSetupPending } =
    useWindowsSandboxSetup(mcpManager);

  const isCreditsEnabled = useGate(
    __statsigName("chatgpt-wham-credits-enabled"),
  );
  const bestOfN = useAtomValue(aComposerBestOfN);
  const setDefaultComposerAutoContext = useSetAtom(aDefaultComposerAutoContext);
  const intl = useIntl();
  const { isPersonalityEnabled } = usePersonality();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state: locationState,
  }: {
    state: HomeLocationState | undefined;
  } = location;
  const codeEnvironment = useEnvironment();
  const scope = useScope(AppScope);
  const isWorktreeSnapshotsEnabled = useGate(
    __statsigName("codex_worktree_snapshots"),
  );
  const supportsImageInputs = useModelInputCapability(conversationId, "image");
  const imageInputUnsupportedMessage = intl.formatMessage({
    id: "composer.imageInputsUnsupported",
    defaultMessage:
      "This model does not support image inputs. Try a different model.",
    description:
      "Toast shown when a user tries to add images for a text-only model",
  });
  const imageInputUnsupportedReason = intl.formatMessage({
    id: "composer.submit.imageInputsUnsupported",
    defaultMessage: "Remove images or switch models to send this message.",
    description:
      "Message shown when submit is blocked due to unsupported image inputs",
  });
  const lastUnsupportedImageToastAtRef = useRef(0);
  const notifyImageInputUnsupported = useCallback(() => {
    const now = Date.now();
    if (now - lastUnsupportedImageToastAtRef.current < 1_000) {
      return;
    }
    lastUnsupportedImageToastAtRef.current = now;
    scope.get(toast$).danger(imageInputUnsupportedMessage);
  }, [scope, imageInputUnsupportedMessage]);

  const [skipThreadBranchMismatchConfirm, setSkipThreadBranchMismatchConfirm] =
    useAtom(aSkipThreadBranchMismatchConfirm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingBranchMismatchFollowUp, setPendingBranchMismatchFollowUp] =
    useState<PendingBranchMismatchFollowUp | null>(null);
  const [skipFutureBranchMismatchPrompt, setSkipFutureBranchMismatchPrompt] =
    useState(false);
  const [isCleaningBackgroundTerminals, setIsCleaningBackgroundTerminals] =
    useState(false);
  const [
    aboveComposerSuggestionPortalTarget,
    setAboveComposerSuggestionPortalTarget,
  ] = useState<HTMLDivElement | null>(null);
  async function openSubagentThread(
    childConversationId: ConversationId,
  ): Promise<void> {
    if (mcpManager.getConversation(childConversationId) == null) {
      await mcpManager.hydratePinnedThreads([childConversationId]);
    }
    if (mcpManager.getConversation(childConversationId) == null) {
      return;
    }
    if (isHotkeyWindowContextFromWindow()) {
      messageBus.dispatchMessage("open-in-hotkey-window", {
        path: buildHotkeyWindowThreadRoute(childConversationId),
      });
      return;
    }
    void navigate(buildLocalConversationRoute(childConversationId));
  }
  const [editingQueuedMessageId, setEditingQueuedMessageId] = useState<
    string | null
  >(null);
  const {
    isQueueingEnabled,
    setMode: setQueueingMode,
    isLoading: isQueueingEnabledLoading,
  } = useFollowUpQueueMode();
  const { enterBehavior } = useEnterBehavior();
  const followUpLocalConversationId =
    followUp?.type === "local" ? followUp.localConversationId : null;
  const { messages: queuedMessages, actions: queuedMessageActions } =
    useQueuedFollowUps(followUpLocalConversationId);
  const { data: workspaceRoots, isLoading: workspaceRootsLoading } =
    useFetchFromVSCode("active-workspace-roots");
  const openFile = useMutationFromVSCode("open-file");
  const activeWorkspaceRoot = workspaceRoots?.roots?.[0] ?? null;
  const { remoteConnections } = useSelectedRemoteHostId();
  const { selectedRemoteProject } = useSelectedRemoteProject();
  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  const codexHome = codexHomeData?.codexHome;
  const prefillPrompt = locationState?.prefillPrompt;
  const prefillPriorConversation =
    locationState?.prefillPriorConversation ?? null;
  const locationPrefillComposerMode = locationState?.prefillComposerMode;
  const locationPrefillCwd = locationState?.prefillCwd ?? null;
  const [sharedPrefillCwd, setSharedPrefillCwd] = useState<string | null>(null);
  const resolvedCwd = ((): string => {
    if (sharedPrefillCwd) {
      return sharedPrefillCwd;
    }
    if (locationPrefillCwd) {
      return locationPrefillCwd;
    }
    if (localConversationCwd) {
      return localConversationCwd;
    }
    const roots = workspaceRoots?.roots ?? [];
    const worktreeRoot = roots.find((root) =>
      isCodexWorktree(root, codexHome ?? undefined),
    );
    if (worktreeRoot) {
      return worktreeRoot;
    }
    if (activeWorkspaceRoot && activeWorkspaceRoot !== "/") {
      return activeWorkspaceRoot;
    }
    return "/";
  })();
  const openFileCwd = resolvedCwd === "/" ? null : createGitCwd(resolvedCwd);
  const atMentionRoots = useMemo(
    () =>
      windowType === "extension"
        ? // In the extension, anything in the current workspace should be at-mentionable at any time.
          (workspaceRoots?.roots ?? [])
        : // Everywhere else, it should be the single cwd of the conversation.
          [resolvedCwd],
    [windowType, workspaceRoots, resolvedCwd],
  );

  const prompts = useCustomPrompts();
  const composerController = useComposerController();
  const isInlineSlashCommandMenuOpen = useComposerControllerState(
    composerController,
    (controller) =>
      slashCommandUiKey.getState(controller.view.state)?.active === true,
  );
  const isBackgroundSubagentsPanelVisible =
    visibleBackgroundSubagentRows.length > 0 &&
    !isApprovalRequestVisible &&
    !isInlineSlashCommandMenuOpen &&
    !isSlashCommandMenuOpen &&
    !isStatusMenuOpen;
  const shouldHideAboveComposerSuggestions =
    showPendingRequest ||
    showCoreRateLimitUpsell ||
    showModelLimitBanner ||
    isInlineSlashCommandMenuOpen ||
    isStatusMenuOpen;
  const { appendPromptToHistory, resetHistorySelection } =
    useComposerPromptHistory(composerController);
  const localFollowUpDefaultComposerMode: ComposerMode | undefined =
    followUp?.type === "local" ? "local" : undefined;
  const composerStateProjectId =
    selectedRemoteProject?.id ?? activeWorkspaceRoot ?? resolvedCwd;
  const [composerViewState, setComposerViewState] = useComposerViewState(
    followUp,
    composerStateProjectId,
    localFollowUpDefaultComposerMode,
  );
  const migrateComposerViewState = useMigrateComposerViewState();
  const composerMode = composerViewState.composerMode;
  const connectionStatesByHostId = useRemoteConnectionStates(remoteConnections);
  const attachedRemoteHostId =
    followUpConversationId != null && mcpManager.getHostId() !== DEFAULT_HOST_ID
      ? mcpManager.getHostId()
      : null;
  const localExecutionRemoteHostId =
    attachedRemoteHostId ?? selectedRemoteProject?.hostId ?? null;
  const remoteAppServerManager = useAppServerManagerForHost(
    localExecutionRemoteHostId ?? "",
  );
  const persistedRemoteCwd =
    localExecutionRemoteHostId != null &&
    selectedRemoteProject?.hostId === localExecutionRemoteHostId
      ? selectedRemoteProject.remotePath
      : null;
  const currentRemoteCwd = ((): string | null => {
    if (localExecutionRemoteHostId == null) {
      return null;
    }
    if (attachedRemoteHostId != null) {
      return localConversationCwd ?? persistedRemoteCwd;
    }
    return persistedRemoteCwd;
  })();
  const isLocalModeOnRemoteHost =
    composerMode === "local" && localExecutionRemoteHostId != null;
  const currentLocalAppServerManager =
    isLocalModeOnRemoteHost && remoteAppServerManager != null
      ? remoteAppServerManager
      : mcpManager;
  const currentLocalExecutionCwd =
    isLocalModeOnRemoteHost && currentRemoteCwd != null
      ? currentRemoteCwd
      : resolvedCwd;
  const worktreeSourceCwd = worktreeExecutionTarget.cwd ?? resolvedCwd;
  const currentLocalExecutionHostConfig = useHostConfig(
    currentLocalAppServerManager.getHostId(),
  );
  const remoteConnectionState =
    localExecutionRemoteHostId == null
      ? null
      : (connectionStatesByHostId[localExecutionRemoteHostId] ??
        "disconnected");

  // When the conversation changes, restore the prompt text from state
  const conversationStateId = getComposerStateId(
    followUp,
    composerStateProjectId,
  );
  const previousConversationStateIdRef = useRef<string | null>(null);
  const lastConversationStateIdRef = useRef<string | null>(null);
  const promptForConversation = composerViewState.prompt;
  const commentAttachments = composerViewState.commentAttachments;
  const pullRequestChecks = composerViewState.pullRequestChecks;
  useEffect(() => {
    const previousConversationStateId = previousConversationStateIdRef.current;
    if (previousConversationStateId === conversationStateId) {
      return;
    }
    if (previousConversationStateId == null) {
      previousConversationStateIdRef.current = conversationStateId;
      return;
    }
    const shouldMigrateDraft =
      previousConversationStateId === "new-conversation:/" &&
      conversationStateId.startsWith("new-conversation:") &&
      conversationStateId !== "new-conversation:/";
    if (shouldMigrateDraft) {
      migrateComposerViewState(
        previousConversationStateId,
        conversationStateId,
      );
    }
    previousConversationStateIdRef.current = conversationStateId;
  }, [conversationStateId, migrateComposerViewState]);

  useEffect(() => {
    const previousConversationStateId = lastConversationStateIdRef.current;
    if (previousConversationStateId === conversationStateId) {
      return;
    }
    lastConversationStateIdRef.current = conversationStateId;
    const shouldPreserveDraft =
      previousConversationStateId === "new-conversation:/" &&
      conversationStateId.startsWith("new-conversation:") &&
      conversationStateId !== "new-conversation:/" &&
      promptForConversation.length === 0 &&
      composerController.hasText();
    if (shouldPreserveDraft) {
      return;
    }
    const textToRestore =
      promptForConversation.length > 0 ? promptForConversation : "";
    if (hasSerializedPromptMentions(textToRestore)) {
      composerController.setPromptText(textToRestore);
    } else {
      composerController.setText(textToRestore);
    }
  }, [conversationStateId, promptForConversation, composerController]);

  // Helper to update a single field in the composer state, which
  // is persisted in an atom so it survives unmount/mount cycles
  const setComposerStateField = useCallback(
    <K extends keyof ComposerViewState>(
      key: K,
      updater: SetStateAction<ComposerViewState[K]>,
    ): void => {
      setComposerViewState((prev) => {
        const newValue =
          typeof updater === "function" ? updater(prev[key]) : updater;
        return { ...prev, [key]: newValue };
      });
    },

    [setComposerViewState],
  );

  const setComments = useSyncCommentsToComposerViewState(followUp, (c) => {
    setComposerStateField("commentAttachments", c);
  });
  const previousCommentAttachmentCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (previousCommentAttachmentCountRef.current == null) {
      previousCommentAttachmentCountRef.current = commentAttachments.length;
      return;
    }
    if (
      previousCommentAttachmentCountRef.current === commentAttachments.length
    ) {
      return;
    }
    previousCommentAttachmentCountRef.current = commentAttachments.length;
    const frameId = requestAnimationFrame(() => {
      composerController.focus();
    });
    return (): void => {
      cancelAnimationFrame(frameId);
    };
  }, [commentAttachments.length, composerController]);

  const [modelComments, setModelComments] = useSharedObject(
    "diff_comments_from_model",
  );
  const reviewFindingConversationId =
    followUpConversationId ?? "new-conversation";
  const {
    findings: reviewFindingsForPrompt,
    acceptedCount: acceptedReviewFindingCount,
  } = buildCodeCommentPromptData(modelComments?.[reviewFindingConversationId]);

  const setComposerMode = useCallback(
    (mode: ComposerMode): void => {
      setComposerStateField("composerMode", mode);
    },
    [setComposerStateField],
  );

  const isAutoContextOn = composerViewState.isAutoContextOn;
  const setIsAutoContextOn = useCallback(
    (value: boolean): void => {
      setDefaultComposerAutoContext(value);
      setComposerStateField("isAutoContextOn", value);
    },
    [setComposerStateField, setDefaultComposerAutoContext],
  );
  const { status: ideContextStatus } = useIdeContextIpcStatus(
    isAutoContextOn,
    setIsAutoContextOn,
  );

  const imageAttachments = composerViewState.imageAttachments;
  const hasImageAttachments = imageAttachments.length > 0;
  const setImageAttachments = useCallback(
    (
      updater: (
        prev: Array<ComposerImageAttachment>,
      ) => Array<ComposerImageAttachment>,
    ): void => {
      setComposerStateField("imageAttachments", updater);
    },
    [setComposerStateField],
  );

  const fileAttachments = composerViewState.fileAttachments;
  const setFileAttachments = useCallback(
    (
      updater:
        | Array<FileDescriptor>
        | ((prev: Array<FileDescriptor>) => Array<FileDescriptor>),
    ): void => {
      setComposerStateField("fileAttachments", updater);
    },
    [setComposerStateField],
  );

  const addedFiles = composerViewState.addedFiles;
  const setAddedFiles = useCallback(
    (updater: (prev: Array<FileDescriptor>) => Array<FileDescriptor>): void => {
      setComposerStateField("addedFiles", updater);
    },
    [setComposerStateField],
  );

  const newTaskCloudStartingState = composerViewState.asyncThreadStartingState;
  const setNewTaskCloudStartingState = useCallback(
    (state: AsyncThreadStartingState) => {
      setComposerStateField("asyncThreadStartingState", state);
    },
    [setComposerStateField],
  );
  const defaultBranchSnapshot = composerViewState.defaultBranchSnapshot;

  const followUpCloudStartingState =
    composerViewState.followUpCloudStartingState;
  const setFollowUpCloudStartingState = useCallback(
    (state: CloudFollowUpStartingState): void => {
      setComposerStateField("followUpCloudStartingState", state);
    },
    [setComposerStateField],
  );
  const lastComposerModeRef = useRef<ComposerMode | null>(null);
  useEffect(() => {
    lastComposerModeRef.current = composerMode;
  }, [composerMode]);
  const [focusComposerNonce, setFocusComposerNonce] = useState<
    number | undefined
  >(locationState?.focusComposerNonce);
  const [priorConversation, setPriorConversation] =
    useState<PriorConversation | null>(prefillPriorConversation);
  const locationFocusComposerNonce = locationState?.focusComposerNonce;
  const focusComposer = useCallback((): void => {
    setFocusComposerNonce((nonce) => (nonce ?? 0) + 1);
  }, [setFocusComposerNonce]);

  const prefillFromLocationEvent = useEffectEvent((): void => {
    if (locationPrefillComposerMode) {
      setComposerMode(locationPrefillComposerMode);
    }
    if (prefillPriorConversation) {
      setPriorConversation(prefillPriorConversation);
    }
    if (locationFocusComposerNonce != null) {
      setFocusComposerNonce(locationFocusComposerNonce);
    }
    if (prefillPrompt && prefillPrompt !== composerController.getText()) {
      composerController.setPromptText(prefillPrompt);
    }
  });

  useEffect(() => {
    prefillFromLocationEvent();
  }, [prefillPrompt, prefillPriorConversation]);

  const [composerPrefill, setComposerPrefill] =
    useSharedObject("composer_prefill");
  const prefillFromSharedObject = useEffectEvent((): void => {
    if (!composerPrefill?.text) {
      return;
    }
    if (conversationId != null) {
      return;
    }
    if (composerPrefill.cwd != null) {
      setSharedPrefillCwd(composerPrefill.cwd);
    } else {
      setSharedPrefillCwd(null);
    }
    if (hasSerializedPromptMentions(composerPrefill.text)) {
      composerController.setPromptText(composerPrefill.text);
      composerController.syncMentionMetadata({
        skills: availableSkills,
        apps: availableApps,
        plugins: availablePlugins,
      });
    } else {
      composerController.setText(composerPrefill.text);
    }
    composerController.focus();
    setComposerPrefill(undefined);
  });

  useEffect(() => {
    prefillFromSharedObject();
  }, [composerPrefill]);
  useEffect(() => {
    if (!conversationId || !sharedPrefillCwd) {
      return;
    }
    setSharedPrefillCwd(null);
  }, [conversationId, sharedPrefillCwd]);
  useEffect(() => {
    if (locationFocusComposerNonce == null) {
      return;
    }
    setFocusComposerNonce(locationFocusComposerNonce);
  }, [locationFocusComposerNonce]);

  useEffect(() => {
    if (windowType !== "extension" || disableAutoFocus) {
      return;
    }
    const onWindowFocus = (): void => {
      composerController.focus();
    };
    window.addEventListener("focus", onWindowFocus);
    return (): void => {
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [composerController, disableAutoFocus, windowType]);

  useEffect(() => {
    if (windowType !== "electron" || showPendingRequest || isSubmitting) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      routeCharacterInputToComposer({
        composerController,
        event,
      });
    };

    window.addEventListener("keydown", onKeyDown, true);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [composerController, isSubmitting, showPendingRequest, windowType]);

  const [queuedMessagePortalTarget, setQueuedMessagePortalTarget] =
    useState<HTMLElement | null>(null);
  const hasAboveComposerPortalContent = useHasAboveComposerPortalContent();
  useEffect(() => {
    const isHotkeyWindowHome = isHotkeyWindowHomePathname(location.pathname);
    document.body.toggleAttribute(
      HOTKEY_WINDOW_HOME_ABOVE_COMPOSER_UI_OPEN_ATTR,
      isHotkeyWindowHome && hasAboveComposerPortalContent,
    );
    return (): void => {
      document.body.removeAttribute(
        HOTKEY_WINDOW_HOME_ABOVE_COMPOSER_UI_OPEN_ATTR,
      );
    };
  }, [hasAboveComposerPortalContent, location.pathname]);
  useEffect(() => {
    setQueuedMessagePortalTarget(
      document.getElementById(ABOVE_COMPOSER_QUEUE_PORTAL_ID),
    );
  }, []);

  const { gitRoot: worktreeRepoRoot } = useGitRootForCwd(worktreeSourceCwd, {
    enabled: composerMode === "worktree",
    hostId: worktreeExecutionTarget.hostId,
  });
  const {
    worktreeGitContextRoot,
    workspaceRootForSubmit: worktreeWorkspaceRootForSubmit,
  } = resolveWorktreeSubmitPaths({
    worktreeSourceCwd,
    worktreeRepoRoot,
  });
  const startingStateGitRoot =
    composerMode === "worktree"
      ? worktreeGitContextRoot
      : composerMode === "cloud"
        ? activeWorkspaceRoot
        : null;
  const defaultHostConfig = useHostConfig(DEFAULT_HOST_ID);
  const { data: startingStateDefaultBranch } = useGitDefaultBranch(
    !followUp ? startingStateGitRoot : null,
    composerMode === "worktree"
      ? worktreeExecutionTarget.hostConfig
      : defaultHostConfig,
    { enabled: !followUp && !!startingStateGitRoot },
  );

  const workspaceRootForSubmit =
    composerMode === "worktree" ? worktreeWorkspaceRootForSubmit : resolvedCwd;
  const workspaceRootsForLocalExecution = isLocalModeOnRemoteHost
    ? [currentLocalExecutionCwd]
    : [workspaceRootForSubmit];
  const skillLookupRoots = isLocalModeOnRemoteHost
    ? currentRemoteCwd == null
      ? []
      : [currentRemoteCwd]
    : [resolvedCwd];
  const currentLocalExecutionOptions = isLocalModeOnRemoteHost
    ? {
        appServerManager: currentLocalAppServerManager,
        workspaceRoots: workspaceRootsForLocalExecution,
      }
    : undefined;
  const {
    environments: worktreeEnvironments,
    isLoading: localEnvironmentsLoading,
    error: localEnvironmentsError,
    resolvedConfigPath: resolvedWorktreeEnvironmentConfigPath,
    updateSelection: updateEnvironmentSelection,
  } = useResolvedLocalEnvironmentSelection({
    workspaceRoot:
      isElectron && composerMode === "worktree" ? worktreeSourceCwd : null,
    enabled: isElectron,
  });

  const {
    forkIntoLocal,
    forkIntoWorktree,
    isResponseInProgress: isForkResponseInProgress,
    canForkIntoWorktree,
  } = useForkConversationActions({
    sourceConversationId:
      followUp?.type === "local" ? followUp.localConversationId : null,
    sourceWorkspaceRoot: followUp?.type === "local" ? resolvedCwd : null,
  });

  useEffect(() => {
    const unsubscribe = setCustomKeymapHandlers(composerController.view, {
      b: (event) => {
        const isPrimaryShortcut = detectIsMacOS()
          ? event.metaKey && !event.ctrlKey
          : event.ctrlKey && !event.metaKey;
        if (!isPrimaryShortcut) {
          return false;
        }
        if (event.shiftKey || event.altKey) {
          return false;
        }
        runCommand("toggleSidebar");
        event.preventDefault();
        event.stopPropagation();
        return true;
      },
    });

    return (): void => {
      unsubscribe();
    };
  }, [composerController]);

  useEffect(() => {
    if (focusComposerNonce == null) {
      return;
    }
    requestAnimationFrame(() => {
      composerController.focus();
    });
  }, [focusComposerNonce, composerController]);

  useEffect(() => {
    if (codexAccess !== "enabled" && composerMode === "cloud") {
      setComposerMode("local");
    }
  }, [codexAccess, composerMode, setComposerMode]);

  const [isDragActive, setIsDragActive] = useState(false);
  const [showShiftOverlay, setShowShiftOverlay] = useState(false);
  const [isSubmitBlockedDialogOpen, setIsSubmitBlockedDialogOpen] =
    useState(false);
  const [emptySubmitTooltipNonce, setEmptySubmitTooltipNonce] = useState(0);

  // Counter to balance nested drag enter/leave events when dragging over children
  const dragCounterRef = useRef(0);
  // Generation counter to ignore stale async image loads across clears/submissions
  const attachmentGenRef = useRef(0);

  const uploadImageAttachment = (
    img: { id: string; src: string; filename?: string },
    gen: number,
  ): void => {
    uploadImageDataUrlForCodex(img.src, img.filename ?? `image-${img.id}.png`)
      .then((pointer) => {
        if (attachmentGenRef.current !== gen) {
          return;
        }
        setImageAttachments((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? {
                  ...i,
                  uploadStatus: "ready",
                  pointer: {
                    ...pointer,
                    size_bytes: pointer.size_bytes ?? 0,
                  },
                }
              : i,
          ),
        );
      })
      .catch(() => {
        if (attachmentGenRef.current !== gen) {
          return;
        }
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "composer.imageUploadFailed",
            defaultMessage: "Failed to upload image",
            description: "Toast shown when an image fails to upload",
          }),
        );
        setImageAttachments((prev) => prev.filter((i) => i.id !== img.id));
      });
  };

  // workspace files added by the user, via the add context button (and eventually at-mentions)
  useMessage(
    "add-context-file",
    (m) => {
      focusComposer();
      setAddedFiles((prev) =>
        prev.some(
          (f) =>
            normalizeFsPath(f.fsPath) === normalizeFsPath(m.file.fsPath) &&
            f.startLine === m.file.startLine &&
            f.endLine === m.file.endLine,
        )
          ? prev
          : [...prev, m.file],
      );
    },
    [focusComposer, setAddedFiles],
  );

  const hasText = useComposerControllerState(composerController, (s) =>
    s.hasText(),
  );
  const hasFileAttachments =
    fileAttachments.length > 0 || addedFiles.length > 0;
  const hasCommentAttachments = commentAttachments.length > 0;
  const hasPullRequestChecks = pullRequestChecks.length > 0;
  const hasPriorConversation = priorConversation != null;
  const hasReviewFindingAttachments = acceptedReviewFindingCount > 0;
  const hasMessageContent =
    hasText ||
    hasImageAttachments ||
    hasFileAttachments ||
    hasCommentAttachments ||
    hasPullRequestChecks ||
    hasPriorConversation ||
    hasReviewFindingAttachments;
  const hasVisibleAttachments =
    hasImageAttachments ||
    hasFileAttachments ||
    hasCommentAttachments ||
    hasPullRequestChecks ||
    hasPriorConversation ||
    hasReviewFindingAttachments;

  const mentionAutocomplete = useAtMentionAutocomplete(composerController);
  const mentionedAgentConversationIdsKey = useComposerControllerState(
    composerController,
    (controller) => controller.getMentionedAgentConversationIdsKey(),
  );
  const mentionedAgentConversationIds = useMemo(
    () =>
      mentionedAgentConversationIdsKey === ""
        ? []
        : mentionedAgentConversationIdsKey.split("\u0000"),
    [mentionedAgentConversationIdsKey],
  );
  const { sections: atMentionSections } = useAtMentionSections({
    appServerManager: currentLocalAppServerManager,
    backgroundAgents: backgroundSubagentMentionItems,
    excludedAgentConversationIds: mentionedAgentConversationIds,
    query: mentionAutocomplete.ui?.query ?? "",
    roots: atMentionRoots,
  });
  const skillMentionAutocomplete =
    useSkillMentionAutocomplete(composerController);
  const availableApps = useEnabledInstalledApps();
  const { skills: availableSkills } = useSkills(
    skillLookupRoots,
    currentLocalAppServerManager,
  );
  const { plugins: availablePlugins } = usePlugins(resolvedCwd);
  const debouncedSkillMentionQuery = useDebouncedValue(
    skillMentionAutocomplete.ui?.query ?? "",
    100,
  );

  useEffect(() => {
    composerController.syncMentionMetadata({
      skills: availableSkills,
      apps: availableApps,
      plugins: availablePlugins,
    });
  }, [availableApps, availablePlugins, availableSkills, composerController]);

  const repo = codeEnvironment
    ? (codeEnvironment.repo_map ?? {})[codeEnvironment.repos[0]]
    : null;

  const hasAppliedCodeLocally =
    followUp?.type === "cloud" && followUp.hasAppliedCodeLocally;
  useEffect(() => {
    // When the user has applied code locally, we should default to the working tree
    if (hasAppliedCodeLocally) {
      setFollowUpCloudStartingState("working-tree");
    }
  }, [hasAppliedCodeLocally, setFollowUpCloudStartingState]);

  // Keep the remote-branch starting state aligned to the selected environment.
  const resetStartingStateEvent = useEffectEvent(() => {
    if (newTaskCloudStartingState.type !== "branch") {
      return;
    }
    const repoId = codeEnvironment?.repos?.[0];
    const defaultBranch =
      startingStateDefaultBranch ??
      (repoId != null
        ? ((codeEnvironment?.repo_map ?? {})[repoId]?.default_branch ?? null)
        : null);
    if (!defaultBranch) {
      return;
    }
    if (
      defaultBranch === defaultBranchSnapshot &&
      newTaskCloudStartingState.branchName === defaultBranch
    ) {
      return;
    }
    setComposerStateField("defaultBranchSnapshot", defaultBranch);
    setNewTaskCloudStartingState({
      type: "branch",
      branchName: defaultBranch,
    });
  });

  useEffect(() => {
    resetStartingStateEvent();
  }, [codeEnvironment, startingStateDefaultBranch]);

  useEffect(() => {
    setComposerStateField("prompt", composerController.getText());
  }, [composerController, setComposerStateField]);

  useEffect(() => {
    return addTransactionListener(composerController.view, () => {
      const text = composerController.getText();
      setComposerStateField("prompt", text);
      setEmptySubmitTooltipNonce((prev) => {
        if (text.trim() !== "" && prev !== 0) {
          return 0;
        }
        return prev;
      });
    });
  }, [composerController, setComposerStateField]);

  const prewarmConversationEvent = useEffectEvent((): void => {
    if (isHotkeyWindowContextFromWindow()) {
      return;
    }
    if (followUp != null) {
      return;
    }
    if (composerMode !== "local") {
      return;
    }
    if (isLocalModeOnRemoteHost && currentRemoteCwd == null) {
      return;
    }
    void currentLocalAppServerManager.prewarmConversation({
      cwd: currentLocalExecutionCwd,
      workspaceRoots: workspaceRootsForLocalExecution,
      collaborationMode: activeCollaborationMode,
      agentMode,
    });
  });
  // Prewarm thread if there is text in the composer
  useEffect(() => {
    if (!hasText) {
      return;
    }
    prewarmConversationEvent();
  }, [hasText]);

  // Auto-upload any existing images when switching to cloud mode
  useEffect(() => {
    if (composerMode !== "cloud") {
      return;
    }
    const gen = attachmentGenRef.current;
    const pending = imageAttachments.filter(
      (img) => img.uploadStatus === undefined || img.uploadStatus === "idle",
    );
    if (pending.length === 0) {
      return;
    }
    setImageAttachments((prev) =>
      prev.map((i) =>
        pending.some((img) => img.id === i.id)
          ? { ...i, uploadStatus: "uploading" }
          : i,
      ),
    );
    for (const img of pending) {
      uploadImageAttachment(img, gen);
    }
    // oxlint-disable-next-line react/exhaustive-deps
  }, [composerMode]);

  const disableSubmitForMissingLocalConfig =
    composerMode === "local" && workspaceRootsLoading;
  const disableSubmitForDisconnectedRemoteHost =
    isLocalModeOnRemoteHost && remoteConnectionState === "disconnected";
  const disableSubmitForUnauthedRemoteHost =
    isLocalModeOnRemoteHost && remoteConnectionState === "unauthed";
  const disableSubmitForMissingRemoteProjectPath =
    isLocalModeOnRemoteHost && currentRemoteCwd == null;
  const disableSubmitForMissingCloudConfig =
    composerMode === "cloud" &&
    followUpCloudStartingState !== "direct-follow-up" &&
    !isWorktreeSnapshotsEnabled &&
    !codeEnvironment;
  const disableSubmitForUnsupportedImageInputs =
    !supportsImageInputs && imageAttachments.length > 0;
  const disableSubmitForImageUploads =
    composerMode === "cloud" &&
    imageAttachments.some((img) => img.uploadStatus === "uploading");
  const disableForMissingFollowUpCloudTurn =
    followUp?.type === "cloud" && !followUp.selectedTurnId;
  const hasWorkspaceRoots =
    !!workspaceRoots?.roots?.length &&
    !(workspaceRoots.roots.length === 1 && workspaceRoots.roots[0] === "/");
  const isMissingWorkspaceRoots =
    composerMode !== "cloud" &&
    !workspaceRootsLoading &&
    (!hasWorkspaceRoots || workspaceRootForSubmit === "/");
  const submitBlockReason = getSubmitBlockReason({
    disableSubmitForWindowsSandboxRequired:
      agentMode !== "read-only" &&
      (isWindowsSandboxRequired || isWindowsSandboxSetupPending),
    isMissingWorkspaceRoots,
    disableSubmitForMissingLocalConfig,
    disableSubmitForDisconnectedRemoteHost,
    disableSubmitForUnauthedRemoteHost,
    disableSubmitForMissingRemoteHost: false,
    disableSubmitForMissingRemoteProjectPath,
    disableSubmitForMissingCloudConfig,
    disableSubmitForUnsupportedImageInputs,
    disableSubmitForImageUploads,
    disableForMissingFollowUpCloudTurn,
    hasMessageContent,
  });
  const disabledReason =
    submitBlockReason == null
      ? null
      : getSubmitBlockMessage({
          submitBlockReason,
          intl,
          imageInputUnsupportedReason,
        });
  const handleSubmitBlockedDialogChange = useCallback(
    (open: boolean): void => {
      setIsSubmitBlockedDialogOpen(open);
      if (!open) {
        focusComposer();
      }
    },
    [focusComposer],
  );

  const submitButtonMode =
    isResponseInProgress && !hasMessageContent ? "stop" : "submit";
  const handleCleanBackgroundTerminalsClick = (): void => {
    if (isCleaningBackgroundTerminals) {
      return;
    }
    setIsCleaningBackgroundTerminals(true);
    void onCleanBackgroundTerminals()
      .catch(() => {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "composer.cleanBackgroundTerminals.error",
            defaultMessage: "Unable to stop background terminals.",
            description:
              "Toast shown when cleaning background terminals fails.",
          }),
        );
      })
      .finally(() => {
        setIsCleaningBackgroundTerminals(false);
      });
  };
  const isFollowing =
    followUp?.type === "local"
      ? mcpManager.getStreamRole(followUp.localConversationId)?.role ===
        "follower"
      : false;
  const canStopFromEscape = !isFollowing || isCompactWindowContextFromWindow();

  useEffect((): (() => void) => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !document.hasFocus()) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest("[data-codex-terminal]")
      ) {
        return;
      }
      const isComposerFocused = composerController.view.hasFocus();
      if (
        followUp?.type === "local" &&
        submitButtonMode === "stop" &&
        canStopFromEscape &&
        isComposerFocused
      ) {
        event.preventDefault();
        event.stopPropagation();
        onStop();
        focusComposer();
        return;
      }
      if (isComposerFocused) {
        // When composer is focused, let editor-level Escape behavior run
        // (e.g. blur/unfocus) instead of forcing focus back immediately.
        return;
      }
      focusComposer();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return (): void => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [
    canStopFromEscape,
    composerController,
    focusComposer,
    followUp?.type,
    onStop,
    submitButtonMode,
  ]);

  const handleRemoveImage = (idToRemove: string): void => {
    setImageAttachments((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  const handleRemoveFileAttachment = (idx: number): void => {
    setFileAttachments(fileAttachments.filter((_, i) => i !== idx));
  };

  const handleRemoveFile = (idx: number): void => {
    setAddedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOpenFile = (file: FileDescriptor): void => {
    const attachmentPath = file.fsPath || file.path;
    if (!attachmentPath || attachmentPath.length === 0) {
      return;
    }
    const line = file.startLine;
    openFile.mutate({
      path: attachmentPath,
      line,
      column: line == null ? undefined : 1,
      cwd: openFileCwd,
    });
  };

  const handleRemoveAllCommentAttachments = (): void => {
    setComments([]);
  };

  const handleRemoveAllPullRequestChecks = (): void => {
    setComposerStateField("pullRequestChecks", []);
  };

  const handleRemovePriorConversation = (): void => {
    setPriorConversation(null);
  };

  const clearComposerUi = (): void => {
    composerController.setText("");
    setImageAttachments(() => []);
    setFileAttachments([]);
    setAddedFiles(() => []);
    setComments([]);
    setComposerStateField("pullRequestChecks", []);
    const conversationModelComments =
      modelComments?.[reviewFindingConversationId];
    if (
      modelComments &&
      conversationModelComments &&
      conversationModelComments.length > 0
    ) {
      setModelComments({
        ...modelComments,
        [reviewFindingConversationId]: [],
      });
    }
    setPriorConversation(null);
    attachmentGenRef.current = attachmentGenRef.current + 1;
  };

  const logMessageSentProductEvent = (
    inProgressMessageType: "steer" | "queue" | "stop",
    serviceTierForEvent: ServiceTierAnalyticsValue,
  ): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_message_sent",
      metadata: {
        mode: composerMode,
        image_count: imageAttachments.length,
        file_count: fileAttachments.length,
        context_file_count: addedFiles.length,
        comment_attachment_count: commentAttachments.length,
        has_prior_conversation: priorConversation != null,
        is_follow_up: followUp != null,
        isResponseInProgress,
        inProgressMessageType,
        service_tier: serviceTierForEvent,
      },
    });
  };

  const buildLocalContextForPrompt = async (
    prompt: string,
    collaborationMode?: AppServer.CollaborationMode,
  ): Promise<LocalComposerSubmitContext> => {
    const ideContext = await fetchIdeContextSafe(
      isElectron,
      isAutoContextOn,
      workspaceRootForSubmit,
    );
    return {
      addedFiles,
      collaborationMode,
      prompt,
      ideContext: ideContext ?? null,
      imageAttachments,
      fileAttachments,
      commentAttachments,
      pullRequestChecks,
      reviewFindings: reviewFindingsForPrompt,
      priorConversation: priorConversation ?? undefined,
      workspaceRoots: { roots: [workspaceRootForSubmit] },
    };
  };

  const maybeOpenBranchMismatchDialog = ({
    context,
    cwd,
    inProgressMessageType,
    localExecutionOptions,
    restoreMessage,
  }: PendingBranchMismatchFollowUp): boolean => {
    const shouldConfirmBranchMismatch =
      followUp?.type === "local" &&
      !isCodexWorktree(cwd, codexHome ?? undefined) &&
      !skipThreadBranchMismatchConfirm &&
      storedThreadBranchName.length > 0 &&
      checkedOutBranchName.length > 0 &&
      storedThreadBranchName !== checkedOutBranchName;
    if (!shouldConfirmBranchMismatch) {
      return false;
    }

    setPendingBranchMismatchFollowUp({
      context,
      cwd,
      inProgressMessageType,
      localExecutionOptions,
      restoreMessage,
    });
    setSkipFutureBranchMismatchPrompt(false);
    return true;
  };

  const handleLocalFollowUpSubmit = async (
    prompt: string,
    collaborationMode?: AppServer.CollaborationMode,
  ): Promise<void> => {
    const localContext = await buildLocalContextForPrompt(
      prompt,
      collaborationMode,
    );
    if (
      maybeOpenBranchMismatchDialog({ context: localContext, cwd: resolvedCwd })
    ) {
      return;
    }
    await onSubmitLocal(localContext, resolvedCwd);
  };

  const handlePendingBranchMismatchSubmitError = (
    error: unknown,
    cwd: string,
  ): void => {
    logger.error(`[Composer] submit failed`, {
      safe: {
        mode: composerMode,
        followUp: followUp?.type ?? "none",
      },
      sensitive: {
        cwd,
        error,
      },
    });
    scope.get(toast$).danger(
      isClosedAgentSendError(error)
        ? intl.formatMessage({
            id: "composer.closedAgentError",
            defaultMessage:
              "Ask parent to resume sub-agent to continue conversation",
            description:
              "Toast shown when the user tries to send a message to a closed agent thread",
          })
        : shouldShowReauthError(error)
          ? intl.formatMessage({
              id: "composer.cloudTaskError.cloudRequirements",
              defaultMessage:
                "Error creating task. Please log out and sign in again",
              description:
                "Toast shown when creating a task fails because auth must be refreshed",
            })
          : intl.formatMessage(
              {
                id: "composer.cloudTaskError.v2",
                defaultMessage: "Error creating task{br}{error}",
                description: "Toast shown when we fail to create a Codex task",
              },
              {
                br: <br />,
                error: maybeErrorToString(error),
              },
            ),
    );
  };

  const handleBranchMismatchDialogClose = (): void => {
    setPendingBranchMismatchFollowUp(null);
    setSkipFutureBranchMismatchPrompt(false);
    focusComposer();
  };

  const handleConfirmBranchMismatchFollowUp = async (): Promise<void> => {
    if (pendingBranchMismatchFollowUp == null) {
      return;
    }

    if (skipFutureBranchMismatchPrompt) {
      setSkipThreadBranchMismatchConfirm(true);
    }

    const pendingFollowUp = pendingBranchMismatchFollowUp;
    if (pendingFollowUp.inProgressMessageType != null) {
      logMessageSentProductEvent(
        pendingFollowUp.inProgressMessageType,
        serviceTierForTelemetry,
      );
    }
    setPendingBranchMismatchFollowUp(null);
    setSkipFutureBranchMismatchPrompt(false);
    setIsSubmitting(true);

    if (pendingFollowUp.inProgressMessageType === "queue") {
      const queuedMessage = buildQueuedFollowUpMessageFromLocalContext({
        context: pendingFollowUp.context,
        cwd: pendingFollowUp.cwd,
      });
      queuedMessageActions.enqueue({
        text: queuedMessage.text,
        context: queuedMessage.context,
        cwd: queuedMessage.cwd,
      });
      clearComposerUi();
      setIsSubmitting(false);
      focusComposer();
      return;
    }

    try {
      await onSubmitLocal(
        pendingFollowUp.context,
        pendingFollowUp.cwd,
        undefined,
        pendingFollowUp.localExecutionOptions,
        pendingFollowUp.restoreMessage,
      );
      clearComposerUi();
      onSubmitSuccess?.();
    } catch (error) {
      handlePendingBranchMismatchSubmitError(error, pendingFollowUp.cwd);
    } finally {
      setIsSubmitting(false);
      focusComposer();
    }
  };

  const handleBackgroundSubagentApprovalFollowUpSubmit = async (
    childConversationId: ConversationId,
    prompt: string,
    collaborationMode?: AppServer.CollaborationMode,
  ): Promise<void> => {
    const localContext = await buildLocalContextForPrompt(
      prompt,
      collaborationMode,
    );
    if (mcpManager.needsResume(childConversationId)) {
      await maybeResumeConversation(mcpManager, {
        conversationId: childConversationId,
        model: null,
        reasoningEffort: null,
        workspaceRoots: localContext.workspaceRoots?.roots ?? [resolvedCwd],
        collaborationMode:
          localContext.collaborationMode ?? activeCollaborationMode,
      });
    }
    const childConversation = mcpManager.getConversation(childConversationId);
    if (childConversation?.turns.at(-1)?.status === "inProgress") {
      const childCwd = childConversation?.cwd ?? resolvedCwd;
      await steerLocalFollowUpTurn({
        manager: mcpManager,
        context: localContext,
        targetConversationId: childConversationId,
        cwd: childCwd,
        agentMode,
        activeCollaborationMode,
        restoreMessage: buildQueuedFollowUpMessageFromLocalContext({
          context: localContext,
          cwd: childCwd,
        }),
      });
      return;
    }
    await startLocalFollowUpTurn({
      manager: mcpManager,
      context: localContext,
      targetConversationId: childConversationId,
      cwd: childConversation?.cwd ?? resolvedCwd,
      agentMode,
      activeCollaborationMode,
    });
  };

  const handleNewCloudTask = async (
    context: CloudComposerSubmitContext,
    taskType: ExtractDiscriminated<CloudTaskSubmissionType, "type", "new-task">,
  ): Promise<void> => {
    const cloneUrl = context.repo?.clone_url;
    const gitRoot = cloneUrl ? await gitRootForOriginUrl(cloneUrl) : null;
    if (!gitRoot) {
      throw new Error("Unable to determine project root for task");
    }

    let adhocEnvironment: AdhocEnvironment | null = null;
    if (!codeEnvironment) {
      if (!isWorktreeSnapshotsEnabled) {
        throw new Error("No environment selected");
      }
      const snapshot = await fetchFromVSCode("prepare-worktree-snapshot", {
        params: {
          gitRoot,
          snapshotBranch:
            taskType.startingState.type === "branch"
              ? taskType.startingState.branchName
              : null,
        },
      });
      const uploadInfo = await createWorktreeSnapshotUploadUrl({
        repoName: snapshot.repoName,
        filename: snapshot.tarballFilename,
        contentType: snapshot.contentType,
        anticipatedFileSize: snapshot.tarballSize,
      });
      const uploadResult = await fetchFromVSCode("upload-worktree-snapshot", {
        params: {
          tarballPath: snapshot.tarballPath,
          uploadUrl: uploadInfo.upload_url,
          contentLength: snapshot.tarballSize,
          contentType: snapshot.contentType,
        },
      });
      if (!uploadResult.success) {
        throw new Error("Failed to upload worktree snapshot");
      }
      const finishedSnapshot = await finishWorktreeSnapshotUpload({
        fileId: uploadInfo.file_id,
        etag: uploadInfo.etag,
      });
      adhocEnvironment = {
        repos: [
          {
            kind: "local_worktree",
            name: snapshot.repoName,
            remotes: snapshot.remotes,
            commit_sha: snapshot.commitSha,
            branch: snapshot.snapshotBranch,
            file_id: finishedSnapshot.file_id,
          },
        ],
      };
    }

    let cloudPriorConversation: PriorConversation | null = null;
    switch (taskType.startingState.type) {
      case "working-tree":
      case "branch": {
        cloudPriorConversation = null;
        break;
      }
      case "fork-local-task": {
        const conversationState = mcpManager.getConversationOrThrow(
          taskType.startingState.conversationId,
        );
        cloudPriorConversation =
          mapLocalConversationToPriorConversation(conversationState);
        break;
      }
      case "fork-cloud-task": {
        cloudPriorConversation = mapCloudTaskToPriorConversation(
          taskType.startingState.taskDetails,
        );
        break;
      }
    }
    const ideContext = buildPromptContextSection(context);
    const { ref, startingDiff } = await getRefAndDiffForCloudStartingState(
      mcpManager,
      taskType,
      gitRoot,
    );
    const images = context.imageAttachments
      .map((img) => img.pointer)
      .filter((img): img is ImageAssetPointer => img !== undefined);
    const result = await createCloudTaskMutation.mutateAsync({
      environmentId: codeEnvironment?.id ?? null,
      environment: adhocEnvironment,
      prompt: context.prompt,
      ideContext,
      ref,
      startingDiff,
      priorConversation: cloudPriorConversation,
      images,
      runEnvironmentInQaMode: false,
      commentAttachments: context.commentAttachments?.map((comment) => ({
        type: comment.type,
        content: comment.content,
        position: comment.position,
      })),
      bestOfN: context.bestOfN,
    });

    if (followUp?.type === "local") {
      mcpManager.addCloudTaskSyntheticItem(
        followUp.localConversationId,
        result.task.id,
      );
      // Don't navigate to the new cloud task from a local task. A synthetic message is shown instead and the header shows the in progress state.
      return;
    }

    if (!__STORYBOOK__ && location.pathname === "/") {
      setPersistedValue("has-seen-multi-agent-composer-banner", true);
    }

    if (isHotkeyWindowContextFromWindow()) {
      messageBus.dispatchMessage("open-in-hotkey-window", {
        path: buildHotkeyWindowRemoteConversationRoute(result.task.id),
      });
      return;
    }

    // Switch to the freshly created cloud task so the user can monitor it.
    void navigate(buildRemoteConversationRoute(result.task.id));
  };

  const handleCloudFollowUpForCloudTask = async (
    context: CloudComposerSubmitContext,
    taskId: string,
    turnId: string,
  ): Promise<void> => {
    const ideContext = buildPromptContextSection(context);
    const images = context.imageAttachments
      .map((img) => img.pointer)
      .filter((img): img is ImageAssetPointer => img !== undefined);
    await followUpToCloudTaskMutation.mutateAsync({
      taskId,
      turnId,
      prompt: context.prompt,
      ideContext,
      images,
      runEnvironmentInQaMode: false,
      priorConversation: null,
      commentAttachments: context.commentAttachments?.map((comment) => ({
        type: comment.type,
        content: comment.content,
        position: comment.position,
      })),
      bestOfN: context.bestOfN,
    });
    void queryClient.invalidateQueries({
      queryKey: ["task", taskId],
    });
  };

  const handleSubmitCloud = async (
    context: CloudComposerSubmitContext,
  ): Promise<void> => {
    try {
      switch (context.cloudTaskType.type) {
        case "new-task": {
          await handleNewCloudTask(context, context.cloudTaskType);
          break;
        }
        case "follow-up": {
          await handleCloudFollowUpForCloudTask(
            context,
            context.cloudTaskType.taskId,
            context.cloudTaskType.turnId,
          );
          break;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error) {
      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "composer.cloudTaskCreationError.v2",
            defaultMessage: "Error creating cloud task{br}{error}",
            description:
              "Toast text shown when we failed to create a cloud task",
          },
          {
            br: <br />,
            error: maybeErrorToString(error),
          },
        ),
      );
      logger.error(`Error creating task`, {
        safe: {},
        sensitive: { error: error },
      });
      throw error;
    }
  };

  const handleSubmit = async ({
    invertInProgressFollowUpMode = false,
  }: {
    invertInProgressFollowUpMode?: boolean;
  } = {}): Promise<void> => {
    const inProgressFollowUpAction = getInProgressFollowUpAction({
      invertInProgressFollowUpMode,
      isQueueingEnabled,
    });
    const shouldQueueInProgressFollowUp =
      followUp?.type === "local" &&
      isResponseInProgress &&
      inProgressFollowUpAction === "queue";
    const inProgressMessageType: "steer" | "queue" | "stop" =
      submitButtonMode === "stop"
        ? "stop"
        : shouldQueueInProgressFollowUp
          ? "queue"
          : "steer";

    if (submitBlockReason != null) {
      if (submitBlockReason === "empty-message") {
        const queuedMessageId =
          inProgressFollowUpAction === "steer" ? queuedMessages[0]?.id : null;
        if (
          followUp?.type === "local" &&
          isResponseInProgress &&
          queuedMessageId
        ) {
          sendQueuedMessageNow({
            conversationId,
            messageId: queuedMessageId,
            queuedMessageActions,
            onSubmitLocal,
          });
          focusComposer();
          return;
        }
        setEmptySubmitTooltipNonce((prev) => prev + 1);
        return;
      }
      if (submitBlockReason === "missing-remote-project-path") {
        setIsSubmitBlockedDialogOpen(true);
        return;
      }
      setIsSubmitBlockedDialogOpen(true);
      return;
    }

    const handleWorktreeSubmitError = (error: unknown): void => {
      logger.error(`[Composer] submit failed`, {
        safe: {
          mode: composerMode,
          followUp: followUp?.type ?? "none",
        },
        sensitive: {
          cwd: workspaceRootForSubmit,
          error: error,
        },
      });
      const toastMessage = isWorktreeInitFailure(error)
        ? buildWorktreeInitFailureToast(intl)
        : shouldShowReauthError(error)
          ? intl.formatMessage({
              id: "composer.localTaskError.cloudRequirements.v2",
              defaultMessage:
                "Error starting thread. Please log out and sign in again",
              description:
                "Toast text shown when starting a thread fails because cloud requirements could not be loaded",
            })
          : intl.formatMessage(
              {
                id: "composer.localTaskError.v2",
                defaultMessage: "Error starting thread{br}{error}",
                description:
                  "Toast text shown when we failed to start a thread",
              },
              {
                br: <br />,
                error: maybeErrorToString(error),
              },
            );
      scope.get(toast$).danger(toastMessage, {
        id: "composer.taskError",
      });
    };
    const promptRaw = composerController.getText();
    const prompt = expandCustomPrompt(promptRaw, prompts);
    appendPromptToHistory(prompt);
    resetHistorySelection();
    if (resolvedCwd === "/") {
      logger.warning(
        "[Composer] resolvedCwd fell back to '/', verify workspace roots and conversation repoContext",
      );
    }

    const localContext = await buildLocalContextForPrompt(prompt);
    if (
      maybeOpenBranchMismatchDialog({
        context: localContext,
        cwd: currentLocalExecutionCwd,
        inProgressMessageType,
        localExecutionOptions: currentLocalExecutionOptions,
      })
    ) {
      return;
    }

    logMessageSentProductEvent(inProgressMessageType, serviceTierForTelemetry);
    setIsSubmitting(true);

    const handleSubmitError = (e: unknown): void => {
      logger.error(`[Composer] submit failed`, {
        safe: {
          mode: composerMode,
          followUp: followUp?.type ?? "none",
        },
        sensitive: {
          cwd: currentLocalExecutionCwd,
          error: e,
        },
      });
      if (composerMode === "worktree") {
        handleWorktreeSubmitError(e);
      } else {
        scope.get(toast$).danger(
          isClosedAgentSendError(e)
            ? intl.formatMessage({
                id: "composer.closedAgentError",
                defaultMessage:
                  "Ask parent to resume sub-agent to continue conversation",
                description:
                  "Toast shown when the user tries to send a message to a closed agent thread",
              })
            : shouldShowReauthError(e)
              ? intl.formatMessage({
                  id: "composer.cloudTaskError.cloudRequirements",
                  defaultMessage:
                    "Error creating task. Please log out and sign in again",
                  description:
                    "Toast shown when creating a task fails because auth must be refreshed",
                })
              : intl.formatMessage(
                  {
                    id: "composer.cloudTaskError.v2",
                    defaultMessage: "Error creating task{br}{error}",
                    description:
                      "Toast shown when we fail to create a Codex task",
                  },
                  {
                    br: <br />,
                    error: maybeErrorToString(e),
                  },
                ),
        );
      }
    };

    const submit = async (): Promise<void> => {
      void queryClient.invalidateQueries({ queryKey: ["rate-limit-status"] });

      switch (composerMode) {
        case "local": {
          await onSubmitLocal(
            localContext,
            currentLocalExecutionCwd,
            undefined,
            currentLocalExecutionOptions,
          );
          if (followUp?.type === "local" && !isResponseInProgress) {
            queuedMessageActions.resumeInterruptedSteers();
          }
          break;
        }
        case "worktree": {
          await onSubmitWorktree(
            localContext,
            workspaceRootForSubmit,
            newTaskCloudStartingState,
            resolvedWorktreeEnvironmentConfigPath,
            {
              appServerManager:
                worktreeExecutionTargetManager ?? currentLocalAppServerManager,
              workspaceRoots: [worktreeSourceCwd],
            },
          );
          break;
        }
        case "cloud": {
          const cloudTaskType = getCloudTaskType(
            followUp,
            newTaskCloudStartingState,
            followUpCloudStartingState,
          );

          await handleSubmitCloud({
            addedFiles,
            prompt,
            ideContext: localContext.ideContext,
            imageAttachments,
            fileAttachments,
            commentAttachments,
            pullRequestChecks,
            reviewFindings: reviewFindingsForPrompt,
            repo,
            cloudTaskType,
            bestOfN,
            priorConversation: priorConversation ?? undefined,
          });
          break;
        }
      }
    };

    const shouldQueueMessage = shouldQueueInProgressFollowUp;
    if (shouldQueueMessage) {
      queuedMessageActions.enqueue({
        text: promptRaw,
        context: {
          ...localContext,
          workspaceRoots: localContext.workspaceRoots?.roots,
        },
        cwd: resolvedCwd,
      });
      clearComposerUi();
      setIsSubmitting(false);
      focusComposer();
      return;
    }
    if (composerMode === "worktree") {
      clearComposerUi();
      setIsSubmitting(false);
      onSubmitSuccess?.();
      try {
        await submit();
      } catch (e) {
        handleSubmitError(e);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await submit();
      clearComposerUi();
      onSubmitSuccess?.();
    } catch (e) {
      handleSubmitError(e);
    } finally {
      setIsSubmitting(false);
      focusComposer();
    }
  };

  function maybeSendQueuedSteerMessage({
    invertInProgressFollowUpMode = false,
  }: {
    invertInProgressFollowUpMode?: boolean;
  } = {}): boolean {
    if (
      followUp?.type !== "local" ||
      !isResponseInProgress ||
      hasMessageContent
    ) {
      return false;
    }
    if (
      getInProgressFollowUpAction({
        invertInProgressFollowUpMode,
        isQueueingEnabled,
      }) !== "steer"
    ) {
      return false;
    }

    const queuedMessageId = queuedMessages[0]?.id;
    if (!queuedMessageId) {
      return false;
    }

    sendQueuedMessageNow({
      conversationId,
      messageId: queuedMessageId,
      queuedMessageActions,
      onSubmitLocal,
    });
    focusComposer();
    return true;
  }

  const submitWithInvertedFollowUpMode = useEffectEvent(
    (event: KeyboardEvent): boolean => {
      const isModEnter = event.metaKey || event.ctrlKey;
      const isSecondarySubmitShortcut =
        enterBehavior === "cmdIfMultiline"
          ? isModEnter && event.shiftKey && !event.altKey
          : isModEnter && !event.shiftKey && !event.altKey;
      if (!isSecondarySubmitShortcut) {
        return false;
      }
      if (followUp?.type !== "local" || !isResponseInProgress) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();
      if (maybeSendQueuedSteerMessage({ invertInProgressFollowUpMode: true })) {
        return true;
      }
      void handleSubmit({ invertInProgressFollowUpMode: true });
      return true;
    },
  );
  const hasPlanMode = collaborationModes.some((mode) => mode.mode === "plan");
  const hasDefaultMode = collaborationModes.some(
    (mode) => mode.mode === "default",
  );
  const isPlanMode = activeCollaborationMode?.mode === "plan";
  const handleFocusedComposerShortcut = useEffectEvent(
    (event: KeyboardEvent): boolean => {
      const state = composerController.view.state;
      const isMentionMenuActive =
        mentionUiKey.getState(state)?.active === true ||
        skillMentionUiKey.getState(state)?.active === true ||
        slashCommandUiKey.getState(state)?.active === true;

      return handleComposerFocusedShortcut({
        event,
        isComposerFocused: composerController.view.hasFocus(),
        hasActiveMentionMenu: isMentionMenuActive,
        hasPlanMode: !isCollaborationModeLoading && hasPlanMode,
        hasDefaultMode,
        isPlanMode,
        setSelectedMode: setSelectedCollaborationMode,
        blurComposer: () => {
          (composerController.view.dom as HTMLElement).blur();
        },
      });
    },
  );

  useEffect(() => {
    return setCustomKeymapHandlers(composerController.view, {
      Enter: submitWithInvertedFollowUpMode,
      Escape: handleFocusedComposerShortcut,
      Tab: handleFocusedComposerShortcut,
    });
  }, [composerController]);

  const addImageAttachment = ({
    src,
    localPath,
    filename,
    gen,
  }: {
    src: string;
    localPath?: string;
    filename?: string;
    gen: number;
  }): void => {
    const id = uuidv4();
    const isCloud = composerMode === "cloud";
    const newImage = {
      id,
      src,
      localPath,
      filename,
      uploadStatus: isCloud ? ("uploading" as const) : ("idle" as const),
    };
    setImageAttachments((prev) => [...prev, newImage]);
    if (isCloud) {
      uploadImageAttachment(newImage, gen);
    }
  };

  // Shared function to add pasted/selected images as attachments
  const addImages = (files: Array<File>): void => {
    if (!supportsImageInputs) {
      notifyImageInputUnsupported();
      return;
    }
    if (!files || files.length === 0) {
      return;
    }
    const gen = attachmentGenRef.current;
    for (const file of files) {
      const reader = new FileReader();
      // Derive a reasonable filename for display
      const baseName =
        file.name && file.name.trim().length > 0 ? file.name : undefined;
      const mime = file.type || "image/png";
      const ext = ((): string => {
        const m = mime.split("/")[1] || "png";
        return m === "jpeg" ? "jpg" : m;
      })();
      const displayName =
        baseName ?? `pasted-image-${uuidv4().slice(0, 8)}.${ext}`;
      const localPath = getDroppedFilePath(file) ?? undefined;
      reader.onload = (ev): void => {
        // Ignore async results if attachments were cleared or a new send started
        if (attachmentGenRef.current !== gen) {
          return;
        }
        const result = ev.target?.result as string;
        addImageAttachment({
          src: result,
          localPath,
          filename: displayName,
          gen,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addImageDataUrls = (images: Array<ComposerImageDataUrl>): void => {
    if (images.length === 0) {
      return;
    }
    const gen = attachmentGenRef.current;
    for (const image of images) {
      addImageAttachment({
        src: image.dataUrl,
        localPath: image.localPath,
        filename: image.filename,
        gen,
      });
    }
  };

  const pastedImagesHandler = useEffectEvent((files: Array<File>): void => {
    addImages(files);
  });

  useEffect(() => {
    composerController.addPastedImagesHandler(pastedImagesHandler);
    return (): void => {
      composerController.removePastedImagesHandler(pastedImagesHandler);
    };
  }, [composerController]);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>): void => {
    if (e.defaultPrevented) {
      return;
    }
    const dt = e.clipboardData;
    if (!dt) {
      return;
    }
    const items = Array.from(dt.items ?? []);
    const imageFiles: Array<File> = [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length === 0) {
      return;
    }
    e.preventDefault();
    addImages(imageFiles);
  };

  const dragHasFiles = (dt: DataTransfer | null): boolean => {
    if (!dt) {
      return false;
    }
    if (Array.from(dt.items ?? []).some((it) => it.kind === "file")) {
      return true;
    }
    const { types } = dt;
    for (let index = 0; index < types.length; index += 1) {
      if (types[index] === "Files") {
        return true;
      }
    }
    return false;
  };

  const getDragFiles = (dt: DataTransfer | null): Array<File> => {
    if (!dt) {
      return [];
    }
    if (dt.files.length > 0) {
      return Array.from(dt.files);
    }
    return Array.from(dt.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file != null);
  };

  const getDragImageFiles = (dt: DataTransfer | null): Array<File> => {
    return getDragFiles(dt).filter(isLikelyImageFile);
  };

  const getDragNonImageFiles = (dt: DataTransfer | null): Array<File> => {
    return getDragFiles(dt).filter((file) => !isLikelyImageFile(file));
  };

  const getDroppedFilePath = (file: File): string | null => {
    const fromBridge = window.electronBridge?.getPathForFile?.(file);
    if (fromBridge && fromBridge.length > 0) {
      return fromBridge;
    }
    const fallbackPath = (file as File & { path?: string }).path;
    if (fallbackPath && fallbackPath.length > 0) {
      return fallbackPath;
    }
    return null;
  };

  const addDroppedFilesAsMentions = (files: Array<File>): void => {
    const droppedFiles: Array<FileDescriptor> = [];
    for (const file of files) {
      const droppedPath = getDroppedFilePath(file);
      if (!droppedPath) {
        continue;
      }
      const fullPath = normalizePath(droppedPath);
      const label = path.posix.basename(fullPath) || file.name || fullPath;
      droppedFiles.push({ label, path: fullPath, fsPath: fullPath });
    }
    if (droppedFiles.length === 0) {
      return;
    }
    setAddedFiles((prev) => {
      let next = prev;
      for (const droppedFile of droppedFiles) {
        const alreadyIncluded = next.some(
          (existingFile) =>
            normalizeFsPath(existingFile.fsPath) ===
              normalizeFsPath(droppedFile.fsPath) &&
            existingFile.startLine === droppedFile.startLine &&
            existingFile.endLine === droppedFile.endLine,
        );
        if (!alreadyIncluded) {
          next = [...next, droppedFile];
        }
      }
      return next;
    });
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!dragHasFiles(e.dataTransfer)) {
      return;
    }

    setShowShiftOverlay(!e.shiftKey);
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    dragCounterRef.current = dragCounterRef.current + 1;
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!dragHasFiles(e.dataTransfer)) {
      return;
    }

    // If shift is not held, display a prompt to the user to hold shift to drop.
    // This is needed to make the drag behavior work within a webview in VS Code.
    // If the user doesn't hold shift, VS Code will intercept the drop.
    setShowShiftOverlay(!e.shiftKey);
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!dragHasFiles(e.dataTransfer)) {
      return;
    }
    // Balance nested enter/leave events
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
      setShowShiftOverlay(false);
    }
  };

  const resetDragState = (): void => {
    dragCounterRef.current = 0;
    setIsDragActive(false);
    setShowShiftOverlay(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    const imageFiles = getDragImageFiles(e.dataTransfer);
    const otherFiles = getDragNonImageFiles(e.dataTransfer);
    if (imageFiles.length === 0 && otherFiles.length === 0) {
      return;
    }
    e.preventDefault();
    if (imageFiles.length > 0) {
      addImages(imageFiles);
    }
    if (otherFiles.length > 0) {
      addDroppedFilesAsMentions(otherFiles);
    }
    resetDragState();
  };

  const worktreeEnvironmentDropdown =
    !followUp && composerMode === "worktree" && isElectron ? (
      <WorktreeEnvironmentDropdown
        environments={worktreeEnvironments}
        isLoading={localEnvironmentsLoading}
        hasError={localEnvironmentsError != null}
        selectedConfigPath={resolvedWorktreeEnvironmentConfigPath}
        onSelectConfigPath={updateEnvironmentSelection}
        onOpenSettings={() => {
          void navigate("/settings/local-environments");
        }}
      />
    ) : null;
  const isHotkeyWindowContext = isHotkeyWindowContextFromWindow();
  const isHotkeyWindowHome = location.pathname === "/hotkey-window";
  const externalFooterProps = {
    followUp,
    composerMode,
    setComposerMode,
    conversationId,
    isResponseInProgress,
    asyncThreadStartingState: newTaskCloudStartingState,
    setStartingState: setNewTaskCloudStartingState,
    cloudFollowUpStartingState: followUpCloudStartingState,
    setCloudFollowUpStartingState: setFollowUpCloudStartingState,
    worktreeEnvironmentDropdown,
    codexHome,
    showWorkspaceDropdown: showWorkspaceDropdownInFooter,
    gitRootForStartingState:
      composerMode === "worktree"
        ? worktreeGitContextRoot
        : composerMode === "cloud"
          ? activeWorkspaceRoot
          : null,
    footerBranchName,
    showFooterBranchWhen,
    freeUpsellButton,
    remoteConfig: {
      currentHostId: localExecutionRemoteHostId,
      getProjectPathForHostId: (hostId: string | null): string | null => {
        return selectedRemoteProject?.hostId === hostId
          ? selectedRemoteProject.remotePath
          : null;
      },
    },
  };

  return (
    <>
      {isHotkeyWindowContext && !isHotkeyWindowHome ? (
        <HotkeyWindowNewSlashCommand />
      ) : null}
      {isHotkeyWindowContext ? <HotkeyWindowResumeSlashCommand /> : null}
      {isHotkeyWindowContext && isHotkeyWindowHome ? (
        <HotkeyWindowSelectProjectSlashCommand />
      ) : null}
      <McpSlashCommand />
      <PlanModeSlashCommand conversationId={conversationId} />
      {composerMode !== "cloud" ? (
        <ModelSlashCommand conversationId={conversationId} />
      ) : null}
      {composerMode !== "cloud" ? (
        <ReasoningSlashCommand conversationId={conversationId} />
      ) : null}
      <IdeContextSlashCommand
        isAutoContextOn={isAutoContextOn}
        setIsAutoContextOn={setIsAutoContextOn}
        ideContextStatus={ideContextStatus}
      />
      {followUp?.type === "local" && !isCompactWindowContextFromWindow() ? (
        <ForkSlashCommand
          isResponseInProgress={
            isResponseInProgress || isForkResponseInProgress
          }
          canForkToWorktree={isElectron && canForkIntoWorktree}
          onForkIntoLocal={forkIntoLocal}
          onForkIntoWorktree={forkIntoWorktree}
        />
      ) : null}
      {isPersonalityEnabled && (
        <PersonalitySlashCommand conversationId={conversationId} />
      )}
      <SpeedSlashCommand />
      <StatusSlashCommand
        conversationId={conversationId}
        threadId={statusThreadId}
        rateLimit={rateLimit ?? null}
        onOpenChange={setIsStatusMenuOpen}
      />
      <ReviewSlashCommand
        cwd={createGitCwd(currentLocalExecutionCwd)}
        hostConfig={currentLocalExecutionHostConfig}
      />
      <div
        className="relative flex w-full flex-col gap-2"
        onPaste={handlePaste}
      >
        {queuedMessagePortalTarget &&
        (shouldShowWindowsSandboxBanner ||
          pendingSteers.length > 0 ||
          queuedMessages.length > 0 ||
          backgroundTerminals.length > 0 ||
          backgroundSubagentMemberships.length > 0)
          ? createPortal(
              <div
                className={clsx(
                  "order-2 flex flex-col",
                  !followUp &&
                    shouldShowWindowsSandboxBanner &&
                    pendingSteers.length === 0 &&
                    queuedMessages.length === 0 &&
                    backgroundTerminals.length === 0 &&
                    backgroundSubagentMemberships.length === 0 &&
                    "-mb-2",
                )}
              >
                {pendingSteers.length > 0 || queuedMessages.length > 0 ? (
                  <QueuedMessageList
                    pendingSteers={pendingSteers}
                    messages={queuedMessages.map((message) => ({
                      id: message.id,
                      text: message.text,
                      commentCount:
                        message.context.commentAttachments?.length ?? 0,
                    }))}
                    editingMessageId={editingQueuedMessageId}
                    isQueueingEnabled={isQueueingEnabled}
                    onEditMessage={(messageId) => {
                      const queuedMessage = queuedMessages.find(
                        (message) => message.id === messageId,
                      );
                      if (!queuedMessage) {
                        return;
                      }
                      queuedMessageActions.remove(messageId);
                      setEditingQueuedMessageId(messageId);
                      if (hasSerializedPromptMentions(queuedMessage.text)) {
                        composerController.setPromptText(queuedMessage.text);
                      } else {
                        composerController.setText(queuedMessage.text);
                      }
                      setImageAttachments(
                        () => queuedMessage.context.imageAttachments,
                      );
                      setFileAttachments(queuedMessage.context.fileAttachments);
                      setAddedFiles(() => queuedMessage.context.addedFiles);
                      setComments(
                        queuedMessage.context.commentAttachments ?? [],
                      );
                      setComposerStateField(
                        "pullRequestChecks",
                        queuedMessage.context.pullRequestChecks ?? [],
                      );
                      setPriorConversation(
                        queuedMessage.context.priorConversation ?? null,
                      );
                      focusComposer();
                    }}
                    onDeleteMessage={(messageId) => {
                      queuedMessageActions.remove(messageId);
                    }}
                    onSendNowMessage={(messageId) => {
                      sendQueuedMessageNow({
                        conversationId,
                        messageId,
                        queuedMessageActions,
                        onSubmitLocal,
                      });
                    }}
                    onReorderMessages={(orderedMessageIds) => {
                      queuedMessageActions.reorder(orderedMessageIds);
                    }}
                    onQueueingChange={(value) => {
                      if (isQueueingEnabledLoading) {
                        return;
                      }
                      void setQueueingMode(value ? "queue" : "steer");
                    }}
                  />
                ) : null}
                {backgroundTerminals.length > 0 ? (
                  <BackgroundTerminalsPanel
                    backgroundTerminals={backgroundTerminals}
                    isCleaningBackgroundTerminals={
                      isCleaningBackgroundTerminals
                    }
                    onCleanBackgroundTerminals={
                      handleCleanBackgroundTerminalsClick
                    }
                    showRoundedTop={
                      pendingSteers.length === 0 &&
                      queuedMessages.length === 0 &&
                      !hasAboveComposerPortalContent
                    }
                  />
                ) : null}
                {isBackgroundSubagentsPanelVisible ? (
                  <BackgroundSubagentsPanel
                    onOpenThread={(childConversationId) => {
                      void openSubagentThread(childConversationId);
                    }}
                    rows={visibleBackgroundSubagentRows}
                    showRoundedTop={
                      pendingSteers.length === 0 &&
                      queuedMessages.length === 0 &&
                      backgroundTerminals.length === 0 &&
                      !hasAboveComposerPortalContent
                    }
                  />
                ) : null}
                {shouldShowWindowsSandboxBanner ? (
                  <WindowsSandboxBanner
                    cwd={resolvedCwd === "/" ? null : resolvedCwd}
                    showRoundedTop={
                      pendingSteers.length === 0 &&
                      queuedMessages.length === 0 &&
                      backgroundTerminals.length === 0 &&
                      !isBackgroundSubagentsPanelVisible &&
                      !hasAboveComposerPortalContent
                    }
                  />
                ) : null}
              </div>,
              queuedMessagePortalTarget,
            )
          : null}
        <CustomPromptSlashCommands composerController={composerController} />
        <SkillsSlashCommands
          cwd={resolvedCwd}
          roots={skillLookupRoots}
          appServerManager={currentLocalAppServerManager}
        />
        {isCreditsEnabled &&
          rateLimit &&
          (showCoreRateLimitUpsell ? (
            <RateLimitUpsellBanner rateLimitStatus={rateLimit} />
          ) : showModelLimitBanner ? (
            <RateLimitModelLimitBanner
              modelName={modelLimitName}
              resetAt={modelLimitResetAt}
            />
          ) : null)}
        <AutocompleteOverlay isActive={!!mentionAutocomplete.ui?.active}>
          <AtMentionList
            sections={atMentionSections}
            onUpdateSelectedMention={mentionAutocomplete.setSelectedMention}
            onAddContext={mentionAutocomplete.addMention}
          />
        </AutocompleteOverlay>
        <SlashCommandMenuController />
        <SkillMentionAutocompleteOverlay
          autocomplete={skillMentionAutocomplete}
          query={debouncedSkillMentionQuery}
          cwd={resolvedCwd}
          roots={skillLookupRoots}
          appServerManager={currentLocalAppServerManager}
        />
        <div className="relative">
          <div
            ref={setAboveComposerSuggestionPortalTarget}
            className="@container pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2 flex justify-center"
          />
          {aboveComposerSuggestionPortalTarget &&
          !showHotkeyWindowHomeFooterControls &&
          !shouldHideAboveComposerSuggestions ? (
            <AboveComposerSuggestions
              portalTarget={aboveComposerSuggestionPortalTarget}
              conversationId={conversationId}
              collaborationModes={collaborationModes}
              activeCollaborationMode={activeCollaborationMode}
              setSelectedCollaborationMode={setSelectedCollaborationMode}
            />
          ) : null}
          {showPendingRequest ? (
            <div
              className={clsx("relative flex flex-col gap-2", surfaceClassName)}
            >
              {showChildApprovalPanel &&
              firstBackgroundSubagentApproval != null ? (
                <PendingRequestItemPanel
                  key={
                    firstBackgroundSubagentApproval.pendingRequest.item
                      .approvalRequestId ??
                    firstBackgroundSubagentApproval.pendingRequest.item.callId
                  }
                  approvalQuestionActor={
                    <span
                      className="font-medium"
                      style={{
                        color: getAgentMentionColorCssValueForSessionId(
                          firstBackgroundSubagentApproval.conversationId,
                        ),
                      }}
                    >
                      {firstBackgroundSubagentApproval.mentionLabel}
                    </span>
                  }
                  conversationId={
                    firstBackgroundSubagentApproval.conversationId
                  }
                  pendingRequest={
                    firstBackgroundSubagentApproval.pendingRequest
                  }
                  onSubmitLocalFollowup={(prompt, collaborationMode) =>
                    handleBackgroundSubagentApprovalFollowUpSubmit(
                      firstBackgroundSubagentApproval.conversationId,
                      prompt,
                      collaborationMode,
                    )
                  }
                />
              ) : null}
              {showParentPendingRequestPanel && pendingRequest != null ? (
                <PendingRequestItemPanel
                  key={pendingRequestKey}
                  conversationId={conversationId}
                  pendingRequest={pendingRequest}
                  onSubmitLocalFollowup={handleLocalFollowUpSubmit}
                />
              ) : null}
            </div>
          ) : (
            <div
              inert={isSubmitting}
              className={clsx(
                "border-token-border relative flex flex-col overflow-y-auto rounded-3xl border bg-token-input-background bg-clip-padding",
                "electron:shadow-md electron:focus-within:shadow-lg electron:rounded-3xl electron:dark:bg-token-dropdown-background/50",
                isDragActive && "bg-token-dropdown-background/50",
                surfaceClassName,
              )}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {showShiftOverlay && (
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-token-editor-group-drop-background/60">
                  <div className="inline-flex items-center gap-1 rounded-md border border-token-border/50 bg-token-editor-group-drop-into-prompt-background px-3 py-1 text-sm text-token-editor-group-drop-into-prompt-foreground shadow">
                    <FormattedMessage
                      id="composer.dropOverlay.holdShift"
                      defaultMessage="Hold {key} to drop"
                      description="Overlay shown while dragging image without holding Shift"
                      values={{
                        key: (
                          <span className="inline-flex items-center rounded-md border border-token-editor-group-drop-into-prompt-foreground/40 px-1.5 py-0.5 text-sm">
                            <FormattedMessage
                              id="composer.dropOverlay.shiftKey"
                              defaultMessage="Shift"
                              description="Label for Shift keycap in drag overlay"
                            />
                          </span>
                        ),
                      }}
                    />
                  </div>
                </div>
              )}
              <div
                className={clsx("relative z-10 flex min-h-0 flex-1 flex-col")}
              >
                <>
                  <div
                    className={clsx(
                      showHotkeyWindowHomeFooterControls &&
                        hasVisibleAttachments &&
                        "mb-[5px]",
                      !showHotkeyWindowHomeFooterControls && "px-2 py-1.5",
                    )}
                  >
                    <AttachmentsRow
                      imageAttachments={imageAttachments}
                      fileAttachments={fileAttachments}
                      commentAttachments={commentAttachments}
                      pullRequestChecks={pullRequestChecks}
                      reviewFindingCount={acceptedReviewFindingCount}
                      onRemoveImage={handleRemoveImage}
                      onRemoveFileAttachment={handleRemoveFileAttachment}
                      onRemoveFile={handleRemoveFile}
                      onOpenFile={handleOpenFile}
                      addedFiles={addedFiles}
                      onRemoveAllPullRequestChecks={
                        handleRemoveAllPullRequestChecks
                      }
                      onRemoveAllCommentAttachments={
                        handleRemoveAllCommentAttachments
                      }
                      priorConversation={priorConversation}
                      onRemovePriorConversation={handleRemovePriorConversation}
                    />
                  </div>
                  <div
                    className={clsx(
                      "mb-2 flex-grow overflow-y-auto",
                      showHotkeyWindowHomeFooterControls ? "px-0" : "px-3",
                    )}
                  >
                    <RichTextInput
                      className="text-base"
                      disableAutoFocus={disableAutoFocus}
                      composerController={composerController}
                      placeholder={
                        placeholderText ??
                        getComposerPlaceholderText({
                          intl,
                          followUpType: followUp?.type,
                          composerMode,
                          cloudStartingState: followUpCloudStartingState,
                          isBackgroundSubagentsPanelVisible,
                        })
                      }
                      onMentionHandler={mentionAutocomplete.handleMentionEvent}
                      onSkillMentionHandler={
                        skillMentionAutocomplete.handleMentionEvent
                      }
                      onSubmit={() => {
                        if (maybeSendQueuedSteerMessage()) {
                          return;
                        }
                        switch (submitButtonMode) {
                          case "stop": {
                            // Intentionally no-op: pressing Enter on an empty composer should not
                            // cancel an in-flight turn.
                            break;
                          }
                          case "submit": {
                            void handleSubmit();
                            break;
                          }
                        }
                      }}
                    />
                  </div>
                  <ComposerInternalFooter
                    onAddImages={addImages}
                    onAddImageDataUrls={addImageDataUrls}
                    getAttachmentGen={() => attachmentGenRef.current}
                    fileAttachments={fileAttachments}
                    setFileAttachments={setFileAttachments}
                    composerMode={composerMode}
                    showHotkeyWindowHomeFooterControls={
                      showHotkeyWindowHomeFooterControls
                    }
                    hotkeyWindowHomeOverflowMenu={hotkeyWindowHomeOverflowMenu}
                    conversationId={conversationId}
                    isAutoContextOn={isAutoContextOn}
                    setIsAutoContextOn={setIsAutoContextOn}
                    ideContextStatus={ideContextStatus}
                    submitButtonMode={submitButtonMode}
                    isResponseInProgress={isResponseInProgress}
                    isQueueingEnabled={isQueueingEnabled}
                    isSubmitting={isSubmitting}
                    onStop={onStop}
                    submitBlockReason={submitBlockReason}
                    disabledReason={disabledReason}
                    emptySubmitTooltipNonce={emptySubmitTooltipNonce}
                    handleSubmit={handleSubmit}
                  />
                </>
              </div>
            </div>
          )}
        </div>
        {showExternalFooter ? (
          <ComposerExternalFooter {...externalFooterProps} />
        ) : null}
        <ComposerBranchMismatchDialog
          checkedOutBranchName={checkedOutBranchName}
          isSubmitting={isSubmitting}
          onClose={handleBranchMismatchDialogClose}
          onContinue={() => {
            void handleConfirmBranchMismatchFollowUp();
          }}
          open={pendingBranchMismatchFollowUp != null}
          setSkipFutureBranchMismatchPrompt={setSkipFutureBranchMismatchPrompt}
          skipFutureBranchMismatchPrompt={skipFutureBranchMismatchPrompt}
          storedThreadBranchName={storedThreadBranchName}
        />
        <SubmitBlockedDialog
          open={isSubmitBlockedDialogOpen}
          onOpenChange={(open) => {
            handleSubmitBlockedDialogChange(open);
            if (!open) {
              focusComposer();
            }
          }}
          message={disabledReason}
        />
      </div>
    </>
  );
}

function CustomPromptSlashCommands({
  composerController,
}: {
  composerController: ReturnType<typeof useComposerController>;
}): React.ReactElement | null {
  // TODO: Render prompt args as rich ProseMirror nodes when we add richer expansion/mentions.
  const prompts = useCustomPrompts();
  const setSlashCommands = useSetAtom(aSlashCommands);

  useEffect(() => {
    setSlashCommands((prev) => {
      const withoutCustom = prev.filter(
        (cmd) => !cmd.id.startsWith("custom-prompt:"),
      );
      const promptCommands: Array<SlashCommand> = prompts.map((prompt) => {
        const title = `prompts:${prompt.id}`;
        return {
          id: `custom-prompt:${prompt.id}`,
          title,
          description: prompt.description ?? undefined,
          requiresEmptyComposer: true,
          Icon: PastedTextIcon,
          onSelect: async (): Promise<void> => {
            const text =
              prompt.argumentHint && prompt.argumentHint.trim().length > 0
                ? `/prompts:${prompt.id} ${prompt.argumentHint}`.trimEnd()
                : `/prompts:${prompt.id}`;
            composerController.setText(text);
            composerController.focus();
          },
        };
      });
      const next = [...withoutCustom, ...promptCommands];
      return sortBy(next, (cmd) => cmd.title);
    });
  }, [composerController, prompts, setSlashCommands]);

  return null;
}

function getComposerPlaceholderText({
  intl,
  followUpType,
  composerMode,
  cloudStartingState,
  isBackgroundSubagentsPanelVisible,
}: {
  intl: IntlShape;
  followUpType: FollowUpProps["type"] | undefined;
  composerMode: ComposerMode;
  cloudStartingState: CloudFollowUpStartingState | undefined;
  isBackgroundSubagentsPanelVisible: boolean;
}): string {
  return intl.formatMessage(
    composerPlaceholderText(
      followUpType,
      composerMode,
      cloudStartingState,
      isBackgroundSubagentsPanelVisible,
    ),
  );
}

function AttachmentsRow({
  imageAttachments,
  fileAttachments,
  onRemoveImage,
  onRemoveFileAttachment,
  onRemoveFile,
  onOpenFile,
  addedFiles,
  commentAttachments,
  pullRequestChecks,
  reviewFindingCount,
  onRemoveAllPullRequestChecks,
  onRemoveAllCommentAttachments,
  priorConversation,
  onRemovePriorConversation,
}: {
  imageAttachments: Array<{
    id: string;
    src: string;
    filename?: string;
    uploadStatus?: "idle" | "uploading" | "ready" | "error";
  }>;
  fileAttachments: Array<FileDescriptor>;
  onRemoveImage: (id: string) => void;
  onRemoveFileAttachment: (idx: number) => void;
  onRemoveFile: (idx: number) => void;
  onOpenFile: (file: FileDescriptor) => void;
  addedFiles: Array<FileDescriptor>;
  commentAttachments: Array<CommentInputItem>;
  pullRequestChecks: Array<GhPullRequestCheck>;
  reviewFindingCount: number;
  onRemoveAllPullRequestChecks: () => void;
  onRemoveAllCommentAttachments: () => void;
  priorConversation?: PriorConversation | null;
  onRemovePriorConversation?: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const imagePreviewEnabled =
    typeof window === "undefined" ||
    !isHotkeyWindowHomePathname(window.location.pathname);
  return (
    <div className="flex w-full flex-wrap items-center justify-start gap-1">
      {imageAttachments.map((img) => (
        <ImageAttachment
          key={img.id}
          src={img.src}
          filename={img.filename}
          alt="User attachment"
          loading={img.uploadStatus === "uploading"}
          previewEnabled={imagePreviewEnabled}
          onRemove={() => onRemoveImage(img.id)}
        />
      ))}
      {priorConversation ? (
        <ComposerAttachmentPill
          Icon={Document}
          onRemove={onRemovePriorConversation}
          onRemoveAriaLabel={
            onRemovePriorConversation
              ? intl.formatMessage({
                  id: "composer.priorContext.removeAriaLabel",
                  defaultMessage: "Remove previous context",
                  description:
                    "Aria label for removing a prior context attachment pill",
                })
              : undefined
          }
        >
          <FormattedMessage
            id="composer.priorContext.label"
            defaultMessage="Previous context"
            description="Attachment pill label for including the prior conversation context"
          />
        </ComposerAttachmentPill>
      ) : null}
      {!!commentAttachments.length && (
        <CommentAttachments
          numComments={commentAttachments.length}
          onRemove={onRemoveAllCommentAttachments}
        />
      )}
      {pullRequestChecks.length > 0 ? (
        <ComposerAttachmentPill
          Icon={WarningIcon}
          onRemove={onRemoveAllPullRequestChecks}
          onRemoveAriaLabel={intl.formatMessage({
            id: "pullRequestChecksAttachments.removeAriaLabel",
            defaultMessage: "Remove failing checks attachment",
            description:
              "Aria label for removing the failing pull request checks attachment",
          })}
        >
          <FormattedMessage
            id="pullRequestChecksAttachments.numChecks"
            defaultMessage="{count, plural, one {# failing check} other {# failing checks}}"
            description="Number of failing pull request checks attached to the message"
            values={{ count: pullRequestChecks.length }}
          />
        </ComposerAttachmentPill>
      ) : null}
      {reviewFindingCount > 0 ? (
        <ComposerAttachmentPill Icon={CommentIcon}>
          <FormattedMessage
            id="reviewFindingAttachments.count"
            defaultMessage="{count, plural, one {# finding} other {# findings}}"
            description="Number of review findings attached to the message"
            values={{ count: reviewFindingCount }}
          />
        </ComposerAttachmentPill>
      ) : null}
      {fileAttachments.map((file, idx) => (
        <FileAttachment
          key={idx}
          filename={stripLineInfoFromLabel(file.label, formatLineInfo(file))}
          lineInfo={formatLineInfo(file)}
          onClick={() => onOpenFile(file)}
          onRemove={() => onRemoveFileAttachment(idx)}
        />
      ))}
      {addedFiles.map((f, idx) => (
        <FileAttachment
          key={`added-${idx}`}
          filename={stripLineInfoFromLabel(f.label, formatLineInfo(f))}
          lineInfo={formatLineInfo(f)}
          onClick={() => onOpenFile(f)}
          onRemove={() => onRemoveFile(idx)}
        />
      ))}
    </div>
  );
}

async function getRefAndDiffForCloudStartingState(
  mcpManager: AppServerManager,
  taskType: ExtractDiscriminated<CloudTaskSubmissionType, "type", "new-task">,
  gitRoot: string,
): Promise<{ ref: string; startingDiff: string | null }> {
  switch (taskType.startingState.type) {
    case "branch": {
      return {
        ref: taskType.startingState.branchName,
        startingDiff: null,
      };
    }
    case "fork-local-task":
    case "fork-cloud-task":
    case "working-tree": {
      const diff = await mcpManager.getGitDiffToRemote(gitRoot);
      return {
        ref: diff.sha,
        startingDiff: diff?.diff,
      };
    }
  }
}

const composerPlaceholderMessages = defineMessages({
  newTaskCloud: {
    id: "composer.placeholder.newTask.cloud",
    defaultMessage: "Ask Codex to do anything in the cloud",
    description: "Composer placeholder text for new Codex Cloud task",
  },
  newTaskLocal: {
    id: "composer.placeholder.newTask.locally.v2",
    defaultMessage:
      "Ask Codex anything, @ to add files, / for commands, $ for skills",
    description:
      "Placeholder text for Codex input composer, telling the user they can ask Codex to do anything",
  },
  cloudFollowUpLocal: {
    id: "composer.placeholder.cloudFollowUp.local",
    defaultMessage: "Create a new local task that references this cloud task",
    description:
      "Placeholder text in the Codex input composer when following up on a Codex Cloud task locally",
  },
  cloudFollowUpWorkingTree: {
    id: "composer.placeholder.cloudFollowUp.workingTree",
    defaultMessage:
      "Create a new cloud task that includes your current code and will reference this task",
    description:
      "Placeholder text in the Codex input composer when starting a new cloud Codex task that includes the users changes and will reference a previous cloud task",
  },
  cloudFollowUpDirect: {
    id: "composer.placeholder.cloudFollowUp.directFollowUp",
    defaultMessage: "Follow-up to this cloud task",
    description:
      "Placeholder text in the Codex input composer when following up to a cloud Codex task",
  },
  localFollowUpCloud: {
    id: "composer.placeholder.localFollowUp.cloud",
    defaultMessage: "Follow-up in a new cloud task",
    description:
      "Placeholder text in the Codex input composer when in cloud mode",
  },
  localFollowUpLocal: {
    id: "composer.placeholder.localFollowUp.locally",
    defaultMessage: "Ask for follow-up changes",
    description:
      "Placeholder text in the Codex input composer when in local mode",
  },
  localFollowUpLocalWithAgents: {
    id: "composer.placeholder.localFollowUp.locallyWithAgents",
    defaultMessage: "Ask for follow up changes or @ to tag an agent",
    description:
      "Placeholder text in the Codex input composer when in local mode with visible background agents",
  },
});

function composerPlaceholderText(
  followUpType: FollowUpProps["type"] | undefined,
  composerMode: ComposerMode,
  cloudStartingState: CloudFollowUpStartingState | undefined,
  isBackgroundSubagentsPanelVisible: boolean,
): MessageDescriptor {
  switch (followUpType) {
    case undefined: {
      return composerMode === "cloud"
        ? composerPlaceholderMessages.newTaskCloud
        : composerPlaceholderMessages.newTaskLocal;
    }
    case "cloud": {
      if (composerMode === "local") {
        return composerPlaceholderMessages.cloudFollowUpLocal;
      }
      return cloudStartingState === "working-tree"
        ? composerPlaceholderMessages.cloudFollowUpWorkingTree
        : composerPlaceholderMessages.cloudFollowUpDirect;
    }
    case "local": {
      return composerMode === "cloud"
        ? composerPlaceholderMessages.localFollowUpCloud
        : isBackgroundSubagentsPanelVisible
          ? composerPlaceholderMessages.localFollowUpLocalWithAgents
          : composerPlaceholderMessages.localFollowUpLocal;
    }
  }
}

/**
 * @param newTaskCloudStartingState  Should only be used when followUp is null.
 * @param followUpCloudStartingState Should only be used when followUp is not null.
 */
function getCloudTaskType(
  followUp: FollowUpProps | undefined,
  newTaskCloudStartingState: AsyncThreadStartingState,
  followUpCloudStartingState: CloudFollowUpStartingState,
): CloudTaskSubmissionType {
  switch (followUp?.type) {
    case undefined: {
      // New cloud task.
      return {
        type: "new-task",
        startingState: newTaskCloudStartingState,
      };
    }
    case "cloud": {
      switch (followUpCloudStartingState) {
        case "direct-follow-up": {
          // Follow-up to an existing cloud task. Do not include local changes so follow-up directly.
          return {
            type: "follow-up",
            taskId: followUp.taskDetails.task.id,
            turnId: followUp.selectedTurnId,
          };
        }
        case "working-tree": {
          // The user wants to follow-up to an existing cloud task. To do that, we create a new one and include a PriorConversation
          // input item to reference the existing task.
          const forkTaskDetails =
            followUp.selectedTurn &&
            followUp.selectedTurn.id !==
              followUp.taskDetails.current_assistant_turn?.id
              ? {
                  ...followUp.taskDetails,
                  current_assistant_turn: followUp.selectedTurn,
                  current_diff_task_turn: followUp.selectedTurn,
                }
              : followUp.taskDetails;
          return {
            type: "new-task",
            startingState: {
              type: "fork-cloud-task",
              taskDetails: forkTaskDetails,
            },
          };
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "local": {
      return {
        type: "new-task",
        startingState: {
          type: "fork-local-task",
          conversationId: followUp.localConversationId,
        },
      };
    }
  }
}

const WORKTREE_INIT_ERROR_CODE = "worktree_init_failed";
const CLOSED_AGENT_SEND_ERROR_CODE = "closed_agent_send_failed";

function isWorktreeInitFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidateCode = (error as { data?: { code?: unknown } }).data?.code;
  return candidateCode === WORKTREE_INIT_ERROR_CODE;
}

function buildWorktreeInitFailureToast(intl: IntlShape): string {
  return intl.formatMessage({
    id: "composer.worktreeSetupFailed",
    defaultMessage:
      "Worktree setup failed. Check .codex/environments for a setup script.",
    description: "Toast text shown when the worktree setup script fails",
  });
}

function isClosedAgentSendError(error: unknown): boolean {
  return serializeUnknownError(error).includes(CLOSED_AGENT_SEND_ERROR_CODE);
}

function serializeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isClosedSubagentConversation(
  manager: AppServerManager,
  conversationId: ConversationId,
): boolean {
  const conversation = manager.getConversation(conversationId);
  const parentThreadId = getSubagentSourceMetadata(
    conversation?.source,
  )?.parentThreadId;
  if (parentThreadId == null) {
    return false;
  }

  const parentConversation = manager.getConversation(
    createConversationId(parentThreadId),
  );
  if (parentConversation == null) {
    return false;
  }

  let isClosed = false;
  for (const turn of parentConversation.turns) {
    for (const item of turn.items ?? []) {
      if (item.type !== "collabAgentToolCall") {
        continue;
      }
      if (!item.receiverThreadIds.includes(conversationId)) {
        continue;
      }
      if (item.tool === "wait") {
        continue;
      }
      isClosed = item.tool === "closeAgent";
    }
  }

  return isClosed;
}

/**
 * Fetch IDE context but return null if it fails to avoid breaking submit when it happens.
 */
async function fetchIdeContextSafe(
  isElectron: boolean,
  isAutoContextOn: boolean,
  workspaceRoot: string,
): Promise<IdeContext | null> {
  if (!isAutoContextOn) {
    return null;
  }
  try {
    const result = await fetchFromVSCode("ide-context", {
      params: isElectron ? { workspaceRoot } : undefined,
    });
    return result.ideContext;
  } catch (error) {
    logger.error(`[Composer] failed to fetch ide-context`, {
      safe: {},
      sensitive: {
        error: error,
      },
    });
    return null;
  }
}
