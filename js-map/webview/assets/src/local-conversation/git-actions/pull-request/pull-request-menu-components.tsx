import clsx from "clsx";
import type {
  CommentInputItem,
  GhPullRequestCommentAttachment,
} from "protocol";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { Tooltip } from "@/components/tooltip";
import { getCommentLineRange } from "@/diff/diff-file-utils";
import { PullRequestReadonlyComment } from "@/pull-requests/review-page/pull-request-readonly-comment";

type PullRequestMenuAccessory =
  | {
      icon: ReactNode;
      kind: "icon";
    }
  | {
      kind: "pill";
      label: ReactNode;
    }
  | {
      kind: "text";
      label: ReactNode;
    };

type PullRequestChecksPanelGroup = {
  items: Array<{
    action?: {
      disabled?: boolean;
      label: ReactNode;
      onSelect?: () => void;
    };
    description?: ReactNode;
    icon: ReactNode;
    label: ReactNode;
  }>;
};

type PullRequestReviewersPanelGroup = {
  reviewers: Array<{
    accessoryLabel: ReactNode;
    icon: ReactNode;
    label: ReactNode;
  }>;
};

type PullRequestCommentsPanelGroup = {
  comments: Array<{
    action?: PullRequestCommentAction;
    comment: GhPullRequestCommentAttachment;
  }>;
  title: ReactNode;
};

type PullRequestCommentAction = {
  disabled?: boolean;
  label: ReactNode;
  onSelect?: () => void;
};

const MENU_PANEL_CLASS_NAME =
  "bg-token-dropdown-background/90 ring-token-border rounded-xl px-1 pb-1 pt-2 shadow-lg ring-[0.5px] backdrop-blur-sm";
const MENU_SECTION_MAX_HEIGHT_CLASS_NAME = "max-h-[104px] overflow-y-auto";
const MENU_SECTION_TITLE_CLASS_NAME =
  "px-[var(--padding-row-x)] py-1 text-sm text-token-description-foreground";
const MENU_PANEL_ROW_CLASS_NAME = "flex items-center gap-2 px-3 py-1";
const MENU_PANEL_ROW_TEXT_CLASS_NAME =
  "min-w-0 truncate text-[13px] leading-6 tracking-[-0.13px]";
const COMMENTS_PANEL_MAX_HEIGHT_CLASS_NAME = "max-h-[280px] overflow-y-auto";

export function PullRequestMenuPill({
  className,
  label,
}: {
  className?: string;
  label: ReactNode;
}): ReactElement {
  return (
    <span
      className={clsx(
        "inline-flex h-5 shrink-0 items-center rounded-[7px] bg-token-foreground/5 px-1.5 text-[12px] font-medium leading-[22px] tracking-[-0.12px] text-token-description-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function PullRequestMenuActionRowContent({
  icon,
  label,
  rightAdornment = null,
}: {
  icon: ReactNode;
  label: ReactNode;
  rightAdornment?: ReactNode;
}): ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-token-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] leading-6 tracking-[-0.13px] whitespace-nowrap">
        {label}
      </span>
      {rightAdornment != null ? (
        <span className="shrink-0">{rightAdornment}</span>
      ) : null}
    </span>
  );
}

export function PullRequestMenuStatusRowContent({
  accessory = null,
  accessoryPlacement = "end",
  icon,
  label,
}: {
  accessory?: PullRequestMenuAccessory | null;
  accessoryPlacement?: "end" | "start";
  icon: ReactNode;
  label: ReactNode;
}): ReactElement {
  const accessoryContent =
    accessory?.kind === "icon" ? (
      <span className="shrink-0 text-token-description-foreground">
        {accessory.icon}
      </span>
    ) : accessory?.kind === "pill" ? (
      <PullRequestMenuPill label={accessory.label} />
    ) : accessory?.kind === "text" ? (
      <span className="shrink-0 text-[13px] leading-6 tracking-[-0.13px] text-token-description-foreground">
        {accessory.label}
      </span>
    ) : null;

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-token-foreground">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] leading-6 tracking-[-0.13px] whitespace-nowrap">
          {label}
        </span>
        {accessoryPlacement === "start" ? accessoryContent : null}
      </div>
      {accessoryPlacement === "end" ? accessoryContent : null}
    </div>
  );
}

