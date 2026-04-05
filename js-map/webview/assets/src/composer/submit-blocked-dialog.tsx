import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";

export function SubmitBlockedDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string | null;
}): React.ReactElement | null {
  if (!message) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="composer.submit.blockedDialogTitle"
                defaultMessage="Unable to send message"
                description="Title shown when the composer cannot submit"
              />
            }
          />
        </DialogSection>
        <DialogSection className="text-token-description-foreground">
          <p>{message}</p>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="primary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="composer.submit.blockedDialogOk"
                defaultMessage="OK"
                description="Button label to close the submit blocked dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
