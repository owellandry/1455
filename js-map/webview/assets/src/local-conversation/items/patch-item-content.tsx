import type { FileChange } from "app-server-types";
import clsx from "clsx";
import { motion } from "framer-motion";
import type { ConversationId, GitCwd, McpRequestId } from "protocol";
import type React from "react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import tw from "tailwind-styled-components";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { CodeSnippet } from "@/components/code-snippet";
import { CopyButton } from "@/components/copy-button";
import { FileDiff } from "@/components/file-diff";
import { Tooltip } from "@/components/tooltip";
import { TaskDiffStats } from "@/diff-stats";
import { parseDiff } from "@/diff/parse-diff";
import { useWindowType } from "@/hooks/use-window-type";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { getLanguageFromPath } from "@/utils/get-language-from-path";
import { logger } from "@/utils/logger";
import { getPathBasename } from "@/utils/path";
import { useIsDark } from "@/utils/use-is-dark";
import { useMutationFromVSCode } from "@/vscode-api";

import { InProgressFixedContentItem } from "../in-progress-fixed-content-item";
import { useMeasuredElementHeight } from "../use-measured-element-height";
import { buildUnifiedGitDiffText } from "./build-unified-git-diff-text";
import type { PatchApplyLocalConversationItem } from "./local-conversation-item";
import { TimelineItem } from "./timeline-item";

const EmptyContent = tw.div`text-token-description-foreground/80 bg-token-editor-background flex w-full items-center justify-center px-2 pt-7 pb-8 text-size-chat`;

export function PatchItemContent({
  item,
  cwd,
}: {
  item: PatchApplyLocalConversationItem;
  cwd?: GitCwd | null;
}): React.ReactElement | null {
  const status: "pending" | "applied" | "rejected" =
    item.success == null ? "pending" : item.success ? "applied" : "rejected";

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col gap-[var(--conversation-tool-assistant-gap,8px)]">
        {Object.entries(item.changes).map(([path, change]) => (
          <FileChangeEntryContent
            key={path}
            path={path}
            change={change}
            status={status}
            cwd={cwd}
            grantRoot={item.grantRoot}
          />
        ))}
      </div>
    </TimelineItem>
  );
}

