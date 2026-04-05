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

export function ProjectArchiveThreadsDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
  projectLabel,
  isArchiving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
  projectLabel: string;
  isArchiving: boolean;
}): ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isArchiving && !nextOpen) {
          return;
        }
        onOpenChange(nextOpen);
      }}
      size="compact"
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
                  id="sidebarElectron.archiveProjectThreads.confirmTitle"
                  defaultMessage="{count, plural, one {Archive # thread?} other {Archive # threads?}}"
                  description="Confirmation title for archiving all selected threads in a project"
                  values={{ count }}
                />
              }
              subtitle={
                <FormattedMessage
                  id="sidebarElectron.archiveProjectThreads.confirmSubtitle"
                  defaultMessage="This will archive the threads in {projectLabel}. You can find them later in your archived threads."
                  description="Confirmation subtitle for archiving project threads"
                  values={{ projectLabel }}
                />
              }
            />
          </DialogSection>
          <DialogSection>
            <DialogFooter>
              <Button
                color="ghost"
                type="button"
                disabled={isArchiving}
                onClick={() => onOpenChange(false)}
              >
                <FormattedMessage
                  id="sidebarElectron.archiveProjectThreads.cancel"
                  defaultMessage="Cancel"
                  description="Cancel button label for archiving project threads"
                />
              </Button>
              <Button color="danger" type="submit" disabled={isArchiving}>
                {isArchiving ? (
                  <FormattedMessage
                    id="sidebarElectron.archiveProjectThreads.archiving"
                    defaultMessage="Archiving..."
                    description="In-progress button label while archiving project threads"
                  />
                ) : (
                  <FormattedMessage
                    id="sidebarElectron.archiveProjectThreads.confirm"
                    defaultMessage="Archive all"
                    description="Confirm button label for archiving project threads"
                  />
                )}
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </form>
    </Dialog>
  );
}
