import { parseRepoFromRemoteUrl } from "protocol";

export function buildCreatePullRequestUrl({
  originUrl,
  baseBranch,
  headBranch,
}: {
  originUrl: string | null;
  baseBranch: string | null;
  headBranch: string | null;
}): string | null {
  if (!originUrl || !baseBranch || !headBranch) {
    return null;
  }

  const parsedRepo = parseRepoFromRemoteUrl(originUrl);
  if (!parsedRepo) {
    return null;
  }

  const encodedBaseBranch = encodeURIComponent(baseBranch);
  const encodedHeadBranch = encodeURIComponent(headBranch);
  return `https://${parsedRepo.host}/${parsedRepo.owner}/${parsedRepo.repo}/compare/${encodedBaseBranch}...${encodedHeadBranch}?expand=1`;
}
