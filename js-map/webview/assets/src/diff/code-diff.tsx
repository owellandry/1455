import type {
  AnnotationSide,
  DiffLineAnnotation,
  GetHoveredLineResult,
  Hunk,
  HunkSeparators,
  OnDiffLineClickProps,
  OnDiffLineEnterLeaveProps,
  SelectedLineRange,
} from "@pierre/diffs";
import { useWorkerPool } from "@pierre/diffs/react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useFamily, useScope, useSignal } from "maitai";
import type {
  CommentInputItem,
  DiffModeEnum,
  GitCwd,
  HostConfig,
  LocalOrRemoteConversationId,
  OpenInTarget,
  ReviewFindingComment,
} from "protocol";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import {
  DiffContentBody,
  type ImagePreviewData,
  type ImagePreviewSource,
} from "@/diff/code-diff-renderers";
import { codexDiffSurfaceValue } from "@/diff/codex-diff-css";
import {
  exceedsFileRenderBudget,
  exceedsFileRenderBudgetForMetadata,
} from "@/diff/diff-render-budgets";
import { wordDiffsEnabled$ } from "@/diff/diff-view-mode";
import { useHasGitRpc } from "@/git-rpc/use-git-stable-metadata";
import { usePlatform } from "@/hooks/use-platform";
import { useWindowType } from "@/hooks/use-window-type";
import ChevronIcon from "@/icons/chevron.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import {
  getAvailableTargetOptions,
  getPrimaryAvailableTarget,
} from "@/local-conversation/open-target-selection";
import { reviewLoadFullFiles$ } from "@/review/review-preferences-model";
import { AppScope } from "@/scopes/app-scope";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { getHostFilePath, normalizePath } from "@/utils/path";

import { TaskDiffStats } from "../diff-stats";
import { LocalEnvironmentActionIcon } from "./action-icon-button";
import {
  codeDiffFullContentByKey,
  getCodeDiffFullContentKey,
  requestCodeDiffFullContent,
} from "./code-diff-full-content-model";
import {
  codeDiffOpenTargetsByCwd,
  openCodeDiffFile,
  openCodeDiffInTarget,
} from "./code-diff-open-target-model";
import {
  buildAnnotationKey,
  type AnnotationMetadata,
  type CommentAnnotationMetadata,
} from "./diff-annotations";
import { NULL_FILE, getProjectRelativePath } from "./diff-file-utils";
import type { CodexDiffFile } from "./parse-diff";
import { CodeDiffContextMenu } from "./use-code-diff-context-menu";
import { useDiffAnnotations } from "./use-diff-annotations";
import {
  useExpandAllCodeDiffs,
  type DiffScope,
} from "./use-expand-all-code-diffs";

const MAX_WORD_DIFF_CHANGED_LINES = 2000;

