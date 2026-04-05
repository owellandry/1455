import { useScope, useSignal } from "maitai";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { confirmReviewRevert } from "./review-patch-actions";
import {
  closeRevertDialog,
  isRevertDialogOpen$,
  revertDialogSkipChecked$,
  setRevertDialogSkipChecked,
} from "./review-patch-model";

export function ReviewRevertDialogContainer(): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const isRevertDialogOpen = useSignal(isRevertDialogOpen$);
  const revertDialogSkipChecked = useSignal(revertDialogSkipChecked$);

  return (
    <Dialog
      open={isRevertDialogOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeRevertDialog(scope);
        }
      }}
    >
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="codex.review.revertDialog.title"
                defaultMessage="Revert changes?"
                description="Title for the revert confirmation dialog in review diffs"
              />
            }
            subtitle={
              <FormattedMessage
                id="codex.review.revertDialog.message"
                defaultMessage="This action removes all of these changes."
                description="Description explaining that reverting a hunk, file, or section removes the changes"
              />
            }
          />
        </DialogSection>
        <DialogSection>
          <label className="relative flex items-center gap-2 text-token-text-primary">
            <Checkbox
              checked={revertDialogSkipChecked}
              onCheckedChange={(checked) => {
                setRevertDialogSkipChecked(scope, checked);
              }}
            />
            <FormattedMessage
              id="codex.review.revertDialog.skip"
              defaultMessage="Don't ask again"
              description="Label for checkbox that disables the revert confirmation dialog"
            />
          </label>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="ghost"
              onClick={() => {
                closeRevertDialog(scope);
              }}
            >
              <FormattedMessage
                id="codex.review.revertDialog.cancel"
                defaultMessage="Cancel"
                description="Cancel button label for revert confirmation dialog"
              />
            </Button>
            <Button
              color="danger"
              onClick={() => {
                void confirmReviewRevert(scope);
              }}
            >
              <FormattedMessage
                id="codex.review.revertDialog.confirm"
                defaultMessage="Confirm"
                description="Confirm button label for revert confirmation dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
