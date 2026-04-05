import { useScope, useSignal } from "maitai";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { useCreateGitRepository } from "@/git-rpc/use-create-git-repository";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { NoDiff } from "./no-diff";
import { reviewShowGitRepoEmptyState$ } from "./review-diff-state-model";
import { lastTurnSnapshot$ } from "./review-repository-model";

export function ReviewEmptyStateController({
  className,
}: {
  className?: string;
}): React.ReactElement {
  const threadRouteScope = useScope(ThreadRouteScope);
  const lastTurnSnapshot = useSignal(lastTurnSnapshot$);
  const showGitRepoEmptyState = useSignal(reviewShowGitRepoEmptyState$);
  const cwd = threadRouteScope.value.cwd;
  const hostConfig = threadRouteScope.value.hostConfig;
  const [gitInitErrorState, setGitInitErrorState] = useState<{
    cwd: string;
    message: string;
  } | null>(null);
  const {
    canCreateGitRepository,
    createGitRepository,
    isCreatingGitRepository,
  } = useCreateGitRepository({
    cwd,
    hostConfig,
    onErrorMessage: (message): void => {
      if (cwd == null) {
        return;
      }
      setGitInitErrorState({ cwd, message });
    },
  });
  const gitInitErrorMessage =
    cwd != null && gitInitErrorState?.cwd === cwd
      ? gitInitErrorState.message
      : null;
  const hasLastTurnDiff = lastTurnSnapshot.diffText != null;

  return (
    <NoDiff
      className={className}
      hasLastTurnDiff={hasLastTurnDiff}
      showGitRepoEmptyState={showGitRepoEmptyState}
      gitRepoErrorMessage={gitInitErrorMessage}
      gitRepoActions={
        showGitRepoEmptyState && canCreateGitRepository && cwd != null ? (
          <Button
            color="secondary"
            size="toolbar"
            disabled={isCreatingGitRepository}
            onClick={() => {
              setGitInitErrorState(null);
              void createGitRepository();
            }}
          >
            {isCreatingGitRepository ? (
              <FormattedMessage
                id="codex.review.noDiff.gitInit.creating"
                defaultMessage="Creating…"
                description="Button label shown while git init is running from the diff empty state"
              />
            ) : (
              <FormattedMessage
                id="codex.review.noDiff.gitInit.createRepository"
                defaultMessage="Create git repository"
                description="Button label to create a git repository from the diff empty state"
              />
            )}
          </Button>
        ) : null
      }
    />
  );
}
