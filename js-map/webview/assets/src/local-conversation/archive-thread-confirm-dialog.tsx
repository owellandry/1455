import type { FormEvent, ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";

export function ArchiveThreadConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="compact"
      contentProps={{
        onOpenAutoFocus: (event) => {
          event.preventDefault();
          const content = event.currentTarget as HTMLElement | null;
          content
            ?.querySelector<HTMLElement>("[data-archive-confirm-button]")
            ?.focus();
        },
        onEscapeKeyDown: () => {
          onOpenChange(false);
        },
      }}
    >
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <DialogBody>
          <DialogSection>
            <DialogHeader
              title={
                <FormattedMessage
                  id="threadHeader.archiveConfirmTitle"
                  defaultMessage="Archive thread?"
                  description="Title for archive thread confirmation dialog"
                />
              }
              subtitle={
                <FormattedMessage
                  id="threadHeader.archiveConfirmSubtitle"
                  defaultMessage="You can find it later in your archived threads."
                  description="Subtitle for archive thread confirmation dialog"
                />
              }
            />
          </DialogSection>
          <DialogSection>
            <DialogFooter>
              <Button
                color="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                <FormattedMessage
                  id="threadHeader.archiveConfirmCancel"
                  defaultMessage="Cancel"
                  description="Cancel button label for archive thread confirmation dialog"
                />
              </Button>
              <Button data-archive-confirm-button color="danger" type="submit">
                <FormattedMessage
                  id="threadHeader.archiveConfirmConfirm"
                  defaultMessage="Archive"
                  description="Confirm button label for archive thread confirmation dialog"
                />
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </form>
    </Dialog>
  );
}