export function PullRequestChecksPanel({
  groups,
  title,
}: {
  groups: Array<PullRequestChecksPanelGroup>;
  title: ReactNode;
}): ReactElement {
  return (
    <div className={clsx(MENU_PANEL_CLASS_NAME, "max-w-[420px]")}>
      <div className="flex flex-col">
        <div className={MENU_SECTION_TITLE_CLASS_NAME}>{title}</div>
        <div
          className={clsx("flex flex-col", MENU_SECTION_MAX_HEIGHT_CLASS_NAME)}
        >
          {groups
            .flatMap((group) => group.items)
            .map((item, itemIndex) => (
              <div key={itemIndex} className={MENU_PANEL_ROW_CLASS_NAME}>
                <div className="flex w-full min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0 text-token-foreground">
                      {item.icon}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={clsx(
                          MENU_PANEL_ROW_TEXT_CLASS_NAME,
                          "text-token-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.description != null ? (
                        <span
                          className={clsx(
                            MENU_PANEL_ROW_TEXT_CLASS_NAME,
                            "text-token-description-foreground",
                          )}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {item.action ? (
                    <button
                      className="inline-flex h-5 shrink-0 cursor-interaction items-center rounded-[7px] bg-token-foreground/5 px-1.5 text-[12px] leading-[22px] font-medium tracking-[-0.12px] text-token-description-foreground enabled:hover:bg-token-foreground/10 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={item.action.disabled}
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        item.action?.onSelect?.();
                      }}
                    >
                      {item.action.label}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export function PullRequestReviewersPanel({
  groups,
  title,
}: {
  groups: Array<PullRequestReviewersPanelGroup>;
  title: ReactNode;
}): ReactElement {
  return (
    <div className={clsx(MENU_PANEL_CLASS_NAME, "max-w-[220px]")}>
      <div className="flex flex-col">
        <div className={MENU_SECTION_TITLE_CLASS_NAME}>{title}</div>
        <div
          className={clsx("flex flex-col", MENU_SECTION_MAX_HEIGHT_CLASS_NAME)}
        >
          {groups
            .flatMap((group) => group.reviewers)
            .map((reviewer, reviewerIndex) => (
              <Tooltip
                key={reviewerIndex}
                align="start"
                side="right"
                tooltipContent={reviewer.accessoryLabel}
              >
                <div className={MENU_PANEL_ROW_CLASS_NAME}>
                  <span className="shrink-0 text-token-foreground">
                    {reviewer.icon}
                  </span>
                  <span
                    className={clsx(
                      MENU_PANEL_ROW_TEXT_CLASS_NAME,
                      "text-token-foreground",
                    )}
                  >
                    {reviewer.label}
                  </span>
                </div>
              </Tooltip>
            ))}
        </div>
      </div>
    </div>
  );
}

export function PullRequestCommentsPanel({
  groups,
}: {
  groups: Array<PullRequestCommentsPanelGroup>;
}): ReactElement {
  return (
    <div
      className={clsx(
        MENU_PANEL_CLASS_NAME,
        COMMENTS_PANEL_MAX_HEIGHT_CLASS_NAME,
        "w-[420px] px-4 py-3",
      )}
    >
      <div className="flex flex-col gap-4">
        {groups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={clsx(
              "flex flex-col gap-1",
              groupIndex > 0 && "border-token-border/60 border-t pt-4",
            )}
          >
            <div className="text-[13px] leading-6 font-medium tracking-[-0.13px] text-token-description-foreground">
              {group.title}
            </div>
            <div className="flex flex-col gap-2">
              {group.comments.map(({ action, comment }, commentIndex) => {
                return (
                  <div key={commentIndex} className="flex flex-col">
                    <PullRequestReadonlyComment
                      comment={comment}
                      metadataAccessory={buildPullRequestCommentAction(action)}
                      metadataTooltipContent={getCommentLocationTooltip(
                        comment,
                      )}
                      surface="card"
                      url={comment.url ?? null}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildPullRequestCommentAction(
  action: PullRequestCommentAction | undefined,
): ReactElement | null {
  if (action == null) {
    return null;
  }

  return (
    <button
      className="inline-flex h-5 shrink-0 cursor-interaction items-center rounded-[7px] bg-token-foreground/5 px-1.5 text-[12px] leading-[22px] font-medium tracking-[-0.12px] text-token-description-foreground enabled:hover:bg-token-foreground/10 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={action.disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        action.onSelect?.();
      }}
      type="button"
    >
      {action.label}
    </button>
  );
}

function getCommentLocationTooltip(comment: CommentInputItem): ReactNode {
  if (comment.position?.path == null) {
    return null;
  }
  const { startLine, endLine } = getCommentLineRange(comment);
  const lineLabel =
    startLine === endLine ? (
      <FormattedMessage
        id="localConversation.pullRequest.actions.comments.line"
        defaultMessage="Line {line}"
        description="Line label shown in the compact review comment tooltip inside the comments flyout"
        values={{ line: endLine }}
      />
    ) : (
      <FormattedMessage
        id="localConversation.pullRequest.actions.comments.lines"
        defaultMessage="Lines {startLine}-{endLine}"
        description="Line range label shown in the compact review comment tooltip inside the comments flyout"
        values={{ endLine, startLine }}
      />
    );

  return (
    <div className="flex max-w-xs flex-col gap-0.5">
      <span
        className="truncate font-mono text-xs leading-4"
        title={comment.position.path}
      >
        {comment.position.path}
      </span>
      {comment.position.line != null ? (
        <span className="text-xs leading-4 text-token-description-foreground">
          {lineLabel}
        </span>
      ) : null}
    </div>
  );
}
