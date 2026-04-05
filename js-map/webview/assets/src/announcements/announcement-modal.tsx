import type { ReactElement, ReactNode } from "react";
import { useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Dialog, DialogTitle } from "@/components/dialog";
import XIcon from "@/icons/x.svg";

export function AnnouncementModal({
  body,
  dismissLabel,
  media,
  onDismiss,
  onPrimaryAction,
  primaryActionLabel,
  title,
}: {
  body: ReactNode;
  dismissLabel: ReactNode;
  media: ReactNode;
  onDismiss: () => void;
  onPrimaryAction: () => void | Promise<void>;
  primaryActionLabel: ReactNode;
  title: ReactNode;
}): ReactElement {
  const intl = useIntl();

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onDismiss();
        }
      }}
      contentProps={{ "aria-describedby": undefined }}
      size="feature"
      overlayClassName="backdrop-blur-[2px]"
      contentClassName="w-[min(480px,92vw)] overflow-hidden !rounded-[16px] !bg-token-bg-primary !ring-0 !backdrop-blur-none shadow-[0px_8px_10px_-6px_rgba(0,0,0,0.1),0px_20px_25px_-5px_rgba(0,0,0,0.1)]"
      showDialogClose={false}
    >
      <div className="pointer-events-auto relative flex flex-col gap-10 overflow-hidden pb-10">
        <div className="relative h-[214px] w-full">
          {media}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={intl.formatMessage({
              id: "codexUpgradeModal.close",
              defaultMessage: "Close",
              description: "Aria label for closing the Codex upgrade modal",
            })}
            className="absolute top-[14px] right-[14px] cursor-interaction rounded p-0.5 text-white transition-opacity hover:opacity-80"
          >
            <XIcon className="icon-xs" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-6 px-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <DialogTitle asChild>
              <h2 className="heading-dialog font-semibold">{title}</h2>
            </DialogTitle>
            {body}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              size="large"
              color="secondary"
              onClick={onDismiss}
              className="justify-center"
            >
              {dismissLabel}
            </Button>
            <Button
              size="large"
              color="primary"
              className="justify-center"
              onClick={onPrimaryAction}
            >
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
