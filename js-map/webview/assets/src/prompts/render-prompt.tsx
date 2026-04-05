import type { BaseComposerSubmitContext } from "@/composer/composer";
import { dedupeFileDescriptors } from "@/composer/dedupe-file-descriptors";
import { buildImageFileAttachments } from "@/composer/image-file-attachments";
import { formatCommentLineRange, getCommentText } from "@/diff/diff-file-utils";

export const CODE_REVIEW_BEGIN = "## Code review guidelines:";
export const PULL_REQUEST_FIX_BEGIN = "## Pull request fix:";
export const AUTO_RESOLVE_MERGE_BEGIN = "## Auto resolve merge:";
export const PRIOR_CONVERSATION_BEGIN = "## Prior conversation with Codex:";
export const COMMENTS_BEGIN = "# Diff comments:";
export const PULL_REQUEST_CHECKS_BEGIN = "# Failing PR checks:";
export const REVIEW_FINDINGS_BEGIN = "# Review findings:";
export const FILES_MENTIONED_BEGIN = "# Files mentioned by the user:";
export const PROMPT_REQUEST_BEGIN = "## My request for Codex:";
export const COMMENT_HEADER_BEGIN = "## Comment";

export const extractPromptRequest = (prompt: string): string => {
  const parts = prompt.split(PROMPT_REQUEST_BEGIN);
  if (parts.length <= 1) {
    return prompt;
  }
  return parts[parts.length - 1].trim();
};

export function replacePromptRequest(
  prompt: string,
  nextPromptRequest: string,
): string {
  const parts = prompt.split(PROMPT_REQUEST_BEGIN);
  if (parts.length <= 1) {
    return nextPromptRequest;
  }

  const context = parts.slice(0, -1).join(PROMPT_REQUEST_BEGIN).trimEnd();
  return `${context}\n${PROMPT_REQUEST_BEGIN}\n${nextPromptRequest}\n`;
}

// TODO: swap over to using prompt or prompt-tsx, so we can dynamically shrink file chunks. I'm keeping this simple for now
// until we need it for injecting file content
export function renderComposerPrompt(
  context: BaseComposerSubmitContext,
): string {
  const contextSection = buildPromptContextSection(context);

  const prefix = contextSection
    ? `${contextSection}\n${PROMPT_REQUEST_BEGIN}\n`
    : "";

  return `${prefix}${context.prompt}\n`;
}

// TODO: swap over to using prompt or prompt-tsx, so we can dynamically shrink file chunks. I'm keeping this simple for now
// until we need it for injecting file content
export function buildPromptContextSection({
  addedFiles,
  fileAttachments,
  ideContext,
  priorConversation,
  commentAttachments = [],
  pullRequestChecks = [],
  reviewFindings = [],
  imageAttachments,
}: BaseComposerSubmitContext): string {
  let contextSection = "";
  if (ideContext) {
    let ideContextSection = "";
    if (ideContext.activeFile) {
      ideContextSection += `\n## Active file: ${ideContext.activeFile.path}\n`;
    }
    if (ideContext.activeFile?.activeSelectionContent) {
      ideContextSection += `\n## Active selection of the file:\n${ideContext.activeFile.activeSelectionContent}`;
    }
    if (ideContext.openTabs && ideContext.openTabs.length > 0) {
      ideContextSection += `\n## Open tabs:\n`;
      for (const tab of ideContext.openTabs) {
        ideContextSection += `- ${tab.label}: ${tab.path}\n`;
      }
    }

    if (ideContextSection) {
      contextSection += "# Context from my IDE setup:\n";
      contextSection += ideContextSection;
    }
  }

  const additionalFiles = buildImageFileAttachments(imageAttachments);
  const mentionedFiles = dedupeFileDescriptors([
    ...addedFiles,
    ...fileAttachments,
    ...additionalFiles,
  ]);
  if (mentionedFiles.length > 0) {
    contextSection += `\n${FILES_MENTIONED_BEGIN}\n`;
    for (const file of mentionedFiles) {
      let lineInfo = "";
      if (file.startLine != null) {
        lineInfo =
          file.endLine != null && file.endLine !== file.startLine
            ? ` (lines ${file.startLine}-${file.endLine})`
            : ` (line ${file.startLine})`;
      }
      contextSection += `\n## ${file.label}: ${file.path}${lineInfo}\n`;
    }
  }

  if (priorConversation) {
    contextSection += `\n${PRIOR_CONVERSATION_BEGIN}\n${JSON.stringify(
      priorConversation,
    )}`;
  }

  if (commentAttachments.length > 0) {
    contextSection += `\n${COMMENTS_BEGIN}\n`;
    commentAttachments.forEach((comment, idx): void => {
      const snippet = getCommentText(comment);
      let localDiffHunk: string | undefined;
      if ("localDiffHunk" in comment) {
        const candidate = comment.localDiffHunk;
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          localDiffHunk = candidate;
        }
      }
      contextSection += `\n${COMMENT_HEADER_BEGIN} ${idx + 1}\n`;
      contextSection += `File: ${comment.position.path}\n`;
      contextSection += `Side: ${comment.position.side === "left" ? "L" : "R"}\n`;
      contextSection += `Lines: ${formatCommentLineRange(comment)}\n`;
      if (localDiffHunk) {
        contextSection += `Diff hunk:\n\`\`\`diff\n${localDiffHunk}\n\`\`\`\n`;
      }
      contextSection += `Comment:\n${snippet}\n`;
    });
  }

  if (pullRequestChecks.length > 0) {
    contextSection += `\n${PULL_REQUEST_CHECKS_BEGIN}\n`;
    pullRequestChecks.forEach((check, idx): void => {
      contextSection += `\n## Check ${idx + 1}: ${check.name}\n`;
      if (check.description) {
        contextSection += `${check.description}\n`;
      }
      if (check.workflow) {
        contextSection += `Workflow: ${check.workflow}\n`;
      }
      if (check.state) {
        contextSection += `State: ${check.state}\n`;
      }
      if (check.event) {
        contextSection += `Event: ${check.event}\n`;
      }
      if (check.link) {
        contextSection += `Link: ${check.link}\n`;
      }
      if (check.startedAt) {
        contextSection += `Started: ${check.startedAt}\n`;
      }
      if (check.completedAt) {
        contextSection += `Completed: ${check.completedAt}\n`;
      }
    });
  }

  if (reviewFindings.length > 0) {
    contextSection += `\n${REVIEW_FINDINGS_BEGIN}\n`;
    reviewFindings.forEach((comment, idx): void => {
      const snippet = getCommentText(comment);
      const label = `${comment.position.path}:${formatCommentLineRange(comment)}`;
      const status = comment.reviewFindingStatus ?? "added";
      contextSection += `\n## Finding ${idx + 1} (${label}) [${status}]\n${snippet}\n`;
    });
  }

  return contextSection;
}
