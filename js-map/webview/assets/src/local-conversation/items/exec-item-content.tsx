import clsx from "clsx";
import { motion } from "framer-motion";
import type { GitCwd, ThreadDetailLevel } from "protocol";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import * as shlex from "shlex";

import { WithWindow } from "@/components/with-window";
import { useWindowType } from "@/hooks/use-window-type";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { useInterval } from "@/utils/use-interval";
import { useMutationFromVSCode } from "@/vscode-api";

import { formatElapsedDuration } from "../format-elapsed-duration";
import { normalizeConversationFilePath } from "../normalize-conversation-file-path";
import { getSkillPathInfo } from "../skill-path-utils";
import { useMeasuredElementHeight } from "../use-measured-element-height";
import { useRootFontSizePx } from "../use-root-font-size-px";
import { ExecShellContainer } from "./exec-shell-container";
import type { ExecLocalConversationItem } from "./local-conversation-item";
import {
  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_LEADING_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
} from "./non-assistant-tone";
import type { ParsedCmd } from "./parsed-cmd";
import { TimelineItem } from "./timeline-item";

type InlineCmdType = "read" | "search" | "list_files";
type NonInlineParsedCmd = Exclude<ParsedCmd, { type: InlineCmdType }>;
type ExecViewState = "expanded" | "preview" | "collapsed";
type SkillScriptSummary = {
  skillName: string;
  fileName: string;
};

const EXEC_PREVIEW_MAX_HEIGHT_REM = 8;
const EXEC_PREVIEW_HOLD_MS = 200;
const EXEC_IN_PROGRESS_EXPAND_DELAY_MS = 2000;
const SKILL_SCRIPT_EXECUTABLES = new Set(["python", "python3", "bash", "sh"]);

export function ExecItemContent({
  item,
  isTurnInProgress,
  threadDetailLevel,
  forceNormalTone,
}: {
  item: ExecLocalConversationItem;
  isTurnInProgress: boolean;
  threadDetailLevel: ThreadDetailLevel;
  forceNormalTone?: boolean;
}): React.ReactElement | null {
  const isExecutionInProgress = !item.parsedCmd.isFinished;
  const wasInterrupted = item.executionStatus === "interrupted";
  const isBackgroundTerminalRunning =
    isExecutionInProgress && !isTurnInProgress;
  const isBackgroundTerminalFinished =
    !isExecutionInProgress && !isTurnInProgress && item.processId != null;
  const summary = item.parsedCmd;

  if (summary.type === "read") {
    return <ReadExecItemContent summary={summary} cwd={item.cwd} />;
  }

  if (summary.type === "search") {
    return <SearchExecItemContent summary={summary} />;
  }

  if (summary.type === "list_files") {
    return <ListFilesExecItemContent summary={summary} />;
  }

  return (
    <NonReadExecItemContent
      item={item}
      summary={summary}
      isInProgress={isExecutionInProgress}
      isBackgroundTerminalRunning={isBackgroundTerminalRunning}
      isBackgroundTerminalFinished={isBackgroundTerminalFinished}
      wasInterrupted={wasInterrupted}
      threadDetailLevel={threadDetailLevel}
      forceNormalTone={forceNormalTone}
    />
  );
}

function InlineExecSummaryRow({
  label,
}: {
  label: React.ReactElement;
}): React.ReactElement {
  const textClassName = NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS;
  const descendantClassName =
    "[&_*]:text-token-foreground/30 group-hover:[&_*]:text-token-foreground";
  const compactPadding = "px-0";
  const rowPadding = "px-0 py-0";
  return (
    <TimelineItem padding="offset">
      <div className={clsx("cursor-interaction group", compactPadding)}>
        <div className="relative flex flex-col overflow-clip">
          <div className={rowPadding}>
            <span
              className={clsx(
                "block min-w-0 text-size-chat truncate",
                textClassName,
                descendantClassName,
              )}
            >
              {label}
            </span>
          </div>
        </div>
      </div>
    </TimelineItem>
  );
}

