import { FormattedMessage, useIntl } from "react-intl";

import { Spinner } from "@/components/spinner";

import { SlashCommandItem } from "../slash-commands/slash-command-item";

export function ReviewModePanel({
  onSelectUnstaged,
  onSelectBaseBranch,
  isSubmitting,
  isLoadingBaseBranch,
}: {
  onSelectUnstaged: () => void;
  onSelectBaseBranch: () => void;
  isSubmitting: boolean;
  isLoadingBaseBranch: boolean;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <>
      <SlashCommandItem
        value="base-branch"
        title={intl.formatMessage({
          id: "composer.reviewMode.option.baseBranch.simple",
          defaultMessage: "Review against a base branch",
          description: "Button label for reviewing against a base branch",
        })}
        onSelect={onSelectBaseBranch}
        disabled={isLoadingBaseBranch}
        RightIcon={isLoadingBaseBranch ? Spinner : undefined}
      />
      <SlashCommandItem
        value="unstaged"
        title={intl.formatMessage({
          id: "composer.reviewMode.option.unstaged.simple",
          defaultMessage: "Review uncommitted changes",
          description: "Button label for reviewing unstaged changes",
        })}
        onSelect={onSelectUnstaged}
        // only this command shows a spinner as the other command is synchronous
        RightIcon={isSubmitting ? Spinner : undefined}
      />
    </>
  );
}

export function ReviewBaseBranchPanel({
  onSelect,
  branchLines,
  isLoading,
  isError,
  refetchBranchOverview,
  submittingBranchName,
}: {
  onSelect: (branch: string) => void;
  branchLines: Array<{ key: string; label: string }>;
  isLoading: boolean;
  isError: boolean;
  refetchBranchOverview: () => void;
  submittingBranchName: string | null;
}): React.ReactElement {
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-token-foreground/70">
          <Spinner className="size-3" />
        </div>
      ) : isError ? (
        <div className="flex flex-col gap-2 py-2">
          <span className="text-center text-xs text-token-foreground/70">
            <FormattedMessage
              id="composer.reviewMode.branches.error"
              defaultMessage="Unable to load branches"
              description="Error message when branch list could not be loaded"
            />
          </span>
          <button
            type="button"
            className="text-xs font-medium text-token-text-link-foreground"
            onClick={refetchBranchOverview}
          >
            <FormattedMessage
              id="composer.reviewMode.branches.retry"
              defaultMessage="Retry"
              description="Retry button for branch list error"
            />
          </button>
        </div>
      ) : (
        branchLines.map((item) => {
          return (
            <SlashCommandItem
              key={item.key}
              value={item.label}
              title={item.label}
              onSelect={onSelect}
              RightIcon={
                submittingBranchName === item.key ? Spinner : undefined
              }
            />
          );
        })
      )}
    </>
  );
}
