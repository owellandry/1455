import { useScope } from "maitai";
import type React from "react";
import { useCallback, useState } from "react";
import { useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useRegisterCommand } from "@/commands/use-register-command";
import { toast$ } from "@/components/toaster/toast-signal";
import { useProvideSlashCommand } from "@/composer/slash-commands/slash-command";
import { useActiveConversationId } from "@/hooks/use-active-conversation-id";
import CommentIcon from "@/icons/comment.svg";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

import {
  FeedbackSubmissionDialog,
  type FeedbackSubmission,
} from "./feedback-submission-dialog";
import { FeedbackSuccessDialog } from "./feedback-success";

export function FeedbackSlashCommand(): React.ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const mcpManager = useDefaultAppServerManager();
  const conversationId = useActiveConversationId();
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  const [uploadedReportId, setUploadedReportId] = useState<string>("");

  const handleOpenFeedbackDialog = useCallback(async () => {
    setIsSubmissionOpen(true);
  }, []);

  const handleSubmit = async ({
    classification,
    description,
    includeLogs,
  }: FeedbackSubmission): Promise<void> => {
    setIsSubmitting(true);
    try {
      const fallbackReportId = crypto.randomUUID();
      const harnessResponse = await mcpManager.submitFeedback({
        classification,
        reason: description,
        threadId: conversationId,
        includeLogs,
      });
      const reportId =
        conversationId == null ? fallbackReportId : harnessResponse.threadId;
      await fetchFromVSCode("feedback-create-sentry-issue", {
        params: {
          classification,
          description,
          includeLogs,
          correlationId: reportId,
        },
      });
      setUploadedReportId(reportId);
      setIsSuccessDialogOpen(true);
      setIsSubmissionOpen(false);
    } catch (error) {
      logger.error(`Failed to submit feedback`, {
        safe: {},
        sensitive: { error: error },
      });
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "feedback.dialog.submitError",
          defaultMessage:
            "We couldn't submit your feedback. Please try again in a moment.",
          description: "Toast shown when feedback submission fails",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessDialogOpenChange = (nextOpen: boolean): void => {
    setIsSuccessDialogOpen(nextOpen);
    if (!nextOpen) {
      setUploadedReportId("");
    }
  };

  useRegisterCommand("feedback", handleOpenFeedbackDialog);

  useProvideSlashCommand({
    id: "feedback",
    title: intl.formatMessage({
      id: "composer.feedbackSlashCommand.title",
      defaultMessage: "Feedback",
      description: "Title for the /feedback slash command",
    }),
    requiresEmptyComposer: false,
    Icon: CommentIcon,
    onSelect: handleOpenFeedbackDialog,
  });

  return (
    <>
      <FeedbackSubmissionDialog
        open={isSubmissionOpen}
        onOpenChange={setIsSubmissionOpen}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      <FeedbackSuccessDialog
        open={isSuccessDialogOpen}
        onOpenChange={handleSuccessDialogOpenChange}
        correlationId={uploadedReportId}
        hasActiveConversation={conversationId != null}
      />
    </>
  );
}
