import type React from "react";
import { useState } from "react";
import { useIntl } from "react-intl";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import CommentIcon from "@/icons/comment.svg";

import { FileAttachment } from "./file-attachment";

export function CommentAttachments({
  numComments,
  onRemove,
  tooltipContent,
}: {
  numComments: number;
  onRemove?: () => void;
  tooltipContent?: React.ReactNode;
}): React.ReactElement {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const commentLabel = intl.formatMessage(
    {
      id: "commentAttachments.numComments",
      defaultMessage: "{count, plural, one {# comment} other {# comments}}",
      description: "Number of comments in the comment attachment",
    },
    { count: numComments },
  );

  if (tooltipContent == null) {
    return (
      <FileAttachment
        filename={commentLabel}
        Icon={CommentIcon}
        onRemove={onRemove}
        onRemoveAriaLabel={
          onRemove
            ? intl.formatMessage({
                id: "commentAttachments.removeAriaLabel",
                defaultMessage: "Remove comments attachment",
                description: "Aria label for removing the comment attachment",
              })
            : undefined
        }
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="inline-flex max-w-[240px] cursor-interaction items-center gap-1 rounded-full border border-token-border bg-token-dropdown-background px-2 py-1.5 text-sm text-token-foreground hover:bg-token-menu-background"
        onMouseEnter={() => {
          setOpen(true);
        }}
        onMouseLeave={() => {
          setOpen(false);
        }}
      >
        <CommentIcon className="icon-2xs flex-shrink-0 text-token-input-placeholder-foreground" />
        <span className="min-w-0 flex-1 truncate pr-1 text-sm font-medium">
          {commentLabel}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={0}
        className="w-96 gap-2"
        style={{
          maxHeight:
            "min(20rem, var(--radix-popover-content-available-height), calc(100vh - 16px))",
        }}
        onMouseEnter={() => {
          setOpen(true);
        }}
        onMouseLeave={() => {
          setOpen(false);
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        {tooltipContent}
      </PopoverContent>
    </Popover>
  );
}
