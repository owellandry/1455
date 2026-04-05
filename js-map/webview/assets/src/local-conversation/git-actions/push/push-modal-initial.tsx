import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import BranchIcon from "@/icons/branch.svg";
import SendToCloudIcon from "@/icons/send-to-cloud.svg";
import { ActionPopover } from "@/review/action-popover-primitives";

export function PushModalInitial({
  target,
  isLoading,
  canPush,
  onPush,
}: {
  target: string | null;
  isLoading: boolean;
  canPush: boolean;
  onPush: () => void;
}): ReactElement {
  return (
    <ActionPopover.Root>
      <ActionPopover.Header
        icon={<SendToCloudIcon className="icon-md text-token-foreground" />}
      />
      <ActionPopover.Title>
        <FormattedMessage
          id="localConversationPage.pushModal.title"
          defaultMessage="Push changes"
          description="Title for the push modal"
        />
      </ActionPopover.Title>
      <ActionPopover.RowContainer>
        <ActionPopover.KeyValueRow
          left={
            <BranchIcon className="icon-xs text-token-description-foreground" />
          }
          label={
            <FormattedMessage
              id="localConversationPage.pushModal.branchLabel"
              defaultMessage="Branch"
              description="Label for branch row in push modal"
            />
          }
          value={
            target ?? (
              <FormattedMessage
                id="localConversationPage.pushModal.branchUnknown"
                defaultMessage="-"
                description="Placeholder shown when the branch is unknown"
              />
            )
          }
          valueClassName="text-token-foreground"
        />
      </ActionPopover.RowContainer>
      <div className="text-token-description-foreground">
        <FormattedMessage
          id="localConversationPage.pushModal.description"
          defaultMessage="Push your latest commits to the remote repository."
          description="Description text for push modal"
        />
      </div>
      <ActionPopover.Footer
        right={
          <div className="flex flex-1 items-center">
            <Button
              className="w-full justify-center py-3 text-base"
              size="toolbar"
              color="primary"
              disabled={!canPush}
              loading={isLoading}
              onClick={onPush}
            >
              <FormattedMessage
                id="localConversationPage.pushModal.confirm"
                defaultMessage="Push"
                description="Confirm button label for push modal"
              />
            </Button>
          </div>
        }
      />
    </ActionPopover.Root>
  );
}