export function CodeDiff({
  diffViewClassName,
  diff,
  viewType,
  stickyHeader,
  hunkSeparators,
  enableComments = false,
  comments,
  modelComments,
  onCommentsChange,
  defaultOpen = true,
  diffViewWrap = false,
  showHunkActions = false,
  onHunkAction,
  hunkActionsVariant = "unstaged",
  cwd,
  richPreviewEnabled = false,
  roundedCorners = true,
  background = true,
  disableNativeContextMenu = false,
  onRequestChanges,
  onCopyPath,
  onToggleWrap,
  expandScope,
  conversationId,
  hostConfig,
  loadFullContent = true,
}: {
  diffViewClassName?: string;
  diff: CodexDiffFile;
  viewType: DiffModeEnum;
  stickyHeader: boolean;
  hunkSeparators?: Exclude<HunkSeparators, "custom">;
  enableComments?: boolean;
  comments?: Array<CommentInputItem>;
  modelComments?: Array<ReviewFindingComment>;
  onCommentsChange?: (comments: Array<CommentInputItem>) => void;
  defaultOpen?: boolean;
  diffViewWrap?: boolean;
  showHunkActions?: boolean;
  onHunkAction?: (params: HunkActionParams) => void;
  hunkActionsVariant?: "staged" | "unstaged";
  cwd?: GitCwd;
  richPreviewEnabled?: boolean;
  roundedCorners?: boolean;
  background?: boolean;
  disableNativeContextMenu?: boolean;
  onRequestChanges?: () => void;
  onCopyPath?: (path: string) => void;
  onToggleWrap?: () => void;
  expandScope?: DiffScope;
  conversationId?: LocalOrRemoteConversationId;
  hostConfig?: HostConfig;
  loadFullContent?: boolean;
}): React.ReactNode {
  const [open, setOpen] = useState(
    () => defaultOpen && diff.metadata.type !== "deleted",
  );
  const [wrapLines, setWrapLines] = useState(diffViewWrap);
  const hoveredLineRef = useRef<GetHoveredLineResult<"diff"> | null>(null);
  const requestChangesRef = useRef<() => void>(() => {});
  const scope = useScope(AppScope);
  const { platform } = usePlatform();
  const windowType = useWindowType();
  const broadcastExpand = useExpandAllCodeDiffs(setOpen, expandScope);
  const intl = useIntl();

  if (__DEV__ && enableComments && !onCommentsChange) {
    throw new Error(
      "onCommentCreate, onCommentUpdate, and onCommentDelete are required when enableComments is true.",
    );
  }

  const isAddition = diff.metadata.type === "new";
  const isDeletion = diff.metadata.type === "deleted";

  const gitRootRelativePath = diff.metadata.name;
  const workspaceRelativePath =
    gitRootRelativePath && gitRootRelativePath !== NULL_FILE
      ? getProjectRelativePath(gitRootRelativePath, cwd)
      : gitRootRelativePath;
  const displayPath = workspaceRelativePath ?? gitRootRelativePath ?? "";
  const openFilePath = useMemo(() => {
    if (workspaceRelativePath === NULL_FILE || !cwd) {
      return workspaceRelativePath;
    }
    return getHostFilePath(cwd, workspaceRelativePath, platform === "windows");
  }, [cwd, platform, workspaceRelativePath]);
  const displayFileName =
    normalizePath(displayPath).split("/").pop() ?? displayPath;
  useEffect(() => {
    setWrapLines(diffViewWrap);
  }, [diffViewWrap]);
  const openTargets = useFamily(codeDiffOpenTargetsByCwd, cwd ?? null);
  const openTargetsQuery = useSignal(openTargets.query$);
  const preferredTargetOverride = useSignal(
    openTargets.preferredTargetOverride$,
  );
  const preferredTarget =
    preferredTargetOverride ?? openTargetsQuery.data?.preferredTarget ?? null;
  const availableTargets = openTargetsQuery.data?.availableTargets ?? [];
  const targets =
    preferredTargetOverride == null
      ? (openTargetsQuery.data?.targets ?? [])
      : (openTargetsQuery.data?.targets ?? []).map((candidate) => ({
          ...candidate,
          default: candidate.id === preferredTargetOverride ? true : undefined,
        }));
  const visibleTargets = getAvailableTargetOptions({
    targets,
    availableTargets,
  });
  const primaryTarget = getPrimaryAvailableTarget({
    preferredTarget,
    targets,
    availableTargets,
  });
  const canOpenFile = Boolean(openFilePath && openFilePath !== NULL_FILE);
  const handleCopyPath = (): void => {
    if (!openFilePath || openFilePath === NULL_FILE) {
      return;
    }
    if (onCopyPath) {
      onCopyPath(openFilePath);
      return;
    }
    void copyToClipboard(openFilePath);
  };

  const handleToggleWrap = (): void => {
    if (onToggleWrap) {
      onToggleWrap();
      return;
    }
    setWrapLines((prev) => !prev);
  };
  const firstDiffLine = isDeletion
    ? (diff.firstDeletionLine ?? 1)
    : (diff.firstAdditionLine ?? 1);
  const handleMaybeOpenFile = useCallback(
    ({ lineNumber: line, event }: OnDiffLineClickProps): void => {
      if (!openFilePath) {
        return;
      }
      if (windowType === "electron" && !(event.metaKey || event.ctrlKey)) {
        return;
      }
      void openCodeDiffFile(scope, {
        path: openFilePath,
        line,
        cwd: cwd ?? null,
      });
    },
    [cwd, openFilePath, scope, windowType],
  );

  const handleOpenInTarget = useCallback(
    (target: OpenInTarget, persistPreferred: boolean): void => {
      if (!openFilePath) {
        return;
      }
      void openCodeDiffInTarget(scope, {
        cwd: cwd ?? null,
        line: firstDiffLine,
        openPath: openFilePath ?? null,
        persistPreferred,
        target,
      });
    },
    [cwd, firstDiffLine, openFilePath, scope],
  );
  const handleOpenInEditor = (): void => {
    if (primaryTarget) {
      handleOpenInTarget(primaryTarget.id, false);
      return;
    }
    if (!openFilePath) {
      return;
    }
    void openCodeDiffFile(scope, {
      path: openFilePath,
      line: firstDiffLine,
      cwd: cwd ?? null,
    });
  };
  const primaryOpenAction: (() => void) | null = primaryTarget
    ? (): void => handleOpenInTarget(primaryTarget.id, false)
    : null;

  const handleLineClick = useCallback(
    (props: OnDiffLineClickProps): void => {
      handleMaybeOpenFile(props);
    },
    [handleMaybeOpenFile],
  );

  const handleLineNumberClick = useCallback(
    (props: OnDiffLineClickProps): void => {
      handleMaybeOpenFile(props);
    },
    [handleMaybeOpenFile],
  );

  const toggleDiffOpen = useCallback(
    (event?: MouseEvent<HTMLElement>): void => {
      const nextOpen = !open;
      if (event?.altKey) {
        broadcastExpand(nextOpen);
        return;
      }
      setOpen(nextOpen);
    },
    [broadcastExpand, open],
  );

  const handleFileNameClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      if (windowType === "electron") {
        toggleDiffOpen(event);
        return;
      }
      if (workspaceRelativePath && workspaceRelativePath !== NULL_FILE) {
        void openCodeDiffFile(scope, {
          path: openFilePath,
          line: firstDiffLine,
          cwd: cwd ?? null,
        });
        return;
      }
      toggleDiffOpen(event);
    },
    [
      firstDiffLine,
      cwd,
      openFilePath,
      scope,
      toggleDiffOpen,
      windowType,
      workspaceRelativePath,
    ],
  );
  const handleRequestChanges = useCallback((): void => {
    requestChangesRef.current();
  }, []);

  return (
    <CodeDiffContextMenu
      visibleTargets={visibleTargets}
      primaryTarget={primaryTarget}
      canOpenFile={canOpenFile}
      onRequestChanges={handleRequestChanges}
      onCopyPath={handleCopyPath}
      onToggleWrap={handleToggleWrap}
      primaryOpenAction={primaryOpenAction}
      handleOpenInTarget={(targetId) => handleOpenInTarget(targetId, true)}
      disableNative={disableNativeContextMenu}
    >
      <div
        className={clsx(
          "group/file-diff flex flex-col overflow-clip",
          background && "bg-token-foreground/5",
          roundedCorners && "rounded-lg",
        )}
        style={{
          ["--codex-diffs-surface" as string]:
            codexDiffSurfaceValue(background),
        }}
      >
        <CodeDiffHeader
          diff={diff}
          displayFileName={displayFileName}
          displayPath={displayPath}
          isDeletion={isDeletion}
          isAddition={isAddition}
          onFileNameClick={handleFileNameClick}
          onOpenInEditor={handleOpenInEditor}
          onFileToggle={toggleDiffOpen}
          onFileAction={(action) => {
            onHunkAction?.({
              path: diff.metadata.name,
              action,
              scope: "file",
            });
          }}
          open={open}
          stickyHeader={stickyHeader}
          showOpenInButton={windowType === "electron" && canOpenFile}
          toggleAriaLabel={intl.formatMessage({
            id: "diff.fileHeader.toggle",
            defaultMessage: "Toggle file diff",
            description: "Button label for toggling the file diff section",
          })}
          workspaceRelativePath={workspaceRelativePath}
          showHunkActions={showHunkActions}
          hunkActionsVariant={hunkActionsVariant}
        />
        <AnimatePresence>
          {open ? (
            <CodeDiffBody
              canOpenFile={canOpenFile}
              comments={comments}
              conversationId={conversationId}
              cwd={cwd}
              diff={diff}
              diffViewClassName={diffViewClassName}
              enableComments={enableComments}
              handleLineClick={handleLineClick}
              handleLineNumberClick={handleLineNumberClick}
              hostConfig={hostConfig}
              hoveredLineRef={hoveredLineRef}
              hunkActionsVariant={hunkActionsVariant}
              hunkSeparators={hunkSeparators}
              loadFullContent={loadFullContent}
              modelComments={modelComments}
              onCommentsChange={onCommentsChange}
              onHunkAction={onHunkAction}
              onOpenInEditor={handleOpenInEditor}
              onRequestChanges={onRequestChanges}
              openFilePath={openFilePath ?? null}
              open={open}
              requestChangesRef={requestChangesRef}
              richPreviewEnabled={richPreviewEnabled}
              showHunkActions={showHunkActions}
              viewType={viewType}
              wrapLines={wrapLines}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </CodeDiffContextMenu>
  );
}

function CodeDiffHeader({
  diff,
  displayFileName,
  displayPath,
  hunkActionsVariant,
  isAddition,
  isDeletion,
  onFileAction,
  onFileNameClick,
  onOpenInEditor,
  onFileToggle,
  open,
  showOpenInButton,
  showHunkActions,
  stickyHeader,
  toggleAriaLabel,
  workspaceRelativePath,
}: {
  diff: CodexDiffFile;
  displayFileName: string;
  displayPath: string;
  hunkActionsVariant: "staged" | "unstaged";
  isAddition: boolean;
  isDeletion: boolean;
  onFileAction: (action: "stage" | "unstage" | "revert") => void;
  onFileNameClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenInEditor: () => void;
  onFileToggle: (event?: MouseEvent<HTMLElement>) => void;
  open: boolean;
  showOpenInButton: boolean;
  showHunkActions: boolean;
  stickyHeader: boolean;
  toggleAriaLabel: string;
  workspaceRelativePath: string | undefined;
}): React.ReactElement {
  return (
    <div
      role="button"
      onClick={onFileToggle}
      className={clsx(
        "cursor-interaction select-none focus-visible:outline-none bg-token-side-bar-background",
        stickyHeader && "z-49 sticky top-0",
      )}
    >
      <div className="bg-token-foreground/5">
        <div className="group text-size-chat @container/diff-header relative flex items-center gap-2 pt-1 pr-1 pb-1 pl-3">
          <div className="text-size-chat flex min-w-0 items-center gap-2 pb-0.5 text-token-text-primary">
            <Tooltip
              tooltipContent={<span className="font-mono">{displayPath}</span>}
              delayDuration={200}
            >
              <button
                type="button"
                className="min-w-0 cursor-interaction truncate text-start text-token-text-primary select-text [direction:rtl]"
                disabled={
                  !workspaceRelativePath || workspaceRelativePath === NULL_FILE
                }
                onClick={onFileNameClick}
              >
                <span className="min-w-0 truncate [direction:ltr] [unicode-bidi:plaintext] @xs/diff-header:hidden">
                  {displayFileName}
                </span>
                <span className="hidden min-w-0 truncate [direction:ltr] [unicode-bidi:plaintext] @xs/diff-header:inline">
                  {displayPath}
                </span>
              </button>
            </Tooltip>
            <span className="ml-auto shrink-0" key={displayPath}>
              <TaskDiffStats
                linesAdded={diff.additions}
                linesRemoved={diff.deletions}
              />
            </span>
            {isAddition ? (
              <span className="mb-0.5 text-token-text-link-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            ) : null}
            {isDeletion ? (
              <span className="mb-0.5 text-token-charts-red">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            ) : null}
          </div>
          <div className="ms-auto mr-1 flex items-center gap-1">
            {showHunkActions ? (
              <FileActionButtons
                onFileAction={onFileAction}
                variant={hunkActionsVariant}
              />
            ) : null}
            {showOpenInButton ? (
              <HeaderOpenInButton onOpenInEditor={onOpenInEditor} />
            ) : null}
            <Button
              className={clsx(
                "text-token-input-placeholder-foreground transition-opacity duration-200",
                open
                  ? "opacity-100"
                  : "opacity-0 group-hover/file-diff:opacity-100",
              )}
              color="ghost"
              size="composerSm"
              uniform
              aria-label={toggleAriaLabel}
              onClick={(event) => {
                event.stopPropagation();
                onFileToggle(event);
              }}
            >
              <ChevronIcon
                className={clsx(
                  "icon-2xs transition-transform duration-200",
                  open ? "rotate-180" : "rotate-0",
                )}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderOpenInButton({
  onOpenInEditor,
}: {
  onOpenInEditor: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const openInLabel = intl.formatMessage({
    id: "codex.diff.fileHeader.openInIcon",
    defaultMessage: "Open file",
    description:
      "Accessible label for the icon button in the diff file header that opens the current file",
  });
  const openInTooltip = intl.formatMessage({
    id: "codex.diff.fileHeader.openIn.tooltip",
    defaultMessage: "Open in editor",
    description:
      "Tooltip for the icon button in the diff file header that opens the current file",
  });

  return (
    <div
      className="shrink-0 opacity-0 transition-opacity duration-200 group-hover/file-diff:opacity-100"
      onClick={(event) => event.stopPropagation()}
    >
      <Tooltip tooltipContent={openInTooltip}>
        <Button
          color="ghost"
          size="composerSm"
          uniform
          aria-label={openInLabel}
          onClick={(event) => {
            event.stopPropagation();
            onOpenInEditor();
          }}
        >
          <LinkExternalIcon className="icon-2xs" />
        </Button>
      </Tooltip>
    </div>
  );
}

function CodeDiffBody({
  canOpenFile,
  comments,
  conversationId,
  cwd,
  diff,
  diffViewClassName,
  enableComments,
  handleLineClick,
  handleLineNumberClick,
  hostConfig,
  hoveredLineRef,
  hunkActionsVariant,
  hunkSeparators,
  loadFullContent,
  modelComments,
  onCommentsChange,
  onHunkAction,
  onOpenInEditor,
  onRequestChanges,
  openFilePath,
  open,
  requestChangesRef,
  richPreviewEnabled,
  showHunkActions,
  viewType,
  wrapLines,
}: {
  canOpenFile: boolean;
  comments?: Array<CommentInputItem>;
  conversationId?: LocalOrRemoteConversationId;
  cwd?: GitCwd;
  diff: CodexDiffFile;
  diffViewClassName?: string;
  enableComments: boolean;
  handleLineClick: (props: OnDiffLineClickProps) => void;
  handleLineNumberClick: (props: OnDiffLineClickProps) => void;
  hostConfig?: HostConfig;
  hoveredLineRef: React.RefObject<GetHoveredLineResult<"diff"> | null>;
  hunkActionsVariant: "staged" | "unstaged";
  hunkSeparators?: Exclude<HunkSeparators, "custom">;
  loadFullContent: boolean;
  modelComments?: Array<ReviewFindingComment>;
  onCommentsChange?: (comments: Array<CommentInputItem>) => void;
  onHunkAction?: (params: HunkActionParams) => void;
  onOpenInEditor: () => void;
  onRequestChanges?: () => void;
  openFilePath: string | null;
  open: boolean;
  requestChangesRef: { current: () => void };
  richPreviewEnabled: boolean;
  showHunkActions: boolean;
  viewType: DiffModeEnum;
  wrapLines: boolean;
}): React.ReactElement {
  const scope = useScope(AppScope);
  const workerPool = useWorkerPool();
  const wordDiffsEnabled = useSignal(wordDiffsEnabled$);
  const loadFullFilesEnabled = useSignal(reviewLoadFullFiles$);
  const defaultHostConfig = useHostConfig(DEFAULT_HOST_ID);
  const hasGitRpc = useHasGitRpc();
  const diffContainerRef = useRef<HTMLDivElement | null>(null);
  const hasRequestedFullContentRef = useRef(false);
  const resolvedHostConfig = hostConfig ?? defaultHostConfig;
  const changedLineCount = diff.additions + diff.deletions;
  const exceedsRenderBudget = exceedsFileRenderBudget(diff);
  const disableHighlight = changedLineCount > MAX_WORD_DIFF_CHANGED_LINES;
  const lineDiffType =
    disableHighlight || !wordDiffsEnabled ? "none" : "word-alt";
  const hasNoChanges = diff.additions === 0 && diff.deletions === 0;
  const shouldSkipFullContentLoad = exceedsRenderBudget;
  const fullContent = useFamily(
    codeDiffFullContentByKey,
    getCodeDiffFullContentKey({
      diff,
      hostConfig: resolvedHostConfig,
      loadFullFilesEnabled,
      workspaceRoot: cwd,
    }),
  );
  const fullDiffMetadata = useSignal(fullContent.fullDiffMetadata$);
  const isLoadingFullContent = useSignal(fullContent.isLoadingFullContent$);
  const shouldFetchFullContent =
    loadFullContent &&
    hasGitRpc &&
    loadFullFilesEnabled &&
    cwd != null &&
    open &&
    diff.metadata.isPartial &&
    !diff.isBinary &&
    !hasNoChanges &&
    !shouldSkipFullContentLoad &&
    fullDiffMetadata == null &&
    !isLoadingFullContent;
  useEffect(() => {
    hasRequestedFullContentRef.current = false;
  }, [fullContent.key]);
  useEffect(() => {
    if (!shouldFetchFullContent || hasRequestedFullContentRef.current) {
      return;
    }
    const container = diffContainerRef.current;
    if (container == null) {
      return;
    }

    const observer = new IntersectionObserver((entries): void => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      hasRequestedFullContentRef.current = true;
      observer.disconnect();
      void requestCodeDiffFullContent(scope, {
        diff,
        hostConfig: resolvedHostConfig,
        key: fullContent.key,
        workspaceRoot: cwd,
      });
    });
    observer.observe(container);
    return (): void => {
      observer.disconnect();
    };
  }, [
    cwd,
    diff,
    fullContent.key,
    resolvedHostConfig,
    scope,
    shouldFetchFullContent,
  ]);
  const fileDiffMetadata = fullDiffMetadata ?? diff.metadata;
  const requiresOpenInEditorPrompt =
    fullDiffMetadata != null
      ? exceedsFileRenderBudgetForMetadata(fullDiffMetadata)
      : exceedsRenderBudget;
  const fileDiff = disableHighlight
    ? { ...fileDiffMetadata, lang: "text" as const }
    : fileDiffMetadata;
  const markdownPreviewPath =
    hunkActionsVariant === "staged" ? null : openFilePath;
  const imagePreview = buildImagePreviewData({
    diff,
    openFilePath: markdownPreviewPath,
    cwd,
    hunkActionsVariant,
  });
  const isAddition = diff.metadata.type === "new";
  const isDeletion = diff.metadata.type === "deleted";
  const updateLineDiffTypeOnWorkerPoolEvent = useEffectEvent(() => {
    if (!workerPool) {
      return;
    }
    const current = workerPool.getDiffRenderOptions().lineDiffType;
    if (current !== lineDiffType) {
      void workerPool.setRenderOptions({ lineDiffType });
    }
  });

  useEffect(() => {
    updateLineDiffTypeOnWorkerPoolEvent();
  }, [lineDiffType]);

  const {
    annotations: commentAnnotations,
    annotationKeys: annotationKeysWithComments,
    addDraftComment,
    renderCommentAnnotation,
  } = useDiffAnnotations({
    diffPath: diff.metadata.name,
    workspaceRoot: cwd,
    enableComments,
    comments,
    modelComments,
    onCommentsChange,
    conversationId,
  });
  const getHunkAnchor = useCallback(
    (hunk: Hunk): { side: AnnotationSide; lineNumber: number } | null => {
      let additionLine = hunk.additionStart ?? 1;
      let deletionLine = hunk.deletionStart ?? 1;
      let lastChange: { side: AnnotationSide; lineNumber: number } | null =
        null;

      for (const content of hunk.hunkContent ?? []) {
        if (content.type === "context") {
          const contextLength = content.lines;
          additionLine += contextLength;
          deletionLine += contextLength;
          continue;
        }

        if (content.type === "change") {
          let itemLast: { side: AnnotationSide; lineNumber: number } | null =
            null;
          const additionsCount = content.additions;
          if (additionsCount > 0) {
            const end = additionLine + additionsCount - 1;
            additionLine = end + 1;
            itemLast = { side: "additions", lineNumber: end };
          }
          const deletionsCount = content.deletions;
          if (deletionsCount > 0) {
            const end = deletionLine + deletionsCount - 1;
            deletionLine = end + 1;
            if (!itemLast) {
              itemLast = { side: "deletions", lineNumber: end };
            }
          }

          if (itemLast) {
            lastChange = itemLast;
          }
        }
      }

      return lastChange;
    },
    [],
  );
  const hunkActionAnnotations: Array<DiffLineAnnotation<AnnotationMetadata>> =
    useMemo(() => {
      if (!showHunkActions || isAddition || isDeletion) {
        return [];
      }

      const annotations: Array<DiffLineAnnotation<AnnotationMetadata>> = [];
      diff.metadata.hunks.forEach((hunk, index) => {
        const anchor = getHunkAnchor(hunk);
        if (!anchor) {
          return;
        }
        annotations.push({
          side: anchor.side,
          lineNumber: anchor.lineNumber,
          metadata: {
            kind: "hunk-actions",
            path: diff.metadata.name,
            hunkIndex: index,
          },
        });
      });
      return annotations;
    }, [
      diff.metadata.hunks,
      diff.metadata.name,
      getHunkAnchor,
      isAddition,
      isDeletion,
      showHunkActions,
    ]);
  const annotations: Array<DiffLineAnnotation<AnnotationMetadata>> =
    useMemo(() => {
      const allAnnotations: Array<DiffLineAnnotation<AnnotationMetadata>> = [];
      if (showHunkActions) {
        allAnnotations.push(...hunkActionAnnotations);
      }
      if (enableComments) {
        allAnnotations.push(...commentAnnotations);
      }
      return allAnnotations;
    }, [
      commentAnnotations,
      enableComments,
      hunkActionAnnotations,
      showHunkActions,
    ]);
  const handleLineEnter = useCallback(
    ({ annotationSide, lineNumber }: OnDiffLineEnterLeaveProps): void => {
      hoveredLineRef.current = {
        lineNumber,
        side: annotationSide,
      };
    },
    [hoveredLineRef],
  );
  const handleLineLeave = useCallback((): void => {
    hoveredLineRef.current = null;
  }, [hoveredLineRef]);
  const handleRequestChanges = useCallback((): void => {
    const hoveredLine = hoveredLineRef.current;
    if (!hoveredLine) {
      return;
    }
    const key = buildAnnotationKey(hoveredLine.side, hoveredLine.lineNumber);
    if (annotationKeysWithComments.has(key)) {
      return;
    }
    addDraftComment({
      side: hoveredLine.side,
      lineNumber: hoveredLine.lineNumber,
      localDiffHunk: getCommentHunkText(
        diff,
        hoveredLine.side,
        hoveredLine.lineNumber,
      ),
    });
    onRequestChanges?.();
  }, [
    addDraftComment,
    annotationKeysWithComments,
    diff,
    hoveredLineRef,
    onRequestChanges,
  ]);
  useEffect(() => {
    requestChangesRef.current = handleRequestChanges;
    return (): void => {
      if (requestChangesRef.current === handleRequestChanges) {
        requestChangesRef.current = (): void => {};
      }
    };
  }, [handleRequestChanges, requestChangesRef]);
  const renderAnnotation = useCallback(
    (annotation: DiffLineAnnotation<AnnotationMetadata>): React.ReactNode => {
      const metadata = annotation.metadata;
      if (!metadata) {
        return null;
      }
      if (metadata.kind === "hunk-actions") {
        return (
          <HunkActionButtons
            path={metadata.path}
            hunkIndex={metadata.hunkIndex}
            onHunkAction={onHunkAction}
            variant={hunkActionsVariant}
          />
        );
      }
      return renderCommentAnnotation(
        annotation as DiffLineAnnotation<CommentAnnotationMetadata>,
      );
    },
    [hunkActionsVariant, onHunkAction, renderCommentAnnotation],
  );
  const handleGutterUtilityClick = useCallback(
    (range: SelectedLineRange): void => {
      const side = range.endSide ?? range.side;
      if (side == null) {
        return;
      }
      const lineNumber = Math.max(range.start, range.end);
      const key = buildAnnotationKey(side, lineNumber);
      if (annotationKeysWithComments.has(key)) {
        return;
      }
      addDraftComment({
        side,
        lineNumber,
        ...(range.side === side || range.endSide == null
          ? { startLine: Math.min(range.start, range.end) }
          : {}),
        localDiffHunk: getCommentHunkText(diff, side, lineNumber),
      });
    },
    [addDraftComment, annotationKeysWithComments, diff],
  );

  return (
    <motion.div
      ref={diffContainerRef}
      initial={false}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0, ease: "easeInOut" }}
      className="relative overflow-hidden"
      onMouseLeave={handleLineLeave}
    >
      {requiresOpenInEditorPrompt ? (
        <OpenInEditorPrompt
          canOpenFile={canOpenFile}
          onOpenInEditor={onOpenInEditor}
        />
      ) : (
        <DiffContentBody
          diffViewProps={{
            diffViewClassName,
            fileDiff,
            isLoadingFullContent,
            viewType,
            wrapLines,
            hunkSeparators,
            lineDiffType,
            expansionLineCount: 20,
            enableLineSelection: enableComments,
            onLineEnter: handleLineEnter,
            onLineLeave: handleLineLeave,
            onLineClick: handleLineClick,
            onLineNumberClick: handleLineNumberClick,
            lineAnnotations: annotations,
            renderAnnotation:
              showHunkActions || enableComments ? renderAnnotation : undefined,
            onGutterUtilityClick: enableComments
              ? handleGutterUtilityClick
              : undefined,
          }}
          filePath={diff.metadata.name}
          previewPath={markdownPreviewPath}
          imagePreview={imagePreview}
          hasNoChanges={hasNoChanges}
          isBinary={diff.isBinary}
          isDeletion={isDeletion}
          richPreviewEnabled={richPreviewEnabled}
        />
      )}
    </motion.div>
  );
}

function OpenInEditorPrompt({
  canOpenFile,
  onOpenInEditor,
}: {
  canOpenFile: boolean;
  onOpenInEditor: () => void;
}): React.ReactElement {
  return (
    <div className="text-size-chat flex items-center gap-2 bg-token-editor-background px-3 py-2 text-token-description-foreground">
      <span className="min-w-0 flex-1 truncate">
        <FormattedMessage
          id="codex.diff.openInEditorPrompt.singleLine"
          defaultMessage="This file is too large to display here."
          description="Single-line prompt shown in the diff view when a file is too large to render in-panel"
        />
      </span>
      {canOpenFile ? (
        <Button
          className="shrink-0 px-1.5"
          color="ghost"
          size="toolbar"
          onClick={onOpenInEditor}
        >
          <FormattedMessage
            id="codex.diff.openInEditorPrompt.openButton"
            defaultMessage="Open in editor"
            description="Button label shown in the large-diff prompt to open the file in an editor"
          />
        </Button>
      ) : null}
    </div>
  );
}

export type HunkActionParams = {
  path: string;
  hunkIndex?: number;
  action: "stage" | "unstage" | "revert";
  scope?: "file" | "hunk" | "section";
};

function FileActionButtons({
  variant,
  onFileAction,
}: {
  variant: "staged" | "unstaged";
  onFileAction?: (action: "stage" | "unstage" | "revert") => void;
}): React.ReactElement {
  const action = variant === "staged" ? "unstage" : "stage";

  return (
    <div className="flex items-center opacity-0 transition-opacity group-hover/file-diff:opacity-100">
      <LocalEnvironmentActionIcon
        action="revert"
        scope="file"
        onClick={(event) => {
          event.stopPropagation();
          onFileAction?.("revert");
        }}
      />
      <LocalEnvironmentActionIcon
        scope="file"
        action={action}
        onClick={(event) => {
          event.stopPropagation();
          onFileAction?.(action);
        }}
      />
    </div>
  );
}

function HunkActionButtons({
  path,
  hunkIndex,
  onHunkAction,
  variant,
}: {
  path: string;
  hunkIndex: number;
  onHunkAction?: (params: HunkActionParams) => void;
  variant: "staged" | "unstaged";
}): React.ReactElement {
  const isStaged = variant === "staged";
  const action = isStaged ? "unstage" : "stage";

  return (
    <div className="pointer-events-none absolute -top-8.5 right-0.5 z-20 flex items-center gap-1 rounded-full bg-token-side-bar-background/90 px-0.5 py-0.5 opacity-0 shadow-sm ring-1 ring-token-border/60 transition-opacity group-hover/file-diff:pointer-events-auto group-hover/file-diff:opacity-100">
      <LocalEnvironmentActionIcon
        action="revert"
        scope="hunk"
        onClick={(event) => {
          event.stopPropagation();
          onHunkAction?.({
            path,
            hunkIndex,
            action: "revert",
            scope: "hunk",
          });
        }}
      />
      <LocalEnvironmentActionIcon
        scope="hunk"
        action={action}
        onClick={(event) => {
          event.stopPropagation();
          onHunkAction?.({
            path,
            hunkIndex,
            action,
            scope: "hunk",
          });
        }}
      />
    </div>
  );
}

function buildImagePreviewData({
  diff,
  openFilePath,
  cwd,
  hunkActionsVariant,
}: {
  diff: CodexDiffFile;
  openFilePath: string | null;
  cwd?: GitCwd;
  hunkActionsVariant: "staged" | "unstaged" | null;
}): ImagePreviewData | null {
  const before =
    hunkActionsVariant === "unstaged"
      ? createGitImageSource({
          cwd,
          path: diff.oldPath,
          ref: "index",
        })
      : createGitImageSource({
          cwd,
          path: diff.oldPath,
          ref: "head",
        });
  const after =
    hunkActionsVariant === "staged"
      ? createGitImageSource({
          cwd,
          path: diff.newPath,
          ref: "index",
        })
      : createWorktreeImageSource(openFilePath);

  if (!before && !after) {
    return null;
  }

  return { before, after };
}

function createGitImageSource({
  cwd,
  path,
  ref,
}: {
  cwd?: GitCwd;
  path: string;
  ref: "head" | "index";
}): ImagePreviewSource | null {
  if (!cwd) {
    return null;
  }
  if (!path || path === NULL_FILE) {
    return null;
  }
  return { kind: "git", cwd, path, ref };
}

function createWorktreeImageSource(
  path: string | null,
): ImagePreviewSource | null {
  if (!path || path === NULL_FILE) {
    return null;
  }
  return { kind: "worktree", path };
}

function getCommentHunkText(
  diff: CodexDiffFile,
  side: AnnotationSide,
  lineNumber: number,
): string | undefined {
  const hunk = diff.metadata.hunks.find((candidate) => {
    if (side === "additions") {
      return isLineInHunkRange(
        lineNumber,
        candidate.additionStart,
        candidate.additionCount,
      );
    }
    return isLineInHunkRange(
      lineNumber,
      candidate.deletionStart,
      candidate.deletionCount,
    );
  });
  if (!hunk) {
    return undefined;
  }

  const lines: Array<string> = [
    stripTrailingDiffNewline(
      hunk.hunkSpecs ??
        `@@ -${hunk.deletionStart ?? 0},${hunk.deletionCount ?? 0} +${hunk.additionStart ?? 0},${hunk.additionCount ?? 0} @@`,
    ),
  ];

  for (const item of hunk.hunkContent) {
    if (item.type === "context") {
      const contextLines = diff.metadata.additionLines.slice(
        item.additionLineIndex,
        item.additionLineIndex + item.lines,
      );
      lines.push(
        ...contextLines.map((line) => ` ${stripTrailingDiffNewline(line)}`),
      );
      continue;
    }

    const deletionLines = diff.metadata.deletionLines.slice(
      item.deletionLineIndex,
      item.deletionLineIndex + item.deletions,
    );
    const additionLines = diff.metadata.additionLines.slice(
      item.additionLineIndex,
      item.additionLineIndex + item.additions,
    );
    lines.push(
      ...deletionLines.map((line) => `-${stripTrailingDiffNewline(line)}`),
      ...additionLines.map((line) => `+${stripTrailingDiffNewline(line)}`),
    );
  }

  return lines.join("\n");
}

function isLineInHunkRange(
  lineNumber: number,
  start: number | undefined,
  count: number | undefined,
): boolean {
  if (start == null || count == null) {
    return false;
  }
  return lineNumber >= start && lineNumber < start + count;
}

function stripTrailingDiffNewline(line: string): string {
  return line.replace(/\r?\n$/, "");
}
