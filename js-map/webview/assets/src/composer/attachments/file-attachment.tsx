import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import Document from "@/icons/document.svg";

import { ComposerAttachmentPill } from "./composer-attachment-pill";

export function FileAttachment({
  filename,
  onRemove,
  onRemoveAriaLabel,
  onClick,
  lineInfo,
  Icon = Document,
}: {
  filename: string;
  onRemove?: () => void;
  onRemoveAriaLabel?: string;
  onClick?: () => void;
  lineInfo?: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}): React.ReactElement {
  const intl = useIntl();
  return (
    <ComposerAttachmentPill
      Icon={Icon}
      onClick={onClick}
      onRemove={onRemove}
      onRemoveAriaLabel={
        onRemoveAriaLabel ??
        (onRemove
          ? intl.formatMessage(
              {
                id: "fileAttachment.removeAriaLabel",
                defaultMessage: "Remove {filename}",
                description: "Aria label for the remove file attachment button",
              },
              { filename },
            )
          : undefined)
      }
    >
      <span className="flex max-w-full min-w-0 items-center gap-1">
        <span className="truncate">{filename}</span>
        {lineInfo ? (
          <span className="shrink-0 font-normal text-token-input-placeholder-foreground">
            <FormattedMessage
              id="fileAttachment.lineInfo"
              defaultMessage="{lineInfo}"
              description="Line range or number for a file attachment, no surrounding punctuation"
              values={{ lineInfo }}
            />
          </span>
        ) : null}
      </span>
    </ComposerAttachmentPill>
  );
}
