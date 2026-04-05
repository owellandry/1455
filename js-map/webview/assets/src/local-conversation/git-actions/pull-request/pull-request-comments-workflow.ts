import { PROMPT_REQUEST_BEGIN } from "@/prompts/render-prompt";

export function buildPullRequestAddressCommentsPrompt({
  baseBranch,
  headBranch,
  number,
  skillMention,
}: {
  baseBranch: string;
  headBranch: string;
  number: number;
  skillMention: string;
}): string {
  const pullRequestLabel = `PR ${number}`;
  const branchLabel = ` (${headBranch} -> ${baseBranch})`;

  return [
    "## Pull request comments:",
    `Review ${pullRequestLabel}${branchLabel} and address the attached outstanding PR comments with the smallest safe changes.`,
    "Start from the attached unresolved review threads and comments.",
    `Use ${skillMention} if you need to inspect the live PR threads, verify the latest state, or post replies.`,
    "Address every actionable comment without asking the user which ones to handle.",
    "If a comment needs clarification, is already outdated, or should not be changed, explain that clearly instead of guessing.",
    PROMPT_REQUEST_BEGIN,
    "Address all actionable attached PR feedback.",
  ].join("\n");
}
