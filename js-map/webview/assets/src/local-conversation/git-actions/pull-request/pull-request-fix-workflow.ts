import {
  PROMPT_REQUEST_BEGIN,
  PULL_REQUEST_FIX_BEGIN,
} from "@/prompts/render-prompt";

export function buildPullRequestFixPrompt({
  baseBranch,
  headBranch,
  number,
}: {
  baseBranch: string;
  headBranch: string;
  number: number;
}): string {
  const pullRequestLabel = `PR ${number}`;
  const branchLabel = ` (${headBranch} -> ${baseBranch})`;

  return [
    PULL_REQUEST_FIX_BEGIN,
    `Review ${pullRequestLabel}${branchLabel} and make the smallest safe fix for the attached failing CI.`,
    "Start from the attached failing-check context. Then use `gh` to inspect the latest runs, annotations, and logs for those failures before changing code.",
    "Treat `gh` as the primary source of truth for workflow runs, job logs, annotations, and links to any external CI.",
    "Resolve the PR with `gh pr view` or `gh pr checks` and inspect failing GitHub Actions runs with `gh run view`, including logs.",
    "If `gh pr checks` rejects a requested JSON field, retry with the available fields instead of guessing.",
    "If a GitHub Actions run log is incomplete because the run is still in progress, fall back to the per-job logs that GitHub exposes.",
    "If the failure can be diagnosed from GitHub, fix it directly.",
    "If the failure requires external CI logs (for example Buildkite):",
    "- first use `gh` to locate the external run or job URL and linked details",
    "- then check whether any installed skills or tools can access that CI system",
    "- then check whether the required credentials, permissions, tokens, or MCP or tool access are actually available",
    "- if anything is missing, stop and tell the user exactly what is missing and exactly what they can provide to unblock you",
    "- otherwise fetch the external logs, diagnose the issue, and make the smallest safe fix",
    "Do not guess without logs. Do not do unrelated refactors. Be explicit if blocked. After fixing, run the narrowest relevant verification, commit and push the fix, and summarize the root cause, fix, and result.",
    PROMPT_REQUEST_BEGIN,
    "Use gh to inspect the failing CI and make the smallest safe fix. Once everything is fixed, commit and push it.",
  ].join("\n");
}
