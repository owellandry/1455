import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

import { Button } from "@/components/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/dialog";
import {
  DIALOG_FOOTER_COMPACT,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";

export function ProseModal({
  icon,
  iconClassName,
  iconBackgroundClassName,
  title,
  titleText,
  titleClassName,
  description,
  descriptionText,
  descriptionClassName,
  children,
  isOpen,
  onOpenChange,
  footer,
  loading,
  error,
  className,
  loadingMessage,
  errorMessage,
  closeLabel,
  scrollFade = true,
  footerSectionClassName,
}: {
  icon?: ReactElement | null;
  iconClassName?: string;
  iconBackgroundClassName?: string;
  title: ReactNode;
  titleText?: string;
  titleClassName?: string;
  description?: ReactNode;
  descriptionText?: string;
  descriptionClassName?: string;
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (nextValue: boolean) => void;
  footer?: ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
  loadingMessage?: ReactNode;
  errorMessage?: ReactNode;
  closeLabel?: ReactNode;
  scrollFade?: boolean;
  footerSectionClassName?: string;
}): ReactElement {
  return (
    <Dialog
      contentClassName={clsx("!p-0", className)}
      open={isOpen}
      onOpenChange={onOpenChange}
      size="editor"
    >
      <DialogBody size="full">
        {titleText != null ? (
          <DialogTitle className="sr-only">{titleText}</DialogTitle>
        ) : null}
        {descriptionText != null ? (
          <DialogDescription className="sr-only">
            {descriptionText}
          </DialogDescription>
        ) : null}
        <DialogSection>
          <DialogHeader
            icon={icon}
            iconClassName={clsx("h-12 w-12 rounded-xl !p-0", iconClassName)}
            iconBackgroundClassName={clsx(
              "bg-transparent",
              iconBackgroundClassName,
            )}
            title={title}
            subtitle={description}
            titleClassName={clsx("text-token-foreground", titleClassName)}
            subtitleClassName={clsx(
              "text-token-text-secondary",
              descriptionClassName,
            )}
          />
        </DialogSection>
        <DialogSection className="min-h-0 flex-1">
          <div
            className={clsx(
              "h-full overflow-y-auto opacity-80",
              scrollFade ? "vertical-scroll-fade-mask" : null,
            )}
          >
            {loading ? (
              <div className="text-token-text-secondary">{loadingMessage}</div>
            ) : error ? (
              <div className="text-token-text-secondary">
                {errorMessage ?? error}
              </div>
            ) : (
              children
            )}
          </div>
        </DialogSection>
        <DialogSection className={footerSectionClassName}>
          <DialogFooter className={DIALOG_FOOTER_COMPACT}>
            {footer ? (
              footer
            ) : (
              <Button
                color="ghost"
                size="toolbar"
                onClick={() => onOpenChange(false)}
              >
                {closeLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
