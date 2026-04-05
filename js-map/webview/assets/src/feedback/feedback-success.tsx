import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { useWindowType } from "@/hooks/use-window-type";
import CheckIcon from "@/icons/check-md.svg";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

export function FeedbackSuccessDialog({
  open,
  onOpenChange,
  correlationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correlationId: string;
  hasActiveConversation: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const issueTemplateUrl =
    useWindowType() === "extension"
      ? "https://github.com/openai/codex/issues/new?template=2-extension.yml"
      : "https://github.com/openai/codex/issues/new?template=1-codex-app.yml";
  const existingIssuesUrl = "https://github.com/openai/codex/issues";
  const openIssueLabel = intl.formatMessage({
    id: "feedback.dialog.uploadedMessage.openIssue",
    defaultMessage: "open a GitHub issue",
    description: "Link text for opening a GitHub issue",
  });
  const feedbackIssueUrl =
    correlationId == null
      ? issueTemplateUrl
      : `${issueTemplateUrl}&steps=${encodeURIComponent(
          `Uploaded thread: ${correlationId}`,
        )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            icon={<CheckIcon className="icon-base text-token-success" />}
            title={
              <FormattedMessage
                id="feedback.dialog.uploadedTitle"
                defaultMessage="Feedback uploaded"
                description="Title shown after feedback has been uploaded"
              />
            }
          />
        </DialogSection>
        <DialogSection className="gap-3 text-token-foreground">
          <p>
            <FormattedMessage
              id="feedback.dialog.uploadedMessage.withThread"
              defaultMessage="Feedback uploaded. If the problem persists, please {openIssueLink} or mention the thread id in an {existingIssueLink}:"
              description="Message shown after feedback has been uploaded when there is an active conversation"
              values={{
                openIssueLink: (
                  <a
                    className="inline text-token-link underline"
                    href={feedbackIssueUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {openIssueLabel}
                  </a>
                ),
                existingIssueLink: (
                  <a
                    className="inline text-token-link underline"
                    href={existingIssuesUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="feedback.dialog.uploadedMessage.existingIssue"
                      defaultMessage="existing open issue"
                      description="Link text for browsing existing open issues"
                    />
                  </a>
                ),
              }}
            />
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded border border-token-border bg-token-menu-background px-3 py-2">
              <code className="min-w-0 flex-1 overflow-hidden text-ellipsis text-token-foreground">
                {correlationId}
              </code>
              <CopyButton
                iconOnly
                iconClassName="icon-2xs"
                className="shrink-0"
                onCopy={(event) => {
                  void copyToClipboard(correlationId, event);
                }}
              />
            </div>
          </div>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="primary"
              onClick={(): void => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="feedback.dialog.dismiss"
                defaultMessage="Dismiss"
                description="Button label to close the feedback success dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
