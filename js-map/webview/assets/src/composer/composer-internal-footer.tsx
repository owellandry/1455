import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import clsx from "clsx";
import { useScope } from "maitai";
import {
  electronMenuAccelerators,
  type ConversationId,
  type FileDescriptor,
} from "protocol";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForHost } from "@/app-server/app-server-manager-hooks";
import { useAuthForHost } from "@/auth/use-auth";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import { useEnterBehavior } from "@/hooks/use-enter-behavior";
import { useIsThreadRealtimeEnabled } from "@/hooks/use-is-thread-realtime-enabled";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import { useWindowType } from "@/hooks/use-window-type";
import ArrowUp from "@/icons/arrow-up.svg";
import ClickIcon from "@/icons/click.svg";
import PhoneIcon from "@/icons/phone.svg";
import PlanIcon from "@/icons/plan.svg";
import SendToCloudIcon from "@/icons/send-to-cloud.svg";
import StopIcon from "@/icons/stop.svg";
import XCircleFilledIcon from "@/icons/x-circle-filled.svg";
import {
  formatAccelerator,
  getMenuShortcutLabel,
} from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { AppScope } from "@/scopes/app-scope";
import { useGate } from "@/statsig/statsig";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useResizeObserver } from "@/utils/use-resize-observer";

import { KeybindingLabel } from "../components/keybinding-label";
import { AddContextButton } from "./add-context-button";
import { AttemptsSelector } from "./attempts-selector";
import type { ComposerMode } from "./composer";
import {
  DictationButton,
  DictationFooter,
  RealtimeFooter,
} from "./composer-dictation";
import type { ComposerImageDataUrl } from "./composer-image-data-url";
import {
  handleGlobalPlanModeShortcut,
  PLAN_MODE_TOGGLE_ACCELERATOR,
} from "./composer-shortcuts";
import { DynamicModelDropdown } from "./dynamic-model-dropdown";
import { DynamicReasoningEffortDropdown } from "./dynamic-reasoning-effort-dropdown";
import {
  useComposerController,
  useComposerControllerState,
} from "./prosemirror/use-composer-controller";
import { shouldShowIdeContextIndicator } from "./should-show-ide-context-indicator";
import type { SubmitBlockReason } from "./submit-block-reason";
import { useCollaborationMode } from "./use-collaboration-mode";
import { useDictation } from "./use-dictation";
import { useInlineItemCollapse } from "./use-inline-item-collapse";
import { useThreadRealtime } from "./use-thread-realtime";

