import clsx from "clsx";
import type {
  CommentInputItem,
  LocalOrRemoteConversationId,
  ReviewFindingComment,
  ReviewFindingCommentStatus,
  SharedObjectValue,
} from "protocol";
import {
  createConversationId,
  createGitCwd,
  stripSlashFromWindowsDrivePath,
} from "protocol";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import {
  buildCodeComment,
  buildDiffCommentKey,
  parsePriorityTitle,
} from "@/code-comment-directives";
import type { CodeReviewFinding } from "@/code-review-schema";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Markdown } from "@/components/markdown";
import { usePlatform } from "@/hooks/use-platform";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { getHostFilePath } from "@/utils/path";
import { useMutationFromVSCode } from "@/vscode-api";

const LOCATION_MESSAGE = {
  id: "codeReviewAssistant.location",
  defaultMessage: "{file}:{start}-{end}",
  description: "Displays where the finding occurs",
};

export function FindingCard({
  finding,
  conversationId,
  showLocation = true,
  buttonSize = "composer",
}: {
  finding: CodeReviewFinding;
  conversationId: LocalOrRemoteConversationId;
  showLocation?: boolean;
  buttonSize?: "composer" | "composerSm";
}): React.ReactElement {
  const openFile = useMutationFromVSCode("open-file");
  const intl = useIntl();
  const { platform } = usePlatform();
  const conversationIdObj = createConversationId(String(conversationId));
  const appServerManager =
    useAppServerManagerForConversationId(conversationIdObj);
  const [modelCommentStore, setModelCommentStore] = useSharedObject(
    "diff_comments_from_model",
  );
  const {
    absolute_file_path: filePath,
    line_range: { start, end },
  } = finding.code_location;
  const conversation = appServerManager.getConversation(conversationIdObj);
  const workspaceRoot = conversation?.cwd ?? null;
  const markdownConversationId = conversation?.id ?? null;
  const displayFilePath = stripSlashFromWindowsDrivePath(filePath);
  const resolvedFilePath =
    workspaceRoot && filePath
      ? getHostFilePath(workspaceRoot, filePath, platform === "windows")
      : filePath;
  const handleOpenFile = (): void => {
    openFile.mutate({
      path: resolvedFilePath,
      line: start,
      cwd: null,
    });
  };

  const comment = buildCodeComment(finding, workspaceRoot);
  const commentKey = comment ? buildDiffCommentKey(comment) : null;
  const modelComments = modelCommentStore?.[conversationId] ?? [];
  const isMatchingCommentKey = (candidate: CommentInputItem): boolean =>
    buildDiffCommentKey(candidate) === commentKey;
  const matchedModelComment =
    commentKey != null
      ? (modelComments.find(isMatchingCommentKey) ?? null)
      : null;
  const status = matchedModelComment?.reviewFindingStatus ?? "added";
  const isDismissed = status === "dismissed";
  const mutedTextClass = isDismissed
    ? "text-token-description-foreground"
    : "text-token-foreground";
  const locationClass = clsx(
    "text-token-description-foreground",
    !isDismissed && "hover:text-token-foreground",
  );

  const updateModelCommentStatus = (
    nextStatus: ReviewFindingCommentStatus,
  ): void => {
    if (!commentKey || !comment) {
      return;
    }
    setModelCommentStore(
      (
        prev: SharedObjectValue<"diff_comments_from_model"> | undefined,
      ): SharedObjectValue<"diff_comments_from_model"> | undefined => {
        const next = { ...prev };
        const prevCurrent = next[conversationId] ?? [];
        let didChange = false;
        const nextCurrent = prevCurrent.map(
          (candidate): ReviewFindingComment => {
            if (buildDiffCommentKey(candidate) !== commentKey) {
              return candidate;
            }
            if (candidate.reviewFindingStatus === nextStatus) {
              return candidate;
            }
            didChange = true;
            return { ...candidate, reviewFindingStatus: nextStatus };
          },
        );
        if (!prevCurrent.some(isMatchingCommentKey)) {
          didChange = true;
          nextCurrent.push({
            ...(comment as ReviewFindingComment),
            reviewFindingStatus: nextStatus,
          });
        }
        if (!didChange) {
          return prev;
        }
        next[conversationId] = nextCurrent;
        return next;
      },
    );
  };

  const actionLabel = isDismissed
    ? {
        id: "codeReviewAssistant.addComment",
        defaultMessage: "Add",
        description:
          "Button that adds a review finding as a comment attachment",
      }
    : {
        id: "codeReviewAssistant.dismiss",
        defaultMessage: "Dismiss",
        description: "Button that dismisses a review finding",
      };
  const actionColor = isDismissed ? "primary" : "ghost";
  const handleAction = (): void => {
    updateModelCommentStatus(isDismissed ? "added" : "dismissed");
  };
  const titleClassName = clsx("min-w-0 flex-1", mutedTextClass);
  const { priority, rest } = parsePriorityTitle(finding.title);
  const titleNode = priority ? (
    <div className={clsx("flex min-w-0 items-center gap-2", titleClassName)}>
      <Badge
        className={clsx(
          getPriorityBadgeClasses(priority, isDismissed),
          "text-xs tabular-nums font-medium uppercase",
        )}
      >
        {priority}
      </Badge>
      <span className="hidden min-w-0 flex-1 [overflow:hidden] text-base font-medium break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:2] @xs:inline-block">
        {rest}
      </span>
    </div>
  ) : (
    <span
      className={clsx(
        "max-w-full break-words text-base font-medium [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] [overflow:hidden]",
        titleClassName,
      )}
    >
      {finding.title}
    </span>
  );

  return (
    <div className="@container flex w-full max-w-full min-w-0 flex-col gap-1 rounded-2xl border border-token-border bg-token-input-background p-3 font-sans whitespace-normal text-token-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {titleNode}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            color={actionColor}
            size={buttonSize}
            disabled={!commentKey}
            onClick={handleAction}
          >
            <FormattedMessage {...actionLabel} />
          </Button>
        </div>
      </div>
      <Markdown
        className={clsx("text-size-chat break-words", mutedTextClass)}
        textSize="text-size-chat"
        conversationId={markdownConversationId}
        cwd={workspaceRoot ? createGitCwd(workspaceRoot) : null}
      >
        {finding.body}
      </Markdown>
      {showLocation ? (
        <button
          type="button"
          className={clsx(
            "flex max-w-full cursor-pointer items-center gap-1 text-left text-sm",
            locationClass,
          )}
          onClick={handleOpenFile}
        >
          <span
            className="inline-block max-w-full min-w-0 truncate"
            title={intl.formatMessage(LOCATION_MESSAGE, {
              file: displayFilePath,
              start,
              end,
            })}
          >
            <FormattedMessage
              id="codeReviewAssistant.location"
              defaultMessage="{file}:{start}-{end}"
              description="Displays where the finding occurs"
              values={{ file: displayFilePath, start, end }}
            />
          </span>
          <ArrowTopRightIcon className="size-[9px] shrink-0" />
        </button>
      ) : null}
    </div>
  );
}

function getPriorityBadgeClasses(priority: string, muted: boolean): string {
  if (muted) {
    return "bg-token-foreground/5 text-token-description-foreground";
  }
  switch (priority) {
    case "P0":
      return "bg-token-charts-red/10 text-token-charts-red";
    case "P1":
      return "bg-token-charts-orange/10 text-token-charts-orange";
    default:
      return "bg-token-foreground/5 text-token-foreground";
  }
}
