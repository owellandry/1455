import type { GitCwd, HostConfig } from "protocol";
import { useIntl } from "react-intl";

import { Spinner } from "@/components/spinner";
import { useGitStagedAndUnstagedChanges } from "@/git-rpc/use-git-staged-and-unstaged-changes";
import { useGitUntrackedChanges } from "@/git-rpc/use-git-untracked-changes";
import CommitIcon from "@/icons/commit.svg";

import type { GitAction } from "../types";
import { getUnifiedDiff } from "./commit-utils";

export function useCommitAction({
  cwd,
  hostConfig,
  hasSomeUncommittedChanges: hasSomeUncommittedChangesProp,
  isPending,
}: {
  cwd: GitCwd;
  hostConfig: HostConfig;
  hasSomeUncommittedChanges?: boolean;
  isPending: boolean;
}): GitAction {
  const intl = useIntl();
  const shouldRunQueries = hasSomeUncommittedChangesProp == null;
  const { data: stagedAndUnstagedChanges } = useGitStagedAndUnstagedChanges(
    cwd,
    hostConfig,
    { enabled: shouldRunQueries },
  );
  const { data: untrackedChanges } = useGitUntrackedChanges(cwd, hostConfig, {
    enabled: shouldRunQueries,
  });
  const stagedUnified = getUnifiedDiff(stagedAndUnstagedChanges?.stagedChanges);
  const unstagedUnified = getUnifiedDiff(
    stagedAndUnstagedChanges?.unstagedChanges,
  );
  const untrackedUnified = getUnifiedDiff(untrackedChanges?.untrackedChanges);
  const hasStagedChanges = stagedUnified?.trim().length ? true : false;
  const hasUnstagedChanges = unstagedUnified?.trim().length ? true : false;
  const hasUntrackedChanges = untrackedUnified?.trim().length ? true : false;
  const hasSomeUncommittedChanges =
    hasSomeUncommittedChangesProp ??
    (hasStagedChanges || hasUnstagedChanges || hasUntrackedChanges);
  const isCommitDisabled = !hasSomeUncommittedChanges;

  const commitLabel = intl.formatMessage({
    id: "review.commit.buttonLabel",
    defaultMessage: "Commit",
    description: "Label for commit actions",
  });

  const label = isPending
    ? intl.formatMessage({
        id: "review.commit.disabled.committing",
        defaultMessage: "Committing…",
        description: "Tooltip shown on the commit button while committing",
      })
    : commitLabel;
  const tooltipText = isCommitDisabled
    ? intl.formatMessage({
        id: "review.commit.disabled.noChanges",
        defaultMessage: "No changes to commit",
        description: "Tooltip shown when there are no changes to commit",
      })
    : undefined;

  return {
    id: "commit",
    label,
    icon: isPending ? Spinner : CommitIcon,
    disabled: isCommitDisabled,
    loading: isPending,
    tooltipText,
  };
}