export function ComposerInternalFooter({
  onAddImages,
  onAddImageDataUrls,
  getAttachmentGen,
  setFileAttachments,
  fileAttachments,
  composerMode,
  showHotkeyWindowHomeFooterControls,
  hotkeyWindowHomeOverflowMenu,
  conversationId,
  isAutoContextOn,
  setIsAutoContextOn,
  ideContextStatus,
  submitButtonMode,
  isResponseInProgress,
  isQueueingEnabled,
  isSubmitting,
  onStop,
  submitBlockReason,
  disabledReason,
  emptySubmitTooltipNonce,
  handleSubmit,
}: {
  onAddImages: (files: Array<File>) => void;
  onAddImageDataUrls: (images: Array<ComposerImageDataUrl>) => void;
  getAttachmentGen: () => number;
  fileAttachments: Array<FileDescriptor>;
  setFileAttachments: (
    attachments:
      | Array<FileDescriptor>
      | ((prev: Array<FileDescriptor>) => Array<FileDescriptor>),
  ) => void;
  composerMode: ComposerMode;
  showHotkeyWindowHomeFooterControls: boolean;
  hotkeyWindowHomeOverflowMenu?: ReactNode;
  conversationId: ConversationId | null;
  isAutoContextOn: boolean;
  setIsAutoContextOn: (on: boolean) => void;
  ideContextStatus: "no-connection" | "connected" | "loading";
  submitButtonMode: "submit" | "stop";
  isResponseInProgress: boolean;
  isQueueingEnabled: boolean;
  isSubmitting: boolean;
  onStop: () => void;
  submitBlockReason: SubmitBlockReason | null;
  disabledReason: string | null;
  emptySubmitTooltipNonce: number;
  handleSubmit: () => Promise<void>;
}): React.ReactElement {
  const executionTarget = useWebviewExecutionTarget(conversationId);
  const auth = useAuthForHost(executionTarget.hostId);
  const composerController = useComposerController();
  const isMultilineInput = useComposerControllerState(
    composerController,
    (controller) => controller.view.state.doc.childCount > 1,
  );
  const { enterBehavior } = useEnterBehavior();
  const scope = useScope(AppScope);
  const intl = useIntl();
  const handleSubmitRef = useRef(handleSubmit);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const isDictationGateEnabled = useGate(
    __statsigName("codex-app-voice-input"),
  );
  const isThreadRealtimeEnabled = useIsThreadRealtimeEnabled();
  const windowType = useWindowType();
  const threadRealtime = useThreadRealtime({
    conversationId,
    enabled: isThreadRealtimeEnabled && windowType === "electron",
  });
  const isDictationSupported =
    isDictationGateEnabled &&
    windowType === "electron" &&
    auth?.authMethod === "chatgpt" &&
    !!navigator?.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";
  const {
    isDictating,
    isTranscribing,
    recordingDurationMs,
    waveformCanvasRef,
    startDictation,
    stopDictation,
  } = useDictation({
    enabled: isDictationSupported,
    onTranscriptInsert: (text) => {
      composerController.appendText(text);
    },
    onTranscriptSend: async (text) => {
      composerController.appendText(text);
      // Defer submission to the next tick so hasMessageContent/disabledReason
      // can recompute based on the newly appended transcript.
      window.setTimeout(() => {
        void handleSubmitRef.current().catch((error) => {
          logger.error(`[Composer] dictation send failed`, {
            safe: {},
            sensitive: {
              error: error,
            },
          });
        });
      }, 0);
    },
    onStartError: (error) => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.dictation.startError",
          defaultMessage: "Unable to start dictation",
          description: "Toast text shown when dictation could not be started",
        }),
      );
      logger.error(`[Composer] unable to start dictation`, {
        safe: {},
        sensitive: {
          error: error,
        },
      });
    },
    onTranscribeError: (error) => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.dictation.transcribeError",
          defaultMessage: "Unable to transcribe audio",
          description:
            "Toast text shown when dictation audio transcription fails",
        }),
      );
      logger.error(`[Composer] dictation failed`, {
        safe: {},
        sensitive: { error: error },
      });
    },
    onUnsupported: () => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.dictation.unsupported",
          defaultMessage: "Dictation is not available on this device",
          description:
            "Toast text shown when dictation is not supported on the current device",
        }),
      );
    },
  });

  const dictationShortcutLabel = getMenuShortcutLabel("dictation");
  let forcedBlockedReasonOpenNonce: number | null | undefined = undefined;
  if (submitBlockReason === "empty-message") {
    if (emptySubmitTooltipNonce > 0) {
      forcedBlockedReasonOpenNonce = emptySubmitTooltipNonce;
    } else {
      forcedBlockedReasonOpenNonce = null;
    }
  }
  const primaryFollowUpShortcutLabel =
    enterBehavior === "cmdIfMultiline" && isMultilineInput
      ? formatAccelerator("CmdOrCtrl+Enter")
      : formatAccelerator("Enter");
  const alternateFollowUpShortcutLabel = formatAccelerator(
    enterBehavior === "cmdIfMultiline"
      ? "CmdOrCtrl+Shift+Enter"
      : "CmdOrCtrl+Enter",
  );
  const queueTooltipMessage = {
    id: "composer.submitButtonTooltip.queue",
    defaultMessage: "Queue",
    description:
      "Tooltip for submit while a response is in progress and queue mode is enabled",
  } as const;
  const steerTooltipMessage = {
    id: "composer.submitButtonTooltip.steer",
    defaultMessage: "Steer",
    description:
      "Tooltip for submit while a response is in progress and steer mode is enabled",
  } as const;
  const primaryFollowUpActionLabel = intl.formatMessage(
    isQueueingEnabled ? queueTooltipMessage : steerTooltipMessage,
  );
  const alternateFollowUpActionLabel = intl.formatMessage(
    isQueueingEnabled ? steerTooltipMessage : queueTooltipMessage,
  );
  const submitButtonTooltip =
    submitButtonMode === "stop" ? (
      intl.formatMessage({
        id: "composer.submitButtonTooltip.stop",
        defaultMessage: "Stop",
        description: "Tooltip for the stop button when a response is streaming",
      })
    ) : isResponseInProgress ? (
      <div className="grid grid-cols-[auto_auto] items-center gap-x-2 gap-y-1">
        <span className="text-token-foreground">
          {primaryFollowUpActionLabel}
        </span>
        <span className="justify-self-end">
          <KeybindingLabel keysLabel={primaryFollowUpShortcutLabel} />
        </span>
        <span className="text-token-foreground">
          {alternateFollowUpActionLabel}
        </span>
        <span className="justify-self-end">
          <KeybindingLabel keysLabel={alternateFollowUpShortcutLabel} />
        </span>
      </div>
    ) : (
      intl.formatMessage({
        id: "composer.submitButtonTooltip.send",
        defaultMessage: "Send",
        description:
          "Tooltip for submit when no response is currently in progress",
      })
    );

  useHotkey({
    accelerator: electronMenuAccelerators.dictation,
    enabled: isDictationSupported && threadRealtime.phase === "inactive",
    ignoreWithin: "[data-codex-terminal]",
    onKeyDown: (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isDictating || isTranscribing) {
        return;
      }
      void startDictation();
    },
    onKeyUp: (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopDictation("insert");
    },
  });

  return (
    <>
      {threadRealtime.isShowingFooter ? (
        <RealtimeFooter
          recordingDurationMs={threadRealtime.recordingDurationMs}
          waveformCanvasRef={threadRealtime.waveformCanvasRef}
          noBottomMargin={showHotkeyWindowHomeFooterControls}
          stopRealtime={() => {
            void threadRealtime.stopRealtime();
          }}
        />
      ) : isDictating ? (
        <DictationFooter
          isTranscribing={isTranscribing}
          recordingDurationMs={recordingDurationMs}
          waveformCanvasRef={waveformCanvasRef}
          noBottomMargin={showHotkeyWindowHomeFooterControls}
          stopDictation={stopDictation}
        />
      ) : (
        <div
          className={clsx(
            "composer-footer grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[5px]",
            showHotkeyWindowHomeFooterControls ? "mb-0" : "mb-2",
            showHotkeyWindowHomeFooterControls ? "px-0" : "px-2",
          )}
        >
          <ComposerModeSelection
            onAddImages={onAddImages}
            onAddImageDataUrls={onAddImageDataUrls}
            getAttachmentGen={getAttachmentGen}
            fileAttachments={fileAttachments}
            setFileAttachments={setFileAttachments}
            composerMode={composerMode}
            showHotkeyWindowHomeFooterControls={
              showHotkeyWindowHomeFooterControls
            }
            hotkeyWindowHomeOverflowMenu={hotkeyWindowHomeOverflowMenu}
            conversationId={conversationId}
            executionTargetHostId={executionTarget.hostId}
            executionTargetCwd={executionTarget.cwd}
            isAutoContextOn={isAutoContextOn}
            setIsAutoContextOn={setIsAutoContextOn}
            ideContextStatus={ideContextStatus}
          />
          <WithWindow electron extension>
            <div className="flex items-center">
              {composerMode === "cloud" ? <AttemptsSelector /> : null}
            </div>
          </WithWindow>
          <div className="flex items-center gap-2">
            {threadRealtime.isAvailable ? (
              <Tooltip
                tooltipContent={getThreadRealtimeTooltipContent(
                  intl,
                  threadRealtime.phase,
                )}
                sideOffset={4}
              >
                <Button
                  size="composer"
                  color={
                    threadRealtime.phase === "inactive"
                      ? "ghost"
                      : "ghostActive"
                  }
                  uniform
                  loading={
                    threadRealtime.phase === "starting" ||
                    threadRealtime.phase === "stopping"
                  }
                  aria-label={intl.formatMessage(
                    threadRealtime.phase === "inactive"
                      ? {
                          id: "composer.realtime.start.aria",
                          defaultMessage: "Start realtime voice",
                          description:
                            "Aria label for the button that starts realtime voice mode in the composer",
                        }
                      : {
                          id: "composer.realtime.stop.aria",
                          defaultMessage: "Stop realtime voice",
                          description:
                            "Aria label for the button that stops realtime voice mode in the composer",
                        },
                  )}
                  onClick={() => {
                    if (threadRealtime.phase === "inactive") {
                      void threadRealtime.startRealtime();
                      return;
                    }
                    void threadRealtime.stopRealtime();
                  }}
                >
                  {threadRealtime.phase === "starting" ||
                  threadRealtime.phase ===
                    "stopping" ? null : threadRealtime.phase === "inactive" ? (
                    <PhoneIcon className="icon-xs" />
                  ) : (
                    <StopIcon className="icon-xs" />
                  )}
                </Button>
              </Tooltip>
            ) : null}
            <DictationButton
              isDictationSupported={isDictationSupported}
              disabled={threadRealtime.phase !== "inactive"}
              isTranscribing={isTranscribing}
              shortcutLabel={dictationShortcutLabel}
              startDictation={startDictation}
            />
            {submitButtonMode === "stop" ? (
              <SubmitButton
                Icon={StopIcon}
                tooltipContent={submitButtonTooltip}
                onClick={onStop}
              />
            ) : (
              <SubmitButton
                isSubmitting={isSubmitting}
                blockedReason={disabledReason}
                blockedReasonOpenNonce={forcedBlockedReasonOpenNonce}
                Icon={composerMode === "cloud" ? SendToCloudIcon : ArrowUp}
                tooltipContent={submitButtonTooltip}
                onClick={handleSubmit}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function ComposerModeSelection({
  onAddImages,
  onAddImageDataUrls,
  getAttachmentGen,
  setFileAttachments,
  fileAttachments,
  composerMode,
  showHotkeyWindowHomeFooterControls,
  hotkeyWindowHomeOverflowMenu,
  conversationId,
  executionTargetHostId,
  executionTargetCwd,
  isAutoContextOn,
  setIsAutoContextOn,
  ideContextStatus,
}: {
  onAddImages: (files: Array<File>) => void;
  onAddImageDataUrls: (images: Array<ComposerImageDataUrl>) => void;
  getAttachmentGen: () => number;
  fileAttachments: Array<FileDescriptor>;
  setFileAttachments: (
    attachments:
      | Array<FileDescriptor>
      | ((prev: Array<FileDescriptor>) => Array<FileDescriptor>),
  ) => void;
  composerMode: ComposerMode;
  showHotkeyWindowHomeFooterControls: boolean;
  hotkeyWindowHomeOverflowMenu?: ReactNode;
  conversationId: ConversationId | null;
  executionTargetHostId: string;
  executionTargetCwd: string | null;
  isAutoContextOn: boolean;
  setIsAutoContextOn: (on: boolean) => void;
  ideContextStatus: "no-connection" | "connected" | "loading";
}): React.ReactElement {
  const [controlsWidth, setControlsWidth] = useState(0);
  const controlsRef = useResizeObserver<HTMLDivElement>((entry) => {
    setControlsWidth(entry.contentRect.width);
  });

  return (
    <div className="flex w-full min-w-0 flex-nowrap items-center justify-start gap-[5px]">
      <AddContextButton
        onAddImages={onAddImages}
        onAddImageDataUrls={onAddImageDataUrls}
        getAttachmentGen={getAttachmentGen}
        fileAttachments={fileAttachments}
        setFileAttachments={setFileAttachments}
        conversationId={conversationId}
        isAutoContextOn={isAutoContextOn}
        setIsAutoContextOn={setIsAutoContextOn}
        ideContextStatus={ideContextStatus}
      />
      <WithWindow electron extension>
        <div className="min-w-0 flex-1" ref={controlsRef}>
          <ComposerModeControls
            composerMode={composerMode}
            showHotkeyWindowHomeFooterControls={
              showHotkeyWindowHomeFooterControls
            }
            hotkeyWindowHomeOverflowMenu={hotkeyWindowHomeOverflowMenu}
            conversationId={conversationId}
            executionTargetHostId={executionTargetHostId}
            executionTargetCwd={executionTargetCwd}
            availableWidth={controlsWidth}
            isAutoContextOn={isAutoContextOn}
            setIsAutoContextOn={setIsAutoContextOn}
            ideContextStatus={ideContextStatus}
          />
        </div>
      </WithWindow>
    </div>
  );
}

function ComposerModeControls({
  composerMode,
  showHotkeyWindowHomeFooterControls,
  hotkeyWindowHomeOverflowMenu,
  conversationId,
  executionTargetHostId,
  executionTargetCwd,
  availableWidth,
  isAutoContextOn,
  setIsAutoContextOn,
  ideContextStatus,
}: {
  composerMode: ComposerMode;
  showHotkeyWindowHomeFooterControls: boolean;
  hotkeyWindowHomeOverflowMenu?: ReactNode;
  conversationId: ConversationId | null;
  executionTargetHostId: string;
  executionTargetCwd: string | null;
  availableWidth: number;
  isAutoContextOn: boolean;
  setIsAutoContextOn: (on: boolean) => void;
  ideContextStatus: "no-connection" | "connected" | "loading";
}): React.ReactElement | null {
  const auth = useAuthForHost(executionTargetHostId);
  const { data: configuredModel } = useConfiguredModel(
    executionTargetHostId,
    executionTargetCwd,
  );
  const requiresAuth = auth?.requiresAuth ?? false;
  const forcedModel = !requiresAuth ? (configuredModel ?? null) : null;
  const showModelDropdown = requiresAuth || forcedModel != null;
  const {
    activeMode,
    modes: collaborationModes,
    setSelectedMode,
    isLoading: isCollaborationModeLoading,
  } = useCollaborationMode(conversationId);
  const isPlanMode = activeMode.mode === "plan";
  const hasPlanMode = collaborationModes.some((mode) => mode.mode === "plan");
  const hasDefaultMode = collaborationModes.some(
    (mode) => mode.mode === "default",
  );
  const isIdeContextConnected = ideContextStatus === "connected";
  const showIdeContextIndicator = shouldShowIdeContextIndicator(
    isAutoContextOn,
    isIdeContextConnected,
  );

  function handlePlanIndicatorClick(): void {
    if (!hasDefaultMode) {
      setSelectedMode(null);
      return;
    }
    setSelectedMode("default");
  }

  useHotkey({
    accelerator: PLAN_MODE_TOGGLE_ACCELERATOR,
    enabled: !isCollaborationModeLoading && hasPlanMode,
    ignoreWithin: "[data-codex-terminal]",
    onKeyDown: (event) => {
      handleGlobalPlanModeShortcut({
        event,
        hasPlanMode,
        hasDefaultMode,
        isPlanMode,
        setSelectedMode,
      });
    },
  });
  const inlineControlsRef = useRef<HTMLDivElement | null>(null);
  const modelDropdownRef = useRef<HTMLElement | null>(null);
  const reasoningDropdownRef = useRef<HTMLElement | null>(null);
  const ideContextButtonRef = useRef<HTMLElement | null>(null);
  const planModeButtonRef = useRef<HTMLElement | null>(null);
  const collapseStateById = useInlineItemCollapse({
    availableWidth,
    containerRef: inlineControlsRef,
    items: [
      {
        id: "plan-mode",
        ref: planModeButtonRef,
        enabled: isPlanMode,
        canHideLabel: true,
      },
      {
        id: "ide-context",
        ref: ideContextButtonRef,
        enabled: showIdeContextIndicator,
        canHideLabel: true,
      },
      {
        id: "reasoning",
        ref: reasoningDropdownRef,
        enabled: requiresAuth,
        canHideLabel: true,
      },
      {
        id: "model",
        ref: modelDropdownRef,
        enabled: showModelDropdown,
        canHideLabel: true,
      },
    ],
  });
  const hideModelDropdown = collapseStateById.model?.hideControl === true;
  const hideReasoningDropdown =
    collapseStateById.reasoning?.hideControl === true;
  const hideModelLabel = collapseStateById.model?.hideLabel === true;
  const hideReasoningLabel = collapseStateById.reasoning?.hideLabel === true;
  const hideIdeContextButton =
    collapseStateById["ide-context"]?.hideControl === true;
  const hidePlanModeButton =
    collapseStateById["plan-mode"]?.hideControl === true;
  const hideIdeContextLabel =
    collapseStateById["ide-context"]?.hideLabel === true;
  const hidePlanModeLabel = collapseStateById["plan-mode"]?.hideLabel === true;
  const showIdeContextButton = showIdeContextIndicator && !hideIdeContextButton;
  const showPlanModeButton = isPlanMode && !hidePlanModeButton;

  if (composerMode === "cloud") {
    return showHotkeyWindowHomeFooterControls ? (
      <div className="flex min-w-0 items-center gap-1" ref={inlineControlsRef}>
        {hotkeyWindowHomeOverflowMenu}
      </div>
    ) : null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1" ref={inlineControlsRef}>
      {showModelDropdown && (
        <>
          {!hideModelDropdown && (
            <span ref={modelDropdownRef}>
              <DynamicModelDropdown
                conversationId={conversationId}
                disabled={forcedModel != null}
                forcedModel={forcedModel}
                hideLabel={hideModelLabel}
              />
            </span>
          )}

          {requiresAuth && !hideReasoningDropdown && (
            <span ref={reasoningDropdownRef}>
              <DynamicReasoningEffortDropdown
                conversationId={conversationId}
                hideLabel={hideReasoningLabel}
              />
            </span>
          )}
        </>
      )}
      {showHotkeyWindowHomeFooterControls ? hotkeyWindowHomeOverflowMenu : null}
      {showIdeContextButton ? (
        <span className="flex items-center gap-1" ref={ideContextButtonRef}>
          <div className="h-4 w-px bg-token-border/70" />
          <Tooltip
            tooltipContent={
              <div className="flex flex-col items-center text-center leading-tight">
                <span>
                  <FormattedMessage
                    id="composer.ideContextIndicator.tooltipText"
                    defaultMessage="Include context from IDE such as{br}selection state and open files."
                    description="Primary tooltip text for the IDE context footer indicator"
                    values={{
                      br: <br />,
                    }}
                  />
                </span>
                <span>
                  <span className="inline-flex items-center gap-1">
                    <Badge className="px-1.5 py-0 text-[10px] leading-none">
                      <FormattedMessage
                        id="composer.ideContextIndicator.tooltipSlashCommand"
                        defaultMessage="/ide"
                        description="Slash command badge in the IDE context indicator tooltip"
                      />
                    </Badge>
                    <FormattedMessage
                      id="composer.ideContextIndicator.tooltipToggle"
                      defaultMessage="to toggle"
                      description="Secondary tooltip text showing the slash command action for IDE context"
                    />
                  </span>
                </span>
              </div>
            }
            side="top"
            align="center"
            sideOffset={4}
          >
            <Button
              className="group flex items-center gap-1 text-token-text-link-foreground enabled:hover:!bg-token-text-link-foreground/10 enabled:hover:bg-token-text-link-foreground/10"
              size="composer"
              color="ghost"
              onClick={() => {
                setIsAutoContextOn(false);
              }}
            >
              <ClickIcon
                aria-hidden
                className="icon-xs shrink-0 group-hover:hidden"
              />
              <XCircleFilledIcon
                aria-hidden
                className="icon-xs hidden shrink-0 group-hover:block"
              />
              {!hideIdeContextLabel ? (
                <span className="whitespace-nowrap">
                  <FormattedMessage
                    id="composer.ideContextIndicator"
                    defaultMessage="IDE context"
                    description="Include IDE context indicator shown next to the reasoning dropdown"
                  />
                </span>
              ) : null}
            </Button>
          </Tooltip>
        </span>
      ) : null}
      {showPlanModeButton ? (
        <span className="flex items-center gap-1" ref={planModeButtonRef}>
          {!showIdeContextButton ? (
            <div className="h-4 w-px bg-token-border/70" />
          ) : null}
          <Tooltip
            tooltipContent={
              <div className="flex flex-col items-center text-center leading-tight">
                <span>
                  <FormattedMessage
                    id="composer.planModeIndicator.tooltipText"
                    defaultMessage="Create a plan"
                    description="Primary tooltip text for the plan mode footer indicator"
                  />
                </span>
                <span>
                  <span className="inline-flex items-center gap-1">
                    <Badge className="px-1.5 py-0 text-[10px] leading-none">
                      <FormattedMessage
                        id="composer.planModeIndicator.tooltipShortcut"
                        defaultMessage="{shortcut}"
                        description="Keyboard shortcut badge in the plan mode indicator tooltip"
                        values={{
                          shortcut: "Shift + Tab",
                        }}
                      />
                    </Badge>
                    <FormattedMessage
                      id="composer.planModeIndicator.tooltipToggle"
                      defaultMessage="to toggle"
                      description="Secondary tooltip text describing the plan mode shortcut action"
                    />
                  </span>
                </span>
              </div>
            }
            side="top"
            align="center"
            sideOffset={4}
          >
            <Button
              className="group flex items-center gap-1 text-token-text-link-foreground enabled:hover:!bg-token-text-link-foreground/10 enabled:hover:bg-token-text-link-foreground/10"
              size="composer"
              color="ghost"
              onClick={handlePlanIndicatorClick}
            >
              <PlanIcon
                aria-hidden
                className="icon-xs shrink-0 group-hover:hidden"
              />
              <XCircleFilledIcon
                aria-hidden
                className="icon-xs hidden shrink-0 group-hover:block"
              />
              {!hidePlanModeLabel && (
                <span className="whitespace-nowrap">
                  <FormattedMessage
                    id="composer.planModeIndicator"
                    defaultMessage="Plan"
                    description="Plan mode indicator shown next to the reasoning dropdown"
                  />
                </span>
              )}
            </Button>
          </Tooltip>
        </span>
      ) : null}
    </div>
  );
}

function useConfiguredModel(
  hostId: string,
  cwd: string | null,
): UseQueryResult<string | null, Error> {
  const manager = useAppServerManagerForHost(hostId);
  return useQuery({
    queryKey: ["composer", "configured-model", hostId, cwd],
    enabled: manager != null,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    queryFn: async (): Promise<string | null> => {
      if (manager == null) {
        return null;
      }
      const config = await manager.getUserSavedConfiguration(cwd ?? undefined);
      const model = config.model?.trim();
      return model && model.length > 0 ? model : null;
    },
  });
}

function SubmitButton({
  isSubmitting,
  Icon,
  blockedReason,
  blockedReasonOpenNonce,
  tooltipContent,
  onClick,
}: {
  isSubmitting?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  blockedReason?: string | null;
  blockedReasonOpenNonce?: number | null;
  tooltipContent?: React.ReactNode;
  onClick: () => void;
}): React.ReactElement {
  const iconClassName = "icon-sm text-token-dropdown-background";
  const isClickToShowBlockedReason = blockedReasonOpenNonce !== undefined;
  const shouldForceOpenBlockedReason =
    isClickToShowBlockedReason &&
    blockedReasonOpenNonce != null &&
    blockedReason != null;
  const shouldShowBlockedReasonTooltip =
    !isClickToShowBlockedReason && blockedReason != null;
  const blockedReasonTooltipContent =
    blockedReason != null ? blockedReason : null;
  const isBlockedReasonTooltipResolved =
    shouldForceOpenBlockedReason || shouldShowBlockedReasonTooltip;
  const resolvedTooltipContent = shouldForceOpenBlockedReason
    ? blockedReasonTooltipContent
    : shouldShowBlockedReasonTooltip
      ? blockedReasonTooltipContent
      : tooltipContent;
  const tooltipKey = shouldForceOpenBlockedReason
    ? `forced-${blockedReasonOpenNonce}`
    : "submit-button-tooltip";

  return (
    <Tooltip
      key={tooltipKey}
      defaultOpen={shouldForceOpenBlockedReason}
      disabled={!resolvedTooltipContent}
      tooltipContent={resolvedTooltipContent}
      tooltipClassName={isBlockedReasonTooltipResolved ? "max-w-36" : undefined}
      tooltipBodyClassName={
        isBlockedReasonTooltipResolved ? "text-center text-pretty" : undefined
      }
    >
      <button
        type="button"
        className={clsx(
          "focus-visible:outline-token-button-background cursor-interaction size-token-button-composer flex items-center justify-center rounded-full p-0.5 transition-opacity focus-visible:outline-2 bg-token-foreground",
          isSubmitting && "cursor-default opacity-50",
          !isSubmitting && !!blockedReason && "opacity-50",
        )}
        onClick={onClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Spinner className={iconClassName} />
        ) : (
          <Icon className={iconClassName} />
        )}
      </button>
    </Tooltip>
  );
}

function getThreadRealtimeTooltipContent(
  intl: ReturnType<typeof useIntl>,
  phase: "inactive" | "starting" | "active" | "stopping",
): string {
  switch (phase) {
    case "inactive":
      return intl.formatMessage({
        id: "composer.realtime.start.tooltip",
        defaultMessage: "Start realtime voice",
        description:
          "Tooltip for the button that starts realtime voice mode in the composer",
      });
    case "starting":
      return intl.formatMessage({
        id: "composer.realtime.starting.tooltip",
        defaultMessage: "Starting realtime voice…",
        description:
          "Tooltip for the button while realtime voice mode is starting in the composer",
      });
    case "active":
      return intl.formatMessage({
        id: "composer.realtime.stop.tooltip",
        defaultMessage: "Stop realtime voice",
        description:
          "Tooltip for the button that stops realtime voice mode in the composer",
      });
    case "stopping":
      return intl.formatMessage({
        id: "composer.realtime.stopping.tooltip",
        defaultMessage: "Stopping realtime voice…",
        description:
          "Tooltip for the button while realtime voice mode is stopping in the composer",
      });
  }
}
