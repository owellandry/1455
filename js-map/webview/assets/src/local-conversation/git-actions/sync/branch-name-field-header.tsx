import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router";

export function BranchNameFieldHeader({
  showSetPrefix = true,
}: {
  showSetPrefix?: boolean;
}): ReactElement {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-token-foreground">
        <FormattedMessage
          id="localConversation.syncSetup.branchName"
          defaultMessage="Branch name"
          description="Title for the branch name input in the sync setup modal"
        />
      </span>
      {showSetPrefix ? (
        <button
          type="button"
          className="text-sm text-token-description-foreground hover:text-token-foreground"
          onClick={() => {
            void navigate(`/settings/git-settings`);
          }}
        >
          <FormattedMessage
            id="localConversation.syncSetup.setPrefix"
            defaultMessage="Set prefix"
            description="Label for branch prefix configuration"
          />
        </button>
      ) : null}
    </div>
  );
}