function NonReadExecItemContent({
  item,
  summary,
  isInProgress,
  isBackgroundTerminalRunning,
  isBackgroundTerminalFinished,
  wasInterrupted,
  threadDetailLevel,
  forceNormalTone,
}: {
  item: ExecLocalConversationItem;
  summary: NonInlineParsedCmd;
  isInProgress: boolean;
  isBackgroundTerminalRunning: boolean;
  isBackgroundTerminalFinished: boolean;
  wasInterrupted: boolean;
  threadDetailLevel: ThreadDetailLevel;
  forceNormalTone?: boolean;
}): React.ReactElement {
  const windowType = useWindowType();
  const expandByDefault =
    threadDetailLevel === "STEPS_EXECUTION" && windowType !== "extension";
  const autoToggle =
    summary.type === "format" ||
    summary.type === "test" ||
    summary.type === "lint" ||
    summary.type === "noop" ||
    summary.type === "unknown";
  const shouldShowShell = !isBackgroundTerminalRunning;
  const canToggle = shouldShowShell;
  const exitCode = item.output?.exitCode;
  const isSuccess = exitCode === 0;
  const [viewState, setViewState] = useState<ExecViewState>(() => {
    if (expandByDefault && !isInProgress) {
      return "expanded";
    }
    return "collapsed";
  });
  const [hasUserExpanded, setHasUserExpanded] = useState(false);
  const rootFontSizePx = useRootFontSizePx();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startTimeMs, setStartTimeMs] = useState<number | null>(() =>
    isInProgress ? Date.now() : null,
  );
  const [completedElapsedMs, setCompletedElapsedMs] = useState<number | null>(
    () => (isInProgress ? null : 0),
  );
  const wasInProgressRef = useRef(isInProgress);
  const autoCollapseTimeoutRef = useRef<number | null>(null);
  const inProgressExpandTimeoutRef = useRef<number | null>(null);
  const { elementHeightPx: contentHeightPx, elementRef: shellContentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const commandString = shlex.join(item.cmd);
  const setViewStateEvent = useEffectEvent(setViewState);
  const setHasUserExpandedEvent = useEffectEvent(setHasUserExpanded);
  const immediateTickHandledRef = useRef(false);
  const isExpanded = viewState === "expanded";
  const isBodyVisible = canToggle && viewState !== "collapsed";
  const clearPendingAutoCollapseTimeouts = (): void => {
    if (autoCollapseTimeoutRef.current == null) {
      return;
    }
    window.clearTimeout(autoCollapseTimeoutRef.current);
    autoCollapseTimeoutRef.current = null;
  };
  const clearPendingInProgressExpandTimeouts = (): void => {
    if (inProgressExpandTimeoutRef.current == null) {
      return;
    }
    window.clearTimeout(inProgressExpandTimeoutRef.current);
    inProgressExpandTimeoutRef.current = null;
  };
  const startAutoCollapse = useEffectEvent(() => {
    clearPendingAutoCollapseTimeouts();
    setViewStateEvent("preview");
    setHasUserExpandedEvent(false);
    autoCollapseTimeoutRef.current = window.setTimeout(() => {
      setViewStateEvent("collapsed");
      autoCollapseTimeoutRef.current = null;
    }, EXEC_PREVIEW_HOLD_MS);
  });

  useEffect(() => {
    if (wasInProgressRef.current && !isInProgress) {
      clearPendingInProgressExpandTimeouts();
      if (viewState === "expanded") {
        startAutoCollapse();
      }
    } else if (isInProgress) {
      clearPendingAutoCollapseTimeouts();
      clearPendingInProgressExpandTimeouts();
      inProgressExpandTimeoutRef.current = window.setTimeout(() => {
        setViewStateEvent("expanded");
        inProgressExpandTimeoutRef.current = null;
      }, EXEC_IN_PROGRESS_EXPAND_DELAY_MS);
    }
    wasInProgressRef.current = isInProgress;
  }, [isInProgress, viewState]);

  useEffect(() => {
    return (): void => {
      clearPendingAutoCollapseTimeouts();
      clearPendingInProgressExpandTimeouts();
    };
  }, []);

  useEffect(() => {
    if (expandByDefault && !isInProgress) {
      setViewStateEvent("expanded");
      return;
    }
    if (windowType === "extension" && !hasUserExpanded) {
      setViewStateEvent("collapsed");
    }
  }, [expandByDefault, hasUserExpanded, isInProgress, windowType]);

  const needsImmediateTick =
    (isInProgress && (startTimeMs == null || completedElapsedMs != null)) ||
    (!isInProgress && startTimeMs != null && completedElapsedMs == null);
  useEffect(() => {
    if (!needsImmediateTick) {
      immediateTickHandledRef.current = false;
    }
  }, [needsImmediateTick]);
  let intervalDelay: number | null = null;
  if (needsImmediateTick) {
    intervalDelay = 0;
  } else if (isInProgress && !isBackgroundTerminalRunning) {
    intervalDelay = 1000;
  }

  useInterval(() => {
    if (needsImmediateTick && immediateTickHandledRef.current) {
      return;
    }
    if (needsImmediateTick) {
      immediateTickHandledRef.current = true;
    }
    if (isInProgress) {
      if (startTimeMs == null) {
        setStartTimeMs(Date.now());
      }
      if (completedElapsedMs != null) {
        setCompletedElapsedMs(null);
      }
      setNowMs(Date.now());
      return;
    }
    if (!isInProgress && startTimeMs != null && completedElapsedMs == null) {
      const finishedAt = Date.now();
      setCompletedElapsedMs(finishedAt - startTimeMs);
      setNowMs(finishedAt);
      setStartTimeMs(null);
    }
  }, intervalDelay);

  const handleToggle = (): void => {
    clearPendingAutoCollapseTimeouts();
    if (isInProgress && viewState === "expanded") {
      setHasUserExpanded(true);
      return;
    }
    setViewState((prevViewState) => {
      const nextViewState: ExecViewState =
        prevViewState === "expanded" ? "collapsed" : "expanded";
      setHasUserExpanded(nextViewState === "expanded");
      return nextViewState;
    });
  };
  const displayElapsedMs =
    completedElapsedMs ??
    (startTimeMs != null && nowMs >= startTimeMs ? nowMs - startTimeMs : 0);
  const elapsedLabel =
    displayElapsedMs > 0 ? formatElapsedTime(displayElapsedMs) : null;
  const previewMaxHeightPx = EXEC_PREVIEW_MAX_HEIGHT_REM * rootFontSizePx;
  let targetHeight = 0;
  if (!canToggle) {
    targetHeight = 0;
  } else if (viewState === "expanded") {
    targetHeight = contentHeightPx;
  } else if (viewState === "preview") {
    targetHeight = Math.min(contentHeightPx, previewMaxHeightPx);
  }

  return (
    <TimelineItem padding="offset">
      <div className="px-0">
        <div className="relative flex flex-col overflow-clip">
          <div
            className={clsx(
              "group flex items-start gap-1 px-0 py-0",
              canToggle && "cursor-interaction",
            )}
            onClick={canToggle ? handleToggle : undefined}
          >
            <div className="flex min-w-0 items-center gap-1">
              <div
                className={clsx(
                  "min-w-0 flex-1 text-size-chat truncate",
                  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
                  isInProgress &&
                    !forceNormalTone &&
                    "loading-shimmer-pure-text",
                )}
              >
                <CmdSummaryText
                  summary={summary}
                  cmd={item.cmd}
                  elapsedLabel={elapsedLabel}
                  isInProgress={isInProgress}
                  isBackgroundTerminalRunning={isBackgroundTerminalRunning}
                  isFinishedBackgroundTerminal={isBackgroundTerminalFinished}
                  wasInterrupted={wasInterrupted}
                  isExpanded={isExpanded}
                />
              </div>
              {!isInProgress && canToggle && (
                <span
                  className={clsx(
                    "inline-chevron flex-shrink-0 text-token-input-placeholder-foreground transition-opacity duration-200 opacity-0 group-hover:opacity-100",
                    isExpanded && "opacity-100",
                  )}
                >
                  <ChevronRightIcon
                    className={clsx(
                      "icon-2xs text-current transition-transform duration-300",
                      isExpanded && "rotate-90",
                    )}
                  />
                </span>
              )}
            </div>
          </div>
          {shouldShowShell ? (
            <motion.div
              initial={false}
              animate={{
                height: targetHeight,
                opacity: isBodyVisible ? 1 : 0,
              }}
              transition={ACCORDION_TRANSITION}
              className={clsx(
                isBodyVisible ? "overflow-visible" : "overflow-hidden",
              )}
              data-thread-find-skip={!isBodyVisible ? true : undefined}
              style={{ pointerEvents: isBodyVisible ? "auto" : "none" }}
            >
              <div ref={shellContentRef} className="pt-2">
                <ExecShellContainer
                  command={commandString}
                  cwd={item.cwd ?? undefined}
                  output={item.output?.aggregatedOutput ?? ""}
                  isInProgress={isInProgress}
                  autoScrollToBottom={autoToggle && isInProgress}
                  footer={
                    <ExecShellContainer.Footer
                      isInProgress={isInProgress}
                      isSuccess={isSuccess}
                      exitCode={exitCode}
                      wasInterrupted={wasInterrupted}
                    />
                  }
                />
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </TimelineItem>
  );
}

function SearchExecItemContent({
  summary,
}: {
  summary: Extract<ParsedCmd, { type: "search" }>;
}): React.ReactElement {
  const { isFinished } = summary;
  let label: React.ReactElement;

  if (summary.query && summary.path) {
    label = selectMessage({
      isFinished,
      finished: (
        <FormattedMessage
          id="toolSummaryForCmd.searchedForInPath"
          defaultMessage="<verb>Searched</verb> for {query} in {path}"
          description="Shell command for searching for a query in a path"
          values={{
            query: summary.query,
            path: summary.path,
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
      inProgress: (
        <FormattedMessage
          id="toolSummaryForCmd.searchingForInPath"
          defaultMessage="<verb>Searching</verb> for {query} in {path}"
          description="Shell command for searching for a query in a path"
          values={{
            query: summary.query,
            path: summary.path,
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
    });
  } else if (summary.query) {
    label = selectMessage({
      isFinished,
      finished: (
        <FormattedMessage
          id="toolSummaryForCmd.searchedFor"
          defaultMessage="<verb>Searched</verb> for {query}"
          description="Shell command for searching for a query"
          values={{
            query: summary.query,
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
      inProgress: (
        <FormattedMessage
          id="toolSummaryForCmd.searchingFor"
          defaultMessage="<verb>Searching</verb> for {query}"
          description="Shell command for searching for a query"
          values={{
            query: summary.query,
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
    });
  } else {
    label = selectMessage({
      isFinished,
      finished: (
        <FormattedMessage
          id="toolSummaryForCmd.searchedForFiles"
          defaultMessage="<verb>Searched</verb> for files"
          description="Shell command for searching for files"
          values={{
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
      inProgress: (
        <FormattedMessage
          id="toolSummaryForCmd.searchingForFiles"
          defaultMessage="<verb>Searching</verb> for files"
          description="Shell command for searching for files"
          values={{
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
    });
  }

  return <InlineExecSummaryRow label={label} />;
}

function ListFilesExecItemContent({
  summary,
}: {
  summary: Extract<ParsedCmd, { type: "list_files" }>;
}): React.ReactElement {
  const { isFinished } = summary;
  let label: React.ReactElement;

  if (summary.path) {
    label = selectMessage({
      isFinished,
      finished: (
        <FormattedMessage
          id="toolSummaryForCmd.exploredFilesInPath"
          defaultMessage="<verb>Listed</verb> files in {path}"
          description="Shell command for listing files in a path"
          values={{
            path: summary.path,
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
      inProgress: (
        <FormattedMessage
          id="toolSummaryForCmd.exploringFilesInPath"
          defaultMessage="<verb>Listing</verb> files in {path}"
          description="Shell command for listing files in a path"
          values={{
            path: summary.path,
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
    });
  } else {
    label = selectMessage({
      isFinished,
      finished: (
        <FormattedMessage
          id="toolSummaryForCmd.exploredFiles"
          defaultMessage="<verb>Listed</verb> files"
          description="Shell command for listing files"
          values={{
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
      inProgress: (
        <FormattedMessage
          id="toolSummaryForCmd.exploringFiles"
          defaultMessage="<verb>Listing</verb> files"
          description="Shell command for listing files"
          values={{
            verb: (chunks: React.ReactNode): React.ReactElement =>
              renderVerb(chunks),
          }}
        />
      ),
    });
  }

  return <InlineExecSummaryRow label={label} />;
}

function ReadExecItemContent({
  summary,
  cwd,
}: {
  cwd: GitCwd | null;
  summary: Extract<ParsedCmd, { type: "read" }>;
}): React.ReactElement | null {
  const { isFinished, name: pathName, path: openPath } = summary;

  const windowType = useWindowType();
  const openFile = useMutationFromVSCode("open-file");
  const displayPath = normalizeConversationFilePath(pathName);

  if (!isFinished) {
    return null;
  }

  let pathNode;
  if (openPath) {
    const handleOpen = (event: React.MouseEvent<HTMLSpanElement>): void => {
      const canOpenInElectron = event.metaKey || event.ctrlKey;

      if (windowType === "electron" && !canOpenInElectron) {
        return;
      }
      openFile.mutate({ path: openPath.trim(), cwd: cwd ?? null });
    };

    const handleKeyDown = (
      event: React.KeyboardEvent<HTMLSpanElement>,
    ): void => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      openFile.mutate({ path: openPath.trim(), cwd: cwd ?? null });
    };

    pathNode = (
      <span
        role="link"
        tabIndex={0}
        className={clsx(
          NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
          "cursor-interaction hover:underline",
        )}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        title={displayPath}
      >
        {displayPath}
      </span>
    );
  } else {
    pathNode = <span>{displayPath}</span>;
  }

  const label = (
    <FormattedMessage
      id="toolSummaryForCmd.read"
      defaultMessage="<verb>Read</verb> {path}"
      description="Shell command for reading a file"
      values={{
        path: pathNode,
        verb: (chunks: React.ReactNode): React.ReactElement =>
          renderVerb(chunks),
      }}
    />
  );

  return <InlineExecSummaryRow label={label} />;
}

function CmdSummaryText({
  summary,
  cmd,
  elapsedLabel,
  isInProgress,
  isBackgroundTerminalRunning,
  isFinishedBackgroundTerminal,
  wasInterrupted,
  isExpanded,
}: {
  summary: NonInlineParsedCmd;
  cmd: Array<string>;
  elapsedLabel: string | null;
  isInProgress: boolean;
  isBackgroundTerminalRunning: boolean;
  isFinishedBackgroundTerminal: boolean;
  wasInterrupted: boolean;
  isExpanded: boolean;
}): React.ReactElement {
  const timerClassName = NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS;
  const timerNode = elapsedLabel ? (
    <span
      className={clsx(
        timerClassName,
        "whitespace-nowrap text-size-chat tabular-nums",
      )}
    >
      <FormattedMessage
        id="toolSummaryForCmd.runningTimer"
        defaultMessage=" for {elapsed}"
        description="Timer label shown while running a command"
        values={{ elapsed: elapsedLabel }}
      />
    </span>
  ) : null;
  const shouldSummarizeUnknownCommand =
    summary.type === "unknown" &&
    (isBackgroundTerminalRunning ||
      isFinishedBackgroundTerminal ||
      !isExpanded);
  const unknownSummary = shouldSummarizeUnknownCommand
    ? summarizeSkillScriptCommand(cmd)
    : null;
  switch (summary.type) {
    case "format":
    case "test":
    case "lint":
    case "noop":
    case "unknown": {
      if (isInProgress) {
        if (isBackgroundTerminalRunning) {
          if (unknownSummary != null) {
            return (
              <BackgroundTerminalStatusText>
                <FormattedMessage
                  id="toolSummaryForCmd.background.started.skillScript"
                  defaultMessage="Started background terminal running {fileName} from {skillName} skill"
                  description="Summary for a background terminal command that is running a script from a skill"
                  values={{
                    fileName: unknownSummary.fileName,
                    skillName: unknownSummary.skillName,
                  }}
                />
              </BackgroundTerminalStatusText>
            );
          }
          const trimmedCommand = summary.cmd.trim();
          const summarizedCommand: React.ReactNode =
            unknownSummary != null ? (
              <UnknownCommandSummaryLabel summary={unknownSummary} />
            ) : (
              trimmedCommand
            );
          if (unknownSummary != null || trimmedCommand.length > 0) {
            return (
              <BackgroundTerminalStatusText>
                <FormattedMessage
                  id="toolSummaryForCmd.startedBackgroundTerminalWithCommand"
                  defaultMessage="Started background terminal with {command}"
                  description="Summary for a command that is still running in a background terminal after the turn has completed, including the command"
                  values={{
                    command: summarizedCommand,
                  }}
                />
              </BackgroundTerminalStatusText>
            );
          }
          return (
            <BackgroundTerminalStatusText>
              <FormattedMessage
                id="toolSummaryForCmd.startedBackgroundTerminal"
                defaultMessage="Started background terminal"
                description="Summary for a command that is still running in a background terminal after the turn has completed"
              />
            </BackgroundTerminalStatusText>
          );
        }
        return (
          <FormattedMessage
            id="toolSummaryForCmd.runningGenericCommand"
            defaultMessage="<status>Running command</status>{timer}"
            description="Fallback summary for in-progress command when not classified"
            values={{
              status: (chunks: React.ReactNode): React.ReactElement => (
                <span className="loading-shimmer-pure-text">{chunks}</span>
              ),
              timer: timerNode,
            }}
          />
        );
      }
      if (isFinishedBackgroundTerminal) {
        const trimmedCommand = summary.cmd.trim();
        const summarizedCommand: React.ReactNode =
          unknownSummary != null ? (
            <UnknownCommandSummaryLabel summary={unknownSummary} />
          ) : (
            trimmedCommand
          );
        if (unknownSummary != null || trimmedCommand.length > 0) {
          if (wasInterrupted) {
            return (
              <span className="font-sans text-token-description-foreground group-hover:text-token-foreground">
                <FormattedMessage
                  id="toolSummaryForCmd.stoppedBackgroundTerminalWithCommand"
                  defaultMessage="Background terminal stopped with {command}"
                  description="Summary for a background terminal command that was interrupted"
                  values={{
                    command: summarizedCommand,
                  }}
                />
              </span>
            );
          }
        }
        if (unknownSummary != null) {
          return (
            <BackgroundTerminalStatusText>
              <FormattedMessage
                id="toolSummaryForCmd.background.finished.skillScript"
                defaultMessage="Background terminal finished running {fileName} from {skillName} skill"
                description="Summary for a background terminal command that finished running a script from a skill"
                values={{
                  fileName: unknownSummary.fileName,
                  skillName: unknownSummary.skillName,
                }}
              />
            </BackgroundTerminalStatusText>
          );
        }
        if (trimmedCommand.length > 0) {
          return (
            <BackgroundTerminalStatusText>
              <FormattedMessage
                id="toolSummaryForCmd.finishedBackgroundTerminalWithCommand"
                defaultMessage="Background terminal finished with {command}"
                description="Summary for a background terminal command that has finished"
                values={{
                  command: summarizedCommand,
                }}
              />
            </BackgroundTerminalStatusText>
          );
        }
        if (wasInterrupted) {
          return (
            <span className="font-sans text-token-description-foreground group-hover:text-token-foreground">
              <FormattedMessage
                id="toolSummaryForCmd.stoppedBackgroundTerminal"
                defaultMessage="Background terminal stopped"
                description="Summary for a background terminal command that was interrupted"
              />
            </span>
          );
        }
        return (
          <BackgroundTerminalStatusText>
            <FormattedMessage
              id="toolSummaryForCmd.finishedBackgroundTerminal"
              defaultMessage="Background terminal finished"
              description="Summary for a background terminal command that has finished"
            />
          </BackgroundTerminalStatusText>
        );
      }
      const trimmedCommand = summary.cmd.trim();
      const collapsedCommand: React.ReactNode =
        unknownSummary != null ? (
          <UnknownCommandSummaryLabel summary={unknownSummary} />
        ) : (
          trimmedCommand
        );
      if (
        !isExpanded &&
        (unknownSummary != null || trimmedCommand.length > 0)
      ) {
        if (wasInterrupted) {
          return (
            <FormattedMessage
              id="toolSummaryForCmd.stoppedSpecificCommand"
              defaultMessage="<status>Stopped</status> {command}{timer}"
              description="Summary for an interrupted command when collapsed, including the command text"
              values={{
                status: (chunks: React.ReactNode): React.ReactElement => (
                  <span
                    className={clsx(
                      "font-sans",
                      NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
                    )}
                  >
                    {chunks}
                  </span>
                ),
                command: collapsedCommand,
                timer: timerNode,
              }}
            />
          );
        }
        return (
          <FormattedMessage
            id="toolSummaryForCmd.ranSpecificCommand"
            defaultMessage="<status>Ran</status> {command}{timer}"
            description="Summary for a completed command when collapsed, including the command text"
            values={{
              status: (chunks: React.ReactNode): React.ReactElement => (
                <span
                  className={clsx(
                    "font-sans",
                    NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
                  )}
                >
                  {chunks}
                </span>
              ),
              command: collapsedCommand,
              timer: timerNode,
            }}
          />
        );
      }
      if (wasInterrupted) {
        return (
          <FormattedMessage
            id="toolSummaryForCmd.stoppedGenericCommand"
            defaultMessage="<status>Stopped command</status>{timer}"
            description="Fallback summary for an interrupted command when not classified"
            values={{
              status: (chunks: React.ReactNode): React.ReactElement => (
                <span
                  className={clsx(
                    "font-sans",
                    NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
                  )}
                >
                  {chunks}
                </span>
              ),
              timer: timerNode,
            }}
          />
        );
      }
      return (
        <FormattedMessage
          id="toolSummaryForCmd.ranGenericCommand"
          defaultMessage="<status>Ran command</status>{timer}"
          description="Fallback summary for a completed command when not classified"
          values={{
            status: (chunks: React.ReactNode): React.ReactElement => (
              <span
                className={clsx(
                  "font-sans",
                  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
                )}
              >
                {chunks}
              </span>
            ),
            timer: timerNode,
          }}
        />
      );
    }
  }
}

function BackgroundTerminalStatusText({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span className="font-sans text-token-description-foreground group-hover:text-token-foreground">
      {children}
    </span>
  );
}

function UnknownCommandSummaryLabel({
  summary,
}: {
  summary: SkillScriptSummary;
}): React.ReactElement {
  return (
    <FormattedMessage
      id="toolSummaryForCmd.skillScript"
      defaultMessage="script {fileName} from {skillName} skill"
      description="Semantic summary label for commands that run scripts from a skill"
      values={{
        fileName: summary.fileName,
        skillName: summary.skillName,
      }}
    />
  );
}

function selectMessage({
  isFinished,
  finished,
  inProgress,
}: {
  isFinished: boolean;
  finished: React.ReactElement;
  inProgress: React.ReactElement;
}): React.ReactElement {
  return isFinished ? finished : inProgress;
}

function renderVerb(chunks: React.ReactNode): React.ReactElement {
  const textClassName = NON_ASSISTANT_SUMMARY_LEADING_TEXT_CLASS;
  return (
    <>
      <WithWindow extension>
        <span className={`!${NON_ASSISTANT_SUMMARY_LEADING_TEXT_CLASS}`}>
          {chunks}
        </span>
      </WithWindow>
      <WithWindow electron browser>
        <span className={textClassName}>{chunks}</span>
      </WithWindow>
    </>
  );
}

function summarizeSkillScriptCommand(
  cmd: Array<string>,
): SkillScriptSummary | null {
  const executableName = getPathBasename(cmd[0] ?? "");
  if (executableName == null || !SKILL_SCRIPT_EXECUTABLES.has(executableName)) {
    return null;
  }

  const scriptPath = getScriptPathToken(cmd, 1);
  if (scriptPath == null) {
    return null;
  }

  const skillPathInfo = getSkillPathInfo(scriptPath);
  if (skillPathInfo == null || !skillPathInfo.isInScriptsFolder) {
    return null;
  }

  const fileName = getPathBasename(scriptPath);
  if (fileName == null) {
    return null;
  }

  return {
    skillName: skillPathInfo.skillName,
    fileName,
  };
}

function getScriptPathToken(
  tokens: Array<string>,
  startIndex: number,
): string | null {
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.startsWith("-")) {
      continue;
    }
    return token;
  }
  return null;
}

function getPathBasename(path: string): string | null {
  const normalizedPath = path.replaceAll("\\", "/").replace(/\/+$/, "");
  if (normalizedPath.length === 0) {
    return null;
  }
  const basename = normalizedPath.split("/").at(-1) ?? null;
  if (basename == null || basename.length === 0 || basename === "scripts") {
    return null;
  }
  return basename;
}

const formatElapsedTime = formatElapsedDuration;
