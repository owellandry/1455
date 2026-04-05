import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/dialog-layout";
import BranchIcon from "@/icons/branch.svg";

import { aSkipForkFromOlderTurnConfirm } from "./fork-from-older-turn-dialog-state";

export function ForkFromOlderTurnDialog({
  isSubmitting,
  onClose,
  onFork,
  open,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onFork: () => void;
  open: boolean;
}): ReactElement {
  const [
    skipFutureForkFromOlderTurnConfirm,
    setSkipFutureForkFromOlderTurnConfirm,
  ] = useAtom(aSkipForkFromOlderTurnConfirm);

  return (
    <Dialog
      open={open}
      showDialogClose={false}
      size="compact"
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogBody className="gap-4">
        <DialogHeader
          icon={<BranchIcon className="icon-sm text-token-foreground" />}
          title={
            <FormattedMessage
              id="localConversation.forkFromOlderTurnDialog.title"
              defaultMessage="Fork from earlier message?"
              description="Title for the confirmation dialog shown when forking from a non-latest user message"
            />
          }
          subtitle={
            <FormattedMessage
              id="localConversation.forkFromOlderTurnDialog.subtitle"
              defaultMessage="This keeps your current files and worktree state as-is. If later turns changed the filesystem, the new fork may not match what is currently on disk."
              description="Subtitle for the confirmation dialog shown when forking from a non-latest user message"
            />
          }
        />
        <label className="relative flex items-center gap-3">
          <Checkbox
            checked={skipFutureForkFromOlderTurnConfirm}
            disabled={isSubmitting}
            onCheckedChange={setSkipFutureForkFromOlderTurnConfirm}
          />
          <span className="text-sm text-token-foreground">
            <FormattedMessage
              id="localConversation.forkFromOlderTurnDialog.skipFuture"
              defaultMessage="Don't show this again"
              description="Checkbox label to skip future older-turn fork confirmations"
            />
          </span>
        </label>
        <DialogFooter>
          <Button color="secondary" disabled={isSubmitting} onClick={onClose}>
            <FormattedMessage
              id="localConversation.forkFromOlderTurnDialog.cancel"
              defaultMessage="Cancel"
              description="Cancel button label for the older-turn fork confirmation dialog"
            />
          </Button>
          <Button color="primary" loading={isSubmitting} onClick={onFork}>
            <FormattedMessage
              id="localConversation.forkFromOlderTurnDialog.fork"
              defaultMessage="Fork"
              description="Confirm button label for the older-turn fork confirmation dialog"
            />
          </Button>
        </DialogFooter>
      </DialogBody>
    </Dialog>
  );
}
