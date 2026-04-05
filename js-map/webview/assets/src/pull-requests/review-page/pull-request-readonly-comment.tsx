import clsx from "clsx";
import type { CommentInputItem } from "protocol";
import type { ReactElement, ReactNode } from "react";
import { useIntl } from "react-intl";

import { Markdown } from "@/components/markdown";
import { prepareGitHubMarkdown } from "@/components/markdown/github-details";
import { Tooltip } from "@/components/tooltip";
import { getCommentText } from "@/diff/diff-file-utils";
import LinkExternalIcon from "@/icons/link-external.svg";
import { formatShortLocalDateTime } from "@/utils/format-short-local-date-time";

import { getGitHubAvatarUrl } from "./github-avatar-url";

export function PullRequestReadonlyComment({
  authorLogin,
  body,
  comment,
  className,
  createdAt,
  metadataAccessory,
  metadataTooltipContent,
  url,
  surface = "plain",
}: {
  authorLogin?: string | null;
  body?: string;
  comment?: CommentInputItem;
  className?: string;
  createdAt?: string | null;
  metadataAccessory?: ReactNode;
  metadataTooltipContent?: ReactNode;
  url?: string | null;
  surface?: "card" | "plain";
}): ReactElement {
  const intl = useIntl();
  const { authorLogin: parsedAuthorLogin, body: parsedBody } =
    comment == null
      ? {
          authorLogin: null,
          body: body ?? "",
        }
      : getReadonlyCommentAuthorAndBody(comment);
  const displayAuthorLogin = authorLogin ?? parsedAuthorLogin;
  const displayBody = comment == null ? (body ?? "") : parsedBody;
  const authorLabel =
    displayAuthorLogin ??
    intl.formatMessage({
      id: "pullRequestsPage.detail.commentUnknownAuthor",
      defaultMessage: "Unknown author",
      description:
        "Fallback author label for PR timeline comments on the detail page",
    });
  const authorAvatarUrl =
    displayAuthorLogin != null
      ? getGitHubAvatarUrl(displayAuthorLogin, 48)
      : null;
  const shouldShowHeader = displayAuthorLogin != null || createdAt != null;
  const isCardSurface = surface === "card";
  const metadataIdentity = (
    <div className="flex min-w-0 items-center gap-2.5">
      {authorAvatarUrl == null ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-token-border/20 bg-token-bg-primary/60 text-[11px] font-semibold text-token-foreground">
          {authorLabel.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <img
          alt={intl.formatMessage(
            {
              id: "pullRequestsPage.detail.commentAuthorAvatarAlt",
              defaultMessage: "{author} avatar",
              description:
                "Alt text for a pull request comment author's avatar on the detail page",
            },
            { author: authorLabel },
          )}
          className="size-6 shrink-0 rounded-full border border-token-border/14 object-cover"
          src={authorAvatarUrl}
        />
      )}
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[13px] font-medium text-token-foreground">
          {authorLabel}
        </span>
        {url != null ? (
          <Tooltip
            delayDuration={250}
            tooltipContent={intl.formatMessage({
              id: "pullRequestsPage.detail.viewCommentOnGitHub",
              defaultMessage: "View comment on GitHub",
              description:
                "Tooltip for the external link that opens a pull request comment on GitHub",
            })}
          >
            <a
              aria-label={intl.formatMessage({
                id: "pullRequestsPage.detail.openCommentOnGitHub",
                defaultMessage: "Open comment on GitHub",
                description:
                  "Accessible label for a link that opens a pull request comment on GitHub",
              })}
              className="shrink-0 text-token-description-foreground transition-colors hover:text-token-foreground"
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              <LinkExternalIcon className="icon-xs" />
            </a>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
  const metadataRow = shouldShowHeader ? (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-3",
        isCardSurface
          ? "border-b border-token-border/12 bg-token-bg-primary/42 px-3 py-2.5"
          : "mb-3",
      )}
    >
      {metadataTooltipContent != null ? (
        <Tooltip delayDuration={250} tooltipContent={metadataTooltipContent}>
          {metadataIdentity}
        </Tooltip>
      ) : (
        metadataIdentity
      )}
      <div className="flex items-center gap-2">
        {createdAt != null ? (
          <div className="text-[12px] text-token-description-foreground">
            {formatShortLocalDateTime(createdAt)}
          </div>
        ) : null}
        {metadataAccessory}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={clsx(
        isCardSurface &&
          "overflow-hidden rounded-[12px] border border-token-border/14 bg-token-bg-primary/34",
        className,
      )}
    >
      {metadataRow}
      <Markdown
        className={clsx(
          "text-size-chat break-words text-token-foreground [&_details]:mt-3 [&_details]:rounded-[14px] [&_details]:border [&_details]:border-token-border/16 [&_details]:bg-token-bg-primary/28 [&_details]:px-3.5 [&_details]:py-3 [&_p]:leading-6 [&_summary]:cursor-pointer [&_summary]:font-medium [&_summary]:text-token-foreground",
          isCardSurface ? "px-3 py-2.5" : undefined,
        )}
        cwd={null}
        textSize="text-size-chat"
        allowBasicHtml
      >
        {prepareGitHubMarkdown(displayBody)}
      </Markdown>
    </div>
  );
}

function getReadonlyCommentAuthorAndBody(comment: CommentInputItem): {
  authorLogin: string | null;
  body: string;
} {
  const body = getCommentText(comment);
  const match = body.match(/^@([A-Za-z0-9-]+):\s*\n?/);
  if (match == null) {
    return {
      authorLogin: null,
      body,
    };
  }

  return {
    authorLogin: match[1] ?? null,
    body: body.slice(match[0].length).trimStart(),
  };
}
