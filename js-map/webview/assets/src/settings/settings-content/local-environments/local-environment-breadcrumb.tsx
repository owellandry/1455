import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";

import { getWorkspaceLabel } from "./local-environment-workspace-utils";

export function LocalEnvironmentBreadcrumb({
  workspaceRoot,
  workspaceGroup,
  mode,
  onBack,
}: {
  workspaceRoot: string;
  workspaceGroup: RepositoryTaskGroups | null;
  mode?: "edit";
  onBack?: () => void;
}): ReactElement {
  const workspaceLabel = getWorkspaceLabel(workspaceRoot, workspaceGroup);

  return (
    <nav className="flex items-center gap-2 text-sm text-token-text-secondary">
      {onBack ? (
        <Button color="ghost" size="toolbar" onClick={onBack}>
          <ArrowLeftIcon className="icon-2xs" />
          <FormattedMessage
            id="settings.localEnvironments.breadcrumb.back"
            defaultMessage="Back"
            description="Button label to go back to local environments list"
          />
        </Button>
      ) : null}
      <div className="flex items-center gap-1">
        <span>
          <FormattedMessage
            id="settings.localEnvironments.breadcrumb.root"
            defaultMessage="Environments"
            description="Breadcrumb label for the local environments page"
          />
        </span>
        <ChevronRightIcon className="icon-xs text-token-text-secondary" />
        <span className="text-token-text-primary">{workspaceLabel}</span>
        {mode === "edit" ? (
          <>
            <ChevronRightIcon className="icon-xs text-token-text-secondary" />
            <span>
              <FormattedMessage
                id="settings.localEnvironments.breadcrumb.edit"
                defaultMessage="edit"
                description="Breadcrumb label for local environment edit mode"
              />
            </span>
          </>
        ) : null}
      </div>
    </nav>
  );
}
