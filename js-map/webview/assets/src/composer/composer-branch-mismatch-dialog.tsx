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

export function ComposerBranchMismatchDialog({
  checkedOutBranchName,
  isSubmitting,
  onClose,
  onContinue,
  open,
  setSkipFutureBranchMismatchPrompt,
  skipFutureBranchMismatchPrompt,
  storedThreadBranchName,
}: {
  checkedOutBranchName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onContinue: () => void;
  open: boolean;
  setSkipFutureBranchMismatchPrompt: (checked: boolean) => void;
  skipFutureBranchMismatchPrompt: boolean;
  storedThreadBranchName: string;
}): ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      size="compact"
    >
      <DialogBody
        as="form"
        className="gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSubmitting) {
            onContinue();
          }
        }}
      >
        <DialogHeader
          icon={<BranchIcon className="icon-sm text-token-foreground" />}
          title={
            <FormattedMessage
              id="composer.branchMismatchDialog.title"
              defaultMessage="Continue on a different branch?"
              description="Title for the dialog shown when the checked out branch differs from the thread branch"
            />
          }
          subtitle={
            <FormattedMessage
              id="composer.branchMismatchDialog.subtitle"
              defaultMessage="This thread was previously on {threadBranch}. Please confirm you want to continue on {checkedOutBranch}."
              description="Body text for the dialog shown when the checked out branch differs from the thread branch"
              values={{
                checkedOutBranch: (
                  <code
                    key="checked-out-branch"
                    className="inline rounded-md border border-token-border bg-token-input-background px-1.5 py-0.5 font-mono text-[12px] text-token-foreground"
                  >
                    {checkedOutBranchName}
                  </code>
                ),
                threadBranch: (
                  <code
                    key="thread-branch"
                    className="inline rounded-md border border-token-border bg-token-input-background px-1.5 py-0.5 font-mono text-[12px] text-token-foreground"
                  >
                    {storedThreadBranchName}
                  </code>
                ),
              }}
            />
          }
        />
        <label className="relative flex items-center gap-3">
          <Checkbox
            checked={skipFutureBranchMismatchPrompt}
            onCheckedChange={setSkipFutureBranchMismatchPrompt}
          />
          <span className="text-sm text-token-foreground">
            <FormattedMessage
              id="composer.branchMismatchDialog.skipFuture"
              defaultMessage="Don't show this again"
              description="Checkbox label to skip future branch mismatch confirmations"
            />
          </span>
        </label>
        <DialogFooter>
          <Button color="secondary" onClick={onClose}>
            <FormattedMessage
              id="composer.branchMismatchDialog.cancel"
              defaultMessage="Cancel"
              description="Cancel button label for the branch mismatch confirmation dialog"
            />
          </Button>
          <Button
            autoFocus
            color="primary"
            loading={isSubmitting}
            type="submit"
          >
            <FormattedMessage
              id="composer.branchMismatchDialog.continue"
              defaultMessage="Continue"
              description="Continue button label for the branch mismatch confirmation dialog"
            />
          </Button>
        </DialogFooter>
      </DialogBody>
    </Dialog>
  );
}
