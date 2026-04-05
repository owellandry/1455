// oxlint-disable-next-line no-restricted-imports
import * as DialogPrimitive from "@radix-ui/react-dialog";
import clsx from "clsx";

import "./dialog.css";
import type React from "react";
import { useLayoutEffect, useRef } from "react";

import XIcon from "@/icons/x.svg";

import { dismissAllTooltips } from "./tooltip";

type DialogSize =
  | "narrow"
  | "feature"
  | "compact"
  | "default"
  | "wide"
  | "xwide"
  | "xxwide"
  | "editor";

export const DIALOG_OVERLAY_CLASS_NAME =
  "extension:bg-token-editor-background/80 electron:bg-[#00000022] codex-dialog-overlay fixed inset-0 z-50";

function getDialogSizeClassName(size: DialogSize | undefined): string {
  if (size === "narrow") {
    return "w-[380px]";
  }
  if (size === "feature") {
    return "w-[400px]";
  }
  if (size === "compact") {
    return "w-[420px]";
  }
  if (size === "wide") {
    return "w-[600px]";
  }
  if (size === "xwide") {
    return "w-[680px]";
  }
  if (size === "xxwide") {
    return "w-[800px]";
  }
  if (size === "editor") {
    return "w-[600px] h-[720px] max-w-full max-h-full";
  }
  return "w-[520px]";
}

export function Dialog(
  props: DialogPrimitive.DialogProps & {
    triggerContent?: React.ReactNode;
    triggerAsChild?: boolean;
    triggerRef?: React.Ref<HTMLButtonElement>;
    contentClassName?: string;
    contentProps?: Omit<DialogPrimitive.DialogContentProps, "children">;
    overlayClassName?: string;
    portalContainer?: HTMLElement | null;
    showDialogClose?: boolean;
    shouldIgnoreClickOutside?: boolean;
    unstyledContent?: boolean;
    size?: DialogSize;
  },
): React.ReactElement {
  const {
    children,
    triggerContent,
    triggerAsChild = true,
    triggerRef,
    contentClassName,
    contentProps,
    overlayClassName,
    portalContainer,
    showDialogClose = true,
    shouldIgnoreClickOutside = false,
    unstyledContent = false,
    size = "default",
    ...rest
  } = props;
  const handleOpenChange = (open: boolean): void => {
    if (open) {
      dismissAllTooltips();
    }
    props.onOpenChange?.(open);
  };

  return (
    <DialogPrimitive.Root {...rest} onOpenChange={handleOpenChange}>
      {triggerContent && (
        <DialogTrigger asChild={triggerAsChild} triggerRef={triggerRef}>
          {triggerContent}
        </DialogTrigger>
      )}
      <DialogContent
        contentClassName={contentClassName}
        overlayClassName={overlayClassName}
        portalContainer={portalContainer}
        showDialogClose={showDialogClose}
        shouldIgnoreClickOutside={shouldIgnoreClickOutside}
        unstyledContent={unstyledContent}
        size={size}
        {...contentProps}
      >
        {children}
      </DialogContent>
    </DialogPrimitive.Root>
  );
}

export function DialogTitle(
  props: DialogPrimitive.DialogTitleProps,
): React.ReactElement {
  return <DialogPrimitive.Title {...props} />;
}

export function DialogDescription(
  props: DialogPrimitive.DialogDescriptionProps,
): React.ReactElement {
  return <DialogPrimitive.Description {...props} />;
}

function DialogTrigger({
  asChild = true,
  triggerRef,
  ...rest
}: DialogPrimitive.DialogTriggerProps & {
  asChild?: boolean;
  triggerRef?: React.Ref<HTMLButtonElement>;
}): React.ReactElement {
  return (
    <DialogPrimitive.Trigger ref={triggerRef} asChild={asChild} {...rest} />
  );
}

