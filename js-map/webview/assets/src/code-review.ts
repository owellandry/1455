import type { UseMutationResult } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  APPROVALS_REVIEWER_USER,
  type ConversationId,
  type GitCwd,
  type GitRoot,
} from "protocol";
import { useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import codeReviewSystemPrompt from "@/prompts/code-review.md?raw";
import {
  CODE_REVIEW_BEGIN,
  PROMPT_REQUEST_BEGIN,
} from "@/prompts/render-prompt";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

// Prompt specific to the type of code review, such as review against a base branch or review uncommitted changes.
const CODE_REVIEW_PROMPT_TEMPLATE_WITH_COMMIT =
  "Review the code changes against the base branch '{baseBranch}'. The merge base commit for this comparison is {mergeBaseSha}. Run `git diff {mergeBaseSha}` to inspect the changes relative to {baseBranch}. Provide prioritized, actionable findings.";
const CODE_REVIEW_UNCOMMITTED_PROMPT =
  "Review the current code changes (staged, unstaged, and untracked files) and provide prioritized findings.";

type BaseCodeReviewContext = {
  gitRoot: GitRoot;
  cwd: GitCwd;
};

export type CodeReviewContext = BaseCodeReviewContext &
  (
    | {
        mode: "base-branch";
        sourceBranch: string;
        baseBranch: string;
      }
    | {
        mode: "uncommitted";
        sourceBranch: string;
      }
  );

function buildCodeReviewPrompt({
  baseBranch,
  mergeBaseSha,
  requestMessage,
}: {
  baseBranch: string;
  mergeBaseSha: string;
  requestMessage: string;
}): string {
  const trimmedPreface = codeReviewSystemPrompt.trim();
  const mergeBaseLabel = mergeBaseSha.trim();
  const processedInstructions =
    CODE_REVIEW_PROMPT_TEMPLATE_WITH_COMMIT.replaceAll(
      "{baseBranch}",
      baseBranch,
    ).replaceAll("{mergeBaseSha}", mergeBaseLabel);
  const trimmedInstructions = processedInstructions.trim();

  return [
    CODE_REVIEW_BEGIN,
    trimmedPreface,
    trimmedInstructions,
    PROMPT_REQUEST_BEGIN,
    requestMessage,
  ].join("\n");
}

function buildInstructionsForUncommittedChanges({
  requestMessage,
}: {
  requestMessage: string;
}): string {
  const trimmedPreface = codeReviewSystemPrompt.trim();
  return [
    CODE_REVIEW_BEGIN,
    trimmedPreface,
    CODE_REVIEW_UNCOMMITTED_PROMPT,
    PROMPT_REQUEST_BEGIN,
    requestMessage,
  ].join("\n");
}

type StartCodeReviewConversationParams = {
  context: CodeReviewContext;
};

export function useStartCodeReviewConversation({
  onError,
  onSuccess,
}: {
  onError: (error: Error) => void;
  onSuccess: (conversationId: ConversationId) => void;
}): UseMutationResult<
  ConversationId,
  Error,
  StartCodeReviewConversationParams
> {
  const intl = useIntl();
  const mcpManager = useDefaultAppServerManager();

  return useMutation({
    mutationFn: async ({ context }: StartCodeReviewConversationParams) => {
      const { gitRoot, cwd } = context;
      if (context.mode === "uncommitted") {
        const requestMessage = intl.formatMessage({
          id: "quickAction.request.codeReview.uncommitted.new",
          defaultMessage: "Please review my uncommitted changes",
          description:
            "User message used when reviewing uncommitted changes (new conversation)",
        });

        const prompt = buildInstructionsForUncommittedChanges({
          requestMessage,
        });

        const conversationId = await mcpManager.startConversation({
          input: [{ type: "text", text: prompt, text_elements: [] }],
          cwd,
          workspaceRoots: [gitRoot],
          collaborationMode: null,
          approvalsReviewer: APPROVALS_REVIEWER_USER,
        });
        return conversationId;
      }

      const mergeBaseResponse = await fetchFromVSCode("git-merge-base", {
        params: {
          gitRoot,
          baseBranch: context.baseBranch,
          hostId: mcpManager.getHostId(),
        },
      });
      if (!mergeBaseResponse.mergeBaseSha) {
        throw new Error(
          `Failed to resolve a merge base between HEAD and ${context.baseBranch}.`,
        );
      }

      // User visible message
      const requestMessage = intl.formatMessage(
        {
          id: "quickAction.request.codeReview.branches.new",
          defaultMessage: "Please review changes on {from} against {to}",
          description:
            "User message used when reviewing against a base branch (new conversation)",
        },
        {
          from: context.sourceBranch,
          to: context.baseBranch,
        },
      );

      const prompt = buildCodeReviewPrompt({
        baseBranch: context.baseBranch,
        mergeBaseSha: mergeBaseResponse.mergeBaseSha,
        requestMessage,
      });

      const conversationId = await mcpManager.startConversation({
        input: [{ type: "text", text: prompt, text_elements: [] }],
        cwd,
        workspaceRoots: [cwd],
        // Let the CLI decide the model from default and/or config.toml.
        collaborationMode: null,
        approvalsReviewer: APPROVALS_REVIEWER_USER,
      });
      return conversationId;
    },
    onSuccess: (conversationId) => {
      onSuccess(conversationId);
    },
    onError: (error) => {
      logger.error(`Failed to start quick review conversation`, {
        safe: {},
        sensitive: {
          error,
        },
      });
      onError(error);
    },
  });
}
