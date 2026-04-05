import clsx from "clsx";
import type React from "react";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { Dialog, DialogTitle } from "@/components/dialog";
import X from "@/icons/x.svg";

export function ImagePreviewDialog({
  src,
  alt,
  open,
  onOpenChange,
  triggerContent,
  contentMaxWidthClassName,
  closeAriaLabel,
  imageReferrerPolicy,
  onImageError,
}: {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerContent?: React.ReactNode;
  contentMaxWidthClassName?: string;
  closeAriaLabel?: string;
  imageReferrerPolicy?: React.ComponentProps<"img">["referrerPolicy"];
  onImageError?: React.ComponentProps<"img">["onError"];
}): React.ReactElement {
  const intl = useIntl();
  const [previewContainerNode, setPreviewContainerNode] =
    useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(() =>
    typeof window === "undefined" ? null : window.innerHeight,
  );
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const dialogAriaLabel = intl.formatMessage({
    id: "imagePreviewDialog.label",
    defaultMessage: "Image preview",
    description: "Accessible label for the image preview dialog",
  });
  let previewFrameStyle: { width: string; height: string } | undefined =
    undefined;
  if (containerWidth != null && viewportHeight != null && naturalSize != null) {
    const maxHeight = viewportHeight * 0.88;
    const widthRatio = containerWidth / naturalSize.width;
    const heightRatio = maxHeight / naturalSize.height;
    const scale = Math.min(widthRatio, heightRatio);
    if (Number.isFinite(scale) && scale > 0) {
      previewFrameStyle = {
        width: `${naturalSize.width * scale}px`,
        height: `${naturalSize.height * scale}px`,
      };
    }
  }

  useEffect(() => {
    const handleResize = (): void => {
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (previewContainerNode == null) {
      return;
    }
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      setContainerWidth(previewContainerNode.getBoundingClientRect().width);
    });
    observer.observe(previewContainerNode);
    return (): void => {
      observer.disconnect();
    };
  }, [previewContainerNode]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      unstyledContent
      contentClassName={clsx(
        "pointer-events-none w-[90vw] max-w-[90vw] overflow-visible bg-transparent p-0 shadow-none ring-0 backdrop-blur-none rounded-none",
        contentMaxWidthClassName,
      )}
      overlayClassName="bg-black/70"
      showDialogClose={false}
      triggerContent={triggerContent}
      contentProps={{
        "aria-label": dialogAriaLabel,
        "aria-describedby": undefined,
      }}
    >
      <div
        ref={(node) => {
          setPreviewContainerNode(node);
          setContainerWidth(node?.getBoundingClientRect().width ?? null);
        }}
        className="flex w-full items-center justify-center"
        onClick={() => {
          onOpenChange(false);
        }}
      >
        <div
          className="relative"
          style={previewFrameStyle}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <DialogTitle asChild>
            <h2 className="sr-only">{dialogAriaLabel}</h2>
          </DialogTitle>
          <img
            src={src}
            alt={alt}
            className="max-h-[88vh] w-full rounded-lg object-contain"
            referrerPolicy={imageReferrerPolicy}
            onError={onImageError}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth === 0 || naturalHeight === 0) {
                return;
              }
              setNaturalSize({ width: naturalWidth, height: naturalHeight });
            }}
          />
          <button
            type="button"
            className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-token-editor-background/95 text-token-foreground shadow-md ring-1 ring-black/5 backdrop-blur-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-token-focus-border"
            aria-label={
              closeAriaLabel ??
              intl.formatMessage({
                id: "imagePreviewDialog.close",
                defaultMessage: "Close image preview",
                description: "Aria label for closing the image preview dialog",
              })
            }
            onClick={() => {
              onOpenChange(false);
            }}
          >
            <X className="icon-sm" />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