export function FileChangeEntryContent({
  path,
  change,
  status,
  cwd,
  grantRoot,
}: {
  path: string;
  change: FileChange;
  status: "pending" | "applied" | "rejected";
  cwd?: GitCwd | null;
  grantRoot: GitCwd | null;
}): React.ReactElement {
  const isPendingApproval = status === "pending";
  const isRejected = status === "rejected";
  const isApplying = status === "pending";
  const windowType = useWindowType();

  const shouldAutoExpand = windowType === "extension";
  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand);
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const openFile = useMutationFromVSCode("open-file");

  const unifiedDiff = useMemo(() => {
    return buildUnifiedGitDiffText(path, change);
  }, [path, change]);

  const updateExpandedState = useEffectEvent(() => {
    if (shouldAutoExpand && !isExpanded) {
      setIsExpanded(true);
    }
  });
  useEffect(() => {
    updateExpandedState();
  }, [shouldAutoExpand]);

  const actionLabel = useMemo<React.ReactNode>(() => {
    if (change.type === "add") {
      if (isRejected) {
        return (
          <FormattedMessage
            id="codex.patch.change.rejected-add"
            defaultMessage="Rejected"
            description="Label indicating a file creation was rejected in the patch summary"
          />
        );
      }
      return isPendingApproval ? (
        <FormattedMessage
          id="codex.patch.change.creating"
          defaultMessage="Creating"
          description="Label indicating a file is being created while awaiting approval"
        />
      ) : (
        <FormattedMessage
          id="codex.patch.change.created"
          defaultMessage="Created"
          description="Label indicating a file has been created in the patch summary"
        />
      );
    }
    if (change.type === "delete") {
      if (isRejected) {
        return (
          <FormattedMessage
            id="codex.patch.change.rejected-delete"
            defaultMessage="Rejected"
            description="Label indicating a file deletion was rejected in the patch summary"
          />
        );
      }
      return isPendingApproval ? (
        <FormattedMessage
          id="codex.patch.change.deleting"
          defaultMessage="Deleting"
          description="Label indicating a file has been deleted in the patch summary"
        />
      ) : (
        <FormattedMessage
          id="codex.patch.change.deleted"
          defaultMessage="Deleted"
          description="Label indicating a file has been deleted in the patch summary"
        />
      );
    }
    if (isRejected) {
      return (
        <FormattedMessage
          id="codex.patch.change.rejected-edit"
          defaultMessage="Rejected"
          description="Label indicating a file edit was rejected in the patch summary"
        />
      );
    }
    return isPendingApproval ? (
      <FormattedMessage
        id="codex.patch.change.editing"
        defaultMessage="Editing"
        description="Label indicating a file is being edited in the patch summary while awaiting approval"
      />
    ) : (
      <FormattedMessage
        id="codex.patch.change.edited"
        defaultMessage="Edited"
        description="Label indicating a file has been edited in the patch summary"
      />
    );
  }, [change.type, isPendingApproval, isRejected]);

  const diffStats = useMemo(() => {
    const text = unifiedDiff;
    if (!text) {
      return null;
    }
    const diffs = parseDiff(text);
    const diff = diffs[0];
    if (!diff) {
      return null;
    }

    const openLocation = {
      path,
      line: diff.firstAdditionLine ?? diff.firstDeletionLine ?? 1,
    };

    return {
      added: diff.additions,
      deleted: diff.deletions,
      openLocation,
    };
  }, [unifiedDiff, path]);

  const handleOpenFile = (): void => {
    openFile.mutate({
      path,
      line: diffStats?.openLocation?.line,
      cwd: grantRoot ?? cwd ?? null,
    });
  };

  const showInlineDiffStats = change.type === "delete" && diffStats;
  const containerPaddingClassName = "px-0";
  const headerPaddingClassName = "px-0 py-0";
  const expandedActionFileLabel = useMemo<React.ReactNode | null>(() => {
    if (!isExpanded || isPendingApproval || isRejected) {
      return null;
    }
    if (change.type === "add") {
      return (
        <FormattedMessage
          id="codex.patch.change.created-file"
          defaultMessage="Created file"
          description="Header label shown for an expanded created file entry"
        />
      );
    }
    if (change.type === "delete") {
      return (
        <FormattedMessage
          id="codex.patch.change.deleted-file"
          defaultMessage="Deleted file"
          description="Header label shown for an expanded deleted file entry"
        />
      );
    }
    return (
      <FormattedMessage
        id="codex.patch.change.edited-file"
        defaultMessage="Edited file"
        description="Header label shown for an expanded edited file entry"
      />
    );
  }, [change.type, isExpanded, isPendingApproval, isRejected]);
  const hideTriggerDiffStats = expandedActionFileLabel != null;
  const isBodyVisible = isExpanded;
  const targetHeight = isBodyVisible ? contentHeightPx : 0;

  return (
    <div className={containerPaddingClassName}>
      <div
        className={clsx(
          "flex flex-col overflow-clip transition-[box-shadow] duration-300",
          isPendingApproval ? "rounded-xl" : "rounded-lg",
        )}
      >
        <div
          className={clsx(
            "cursor-interaction group flex items-center justify-between gap-1 text-ellipsis text-size-chat",
            headerPaddingClassName,
          )}
          onClick={() => setIsExpanded((e) => !e)}
        >
          <div className="text-size-chat flex min-w-0 items-center gap-1 text-token-description-foreground/80">
            {isPendingApproval ? null : (
              <span
                className={clsx(
                  "text-token-description-foreground/80 group-hover:text-token-foreground select-text",
                  isApplying ? "loading-shimmer-pure-text" : null,
                )}
              >
                {expandedActionFileLabel ?? actionLabel}
              </span>
            )}
            {expandedActionFileLabel == null ? (
              <Tooltip
                tooltipContent={<span className="font-mono">{path}</span>}
              >
                <button
                  type="button"
                  className="max-w-full cursor-interaction truncate text-start text-token-text-link-foreground select-text hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFile();
                  }}
                >
                  {getPathBasename(path)}
                </button>
              </Tooltip>
            ) : null}
            {showInlineDiffStats && !hideTriggerDiffStats ? (
              <div className="flex items-center gap-1.5">
                <TaskDiffStats
                  className="text-size-chat-sm"
                  linesAdded={diffStats.added}
                  linesRemoved={diffStats.deleted}
                />
                <span className="block size-1.5 rounded-full bg-token-charts-red/70" />
              </div>
            ) : null}
            {diffStats &&
              (diffStats.added > 0 || diffStats.deleted > 0) &&
              change.type !== "delete" && (
                <div className="flex items-center gap-1.5">
                  {!hideTriggerDiffStats ? (
                    <>
                      <TaskDiffStats
                        className="text-size-chat-sm"
                        linesAdded={diffStats.added}
                        linesRemoved={diffStats.deleted}
                      />
                      {change.type === "add" ? (
                        <span className="block size-1.5 rounded-full bg-token-charts-blue/70" />
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}
            <span
              className={clsx(
                "inline-chevron ml-1 text-token-input-placeholder-foreground transition-opacity duration-200 opacity-0 group-hover:opacity-100",
                isExpanded && "opacity-100",
              )}
            >
              <ChevronRightIcon
                className={clsx(
                  "icon-2xs text-current transition-transform duration-200",
                  isExpanded && "rotate-90",
                )}
              />
            </span>
          </div>
          <div className="ml-1 flex items-center gap-1 transition-opacity duration-200" />
        </div>
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
          style={{ pointerEvents: isBodyVisible ? "auto" : "none" }}
        >
          <div ref={contentRef}>
            {unifiedDiff ? (
              <FileDiffContainer
                className="mt-1.5"
                path={path}
                unifiedDiff={unifiedDiff}
                openLocation={diffStats?.openLocation}
                linesAdded={diffStats?.added}
                linesRemoved={diffStats?.deleted}
                onOpenFile={handleOpenFile}
              >
                <DiffCodeSnippet
                  path={path}
                  change={change}
                  unifiedDiff={unifiedDiff}
                  isShortView={isPendingApproval}
                />
              </FileDiffContainer>
            ) : (
              <EmptyContent>
                {change.type === "delete" ? (
                  <FormattedMessage
                    id="codex.patch.change.contentsDeleted"
                    defaultMessage="Contents deleted"
                    description="Label indicating a file has been deleted in the patch summary"
                  />
                ) : (
                  <FormattedMessage
                    id="codex.patch.change.noChanges"
                    defaultMessage="No changes"
                    description="Label indicating no changes in the patch summary"
                  />
                )}
              </EmptyContent>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function PatchApprovalActions({
  conversationId,
  requestId,
}: {
  conversationId: ConversationId;
  requestId: McpRequestId;
}): React.ReactElement {
  const mcpManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);

  return (
    <InProgressFixedContentItem
      action={
        <>
          <Button
            className="!bg-token-charts-green/20 !text-token-charts-green hover:!bg-token-charts-green/30"
            onClick={() =>
              mcpManager.replyWithFileChangeApprovalDecision(
                conversationId,
                requestId,
                "accept",
              )
            }
          >
            <FormattedMessage
              id="patchApprovalRequest.approve"
              defaultMessage="Approve"
              description="Button to approve a patch approval request"
            />
          </Button>
          <Button
            color="outline"
            onClick={() =>
              mcpManager.replyWithFileChangeApprovalDecision(
                conversationId,
                requestId,
                "decline",
              )
            }
          >
            <FormattedMessage
              id="patchApprovalRequest.reject"
              defaultMessage="No"
              description="Reject a patch application"
            />
          </Button>
        </>
      }
    >
      <span className="loading-shimmer-pure-text">
        <FormattedMessage
          id="patchApprovalRequest.waitingForApproval"
          defaultMessage="Waiting for approval to edit files"
          description="Question shown when a patch approval request is about to edit a file"
        />
      </span>
    </InProgressFixedContentItem>
  );
}

export function FileDiffContainer({
  className,
  path,
  unifiedDiff,
  openLocation,
  linesAdded,
  linesRemoved,
  onOpenFile,
  children,
}: {
  className?: string;
  path: string;
  unifiedDiff: string;
  openLocation: { path: string; line: number } | undefined;
  linesAdded?: number;
  linesRemoved?: number;
  onOpenFile: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "border-token-border flex flex-col overflow-hidden rounded-lg border",
        className,
      )}
    >
      <div className="text-size-chat-sm flex items-center justify-between gap-2 border-b border-token-border bg-token-list-hover-background/60 px-2.5 py-0.5 text-token-description-foreground/80">
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip tooltipContent={<span className="font-mono">{path}</span>}>
            <button
              type="button"
              className={clsx(
                "text-token-description-foreground/80 cursor-interaction max-w-full truncate text-start hover:underline",
                !openLocation && "cursor-default no-underline",
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (openLocation) {
                  onOpenFile();
                }
              }}
            >
              {getPathBasename(path)}
            </button>
          </Tooltip>
          {linesAdded != null && linesRemoved != null ? (
            <TaskDiffStats
              className="text-size-chat-sm"
              linesAdded={linesAdded}
              linesRemoved={linesRemoved}
            />
          ) : null}
        </div>
        <CopyButton
          iconOnly
          iconClassName="icon-2xs"
          onCopy={() => {
            void navigator.clipboard.writeText(unifiedDiff);
          }}
        />
      </div>
      <div className="bg-token-editor-background">{children}</div>
    </div>
  );
}

function DiffCodeSnippet({
  path,
  change,
  unifiedDiff,
  isShortView,
}: {
  path: string;
  change: FileChange;
  unifiedDiff: string;
  isShortView?: boolean;
}): React.ReactElement {
  const diffs = useMemo(() => parseDiff(unifiedDiff), [unifiedDiff]);

  if (unifiedDiff) {
    const diff = diffs[0];
    if (diff && !diff.isBinary) {
      return (
        <FileDiff
          className={clsx(
            "composer-diff-simple-line overflow-y-auto",
            isShortView ? "max-h-25" : "max-h-60 ",
          )}
          fileDiff={diff.metadata}
          diffStyle="unified"
          hunkSeparators="simple"
        />
      );
    }
  }

  // Fallback to simple snippet rendering if we fail to parse the diff
  return <FallbackDiffCodeSnippet path={path} change={change} />;
}

function FallbackDiffCodeSnippet({
  path,
  change,
}: {
  path: string;
  change: FileChange;
}): React.ReactElement | null {
  if (change.type === "add") {
    const language = getLanguageFromPath(path);
    return <PatchCodeSnippet content={change.content} language={language} />;
  } else if (change.type === "update") {
    return <PatchCodeSnippet content={change.unified_diff} language="diff" />;
  } else if (change.type === "delete") {
    return (
      <EmptyContent>
        <FormattedMessage
          id="codex.patch.change.contentsDeleted"
          defaultMessage="Contents deleted"
          description="Label indicating a file has been deleted in the patch summary"
        />
      </EmptyContent>
    );
  }

  let changeString: string;
  try {
    changeString = JSON.stringify(change);
  } catch {
    changeString = "<unserializable change>";
  }
  logger.debug("Unknown FileChange type", {
    safe: { path, changeString },
    sensitive: {},
  });
  return null;
}

function PatchCodeSnippet(
  props: React.ComponentProps<typeof CodeSnippet>,
): React.ReactElement {
  const isDark = useIsDark();
  return (
    <CodeSnippet
      {...props}
      showActionBar={false}
      codeClassName="text-size-chat"
      data-theme={isDark ? "dark" : "light"}
      codeContainerClassName="!p-2 max-h-40 vertical-scroll-fade-mask"
      wrapperClassName="rounded-none border-none"
    />
  );
}
