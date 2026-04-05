import clsx from "clsx";
import type React from "react";
import { useState } from "react";
import { useIntl } from "react-intl";

import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { Tooltip } from "@/components/tooltip";
import X from "@/icons/x.svg";

export function ImageAttachment({
  src,
  filename,
  alt = "Attachment image",
  onRemove,
  loading = false,
  previewEnabled = true,
}: {
  src: string;
  filename?: string;
  alt?: string;
  onRemove?: () => void;
  loading?: boolean;
  previewEnabled?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const displayName =
    filename ??
    intl.formatMessage({
      id: "imageAttachment.defaultName",
      defaultMessage: "image",
      description: "Default filename label for image attachment",
    });

  const pillContent = (
    <div
      className={clsx(
        "text-token-foreground bg-token-dropdown-background border-token-border group relative inline-flex max-w-[150px] items-center gap-1 rounded-full border px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-token-focus-border",
        previewEnabled
          ? "cursor-pointer hover:bg-token-menu-background"
          : "cursor-default",
      )}
      role={previewEnabled ? "button" : undefined}
      tabIndex={previewEnabled ? 0 : undefined}
      onKeyDown={
        previewEnabled
          ? (event): void => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsPreviewOpen(true);
              }
            }
          : undefined
      }
    >
      <span className="relative flex-shrink-0">
        <img
          src={src}
          alt={alt}
          className="h-4 w-4 rounded-sm bg-white object-cover shadow-md"
        />
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/20">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
          </span>
        )}
      </span>
      <span className="relative min-w-0 flex-1">
        <Tooltip tooltipContent={displayName}>
          <span
            className={clsx(
              "block truncate pr-2 text-sm transition-[padding] duration-200",
              onRemove && "group-focus-within:pr-4 group-hover:pr-4",
            )}
          >
            {displayName}
          </span>
        </Tooltip>
        {onRemove && (
          <button
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove();
            }}
            className={clsx(
              "cursor-interaction absolute bottom-0 right-0 top-0 flex items-center justify-center opacity-0 transition-opacity duration-200",
              "pointer-events-none group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
            )}
            aria-label={intl.formatMessage(
              {
                id: "imageAttachment.removeAriaLabel",
                defaultMessage: "Remove {filename}",
                description:
                  "Aria label for the remove image attachment button",
              },
              { filename: displayName },
            )}
          >
            <X className="icon-2xs text-token-foreground" />
          </button>
        )}
      </span>
    </div>
  );

  if (!previewEnabled) {
    return pillContent;
  }

  return (
    <ImagePreviewDialog
      src={src}
      alt={alt}
      open={isPreviewOpen}
      onOpenChange={setIsPreviewOpen}
      triggerContent={pillContent}
    />
  );
}
