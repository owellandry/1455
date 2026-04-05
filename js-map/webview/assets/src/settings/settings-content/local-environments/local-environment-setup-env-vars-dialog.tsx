import {
  LOCAL_ENVIRONMENT_SOURCE_TREE_PATH_ENV_VAR,
  LOCAL_ENVIRONMENT_WORKTREE_PATH_ENV_VAR,
} from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/popover";

export function LocalEnvironmentSetupEnvVarsDialog(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="ghost" size="toolbar" className="w-auto">
          <FormattedMessage
            id="settings.localEnvironments.environment.setup.envVars.button"
            defaultMessage="Available environment variables"
            description="Button label that opens the setup env vars popover"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[min(20rem,var(--radix-popover-content-available-width))] gap-1"
      >
        <PopoverTitle className="px-2 py-1 text-sm font-medium text-token-text-primary">
          <FormattedMessage
            id="settings.localEnvironments.environment.setup.envVars.title"
            defaultMessage="Setup script environment variables"
            description="Title for the setup env vars popover"
          />
        </PopoverTitle>
        <div className="flex flex-col gap-1">
          <SetupEnvVarSummary
            description={
              <FormattedMessage
                id="settings.localEnvironments.environment.setup.envVars.sourcePath.description"
                defaultMessage="Source workspace path"
                description="Description for the source workspace setup env var"
              />
            }
            variableName={LOCAL_ENVIRONMENT_SOURCE_TREE_PATH_ENV_VAR}
          />
          <SetupEnvVarSummary
            variableName={LOCAL_ENVIRONMENT_WORKTREE_PATH_ENV_VAR}
            description={
              <FormattedMessage
                id="settings.localEnvironments.environment.setup.envVars.worktreePath.description"
                defaultMessage="New worktree path"
                description="Description for the worktree setup env var"
              />
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SetupEnvVarSummary({
  variableName,
  description,
}: {
  variableName: string;
  description: ReactElement;
}): ReactElement {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg px-2 py-1">
      <div className="text-sm text-token-text-secondary">{description}</div>
      <div className="overflow-x-auto rounded-md border border-token-input-background bg-token-text-code-block-background px-2 py-1.5">
        <code className="block text-xs font-medium whitespace-nowrap text-token-text-primary">
          {variableName}
        </code>
      </div>
    </div>
  );
}