function DialogContent({
  children,
  contentClassName,
  overlayClassName,
  portalContainer,
  showDialogClose = true,
  shouldIgnoreClickOutside = false,
  unstyledContent = false,
  size,
  ...rest
}: DialogPrimitive.DialogContentProps & {
  contentClassName?: string;
  overlayClassName?: string;
  portalContainer?: HTMLElement | null;
  showDialogClose?: boolean;
  shouldIgnoreClickOutside?: boolean;
  unstyledContent?: boolean;
  size?: DialogSize;
}): React.ReactElement {
  const { className, onPointerDownOutside, ...contentRest } = rest;
  const baseContentClassName = clsx(
    "codex-dialog left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none",
    portalContainer != null ? "absolute" : "fixed",
  );
  const styledContentClassName =
    "bg-token-dropdown-background/90 text-token-foreground ring-token-border max-w-[92vw] rounded-3xl ring-[0.5px] ring-token-border shadow-lg  backdrop-blur-xl";
  const sizeClassName = getDialogSizeClassName(size);
  const contentRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hasExplicitHeight =
    contentRest.style?.height != null ||
    /\bh-(?!auto\b)[^\s]+/.test(contentClassName ?? "") ||
    /\bh-(?!auto\b)[^\s]+/.test(className ?? "");
  const shouldAnimateHeight =
    !unstyledContent && size !== "editor" && !hasExplicitHeight;

  useLayoutEffect(() => {
    if (!shouldAnimateHeight) {
      return;
    }
    const contentElement = contentRef.current;
    const bodyElement = bodyRef.current;
    if (
      contentElement == null ||
      bodyElement == null ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    let frameId: number | null = null;
    let readyFrameId: number | null = null;
    let lastHeight = -1;
    let heightReady = false;

    const applyHeight = (nextHeight: number): void => {
      if (!Number.isFinite(nextHeight)) {
        return;
      }
      if (Math.abs(nextHeight - lastHeight) < 0.5) {
        return;
      }
      lastHeight = nextHeight;
      contentElement.style.setProperty(
        "--dialog-content-height",
        `${nextHeight}px`,
      );
      contentElement.style.height = "var(--dialog-content-height)";
      if (!heightReady) {
        if (readyFrameId != null) {
          cancelAnimationFrame(readyFrameId);
        }
        readyFrameId = requestAnimationFrame(() => {
          heightReady = true;
          contentElement.dataset.dialogHeightReady = "true";
        });
      }
    };

    const measure = (): void => {
      const nextHeight = bodyElement.offsetHeight || bodyElement.scrollHeight;
      applyHeight(nextHeight);
    };

    const scheduleMeasure = (): void => {
      if (frameId != null) {
        return;
      }
      frameId = requestAnimationFrame(() => {
        frameId = null;
        measure();
      });
    };

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(bodyElement);

    return (): void => {
      observer.disconnect();
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
      if (readyFrameId != null) {
        cancelAnimationFrame(readyFrameId);
      }
      contentElement.style.removeProperty("--dialog-content-height");
      contentElement.style.height = "";
      delete contentElement.dataset.dialogHeightReady;
    };
  }, [shouldAnimateHeight]);
  return (
    <DialogPrimitive.Portal container={portalContainer ?? undefined}>
      <DialogPrimitive.Overlay
        className={clsx(DIALOG_OVERLAY_CLASS_NAME, overlayClassName)}
      />
      <DialogPrimitive.Content
        ref={contentRef}
        className={clsx(
          baseContentClassName,
          !unstyledContent && styledContentClassName,
          !unstyledContent && sizeClassName,
          shouldAnimateHeight &&
            "data-[dialog-height-ready=true]:transition-[height] data-[dialog-height-ready=true]:duration-200 data-[dialog-height-ready=true]:ease-out",
          contentClassName,
          className,
        )}
        onPointerDownOutside={(event) => {
          if (shouldIgnoreClickOutside) {
            event.preventDefault();
          }
          onPointerDownOutside?.(event);
        }}
        {...contentRest}
      >
        {shouldAnimateHeight ? <div ref={bodyRef}>{children}</div> : children}
        {showDialogClose && (
          <DialogPrimitive.Close
            className="no-drag absolute top-4 right-4 cursor-interaction rounded p-1 leading-none text-token-foreground/80 hover:bg-token-toolbar-hover-background focus:ring-1 focus:ring-token-focus-border focus:outline-none"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <XIcon className="icon-xs" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
