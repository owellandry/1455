import type { ConversationId, HostConfig } from "protocol";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";

import { getEnvironmentActionsMode } from "@/settings/settings-content/local-environments/local-environments-utils";

import { LocalConversationActionCompoundButton } from "./local-conversation-action-compound-button";
import { LocalConversationEnvironmentSelectorButton } from "./local-conversation-environment-selector-button";
import { RunActionSetupPopover } from "./run-action-setup-popover";
import { useLocalConversationEnvironment } from "./use-local-conversation-environment";

export function LocalConversationEnvironmentActions({
  conversationId,
  hostConfig,
  onShowTerminal,
  workspaceRoot,
}: {
  conversationId: ConversationId;
  hostConfig: HostConfig;
  onShowTerminal: () => void;
  workspaceRoot: string | null;
}): ReactElement {
  const intl = useIntl();

  const {
    codexWorktree,
    localEnvironments,
    localEnvironmentsLoading,
    resolvedEnvironmentConfigPath,
  } = useLocalConversationEnvironment(workspaceRoot, hostConfig);
  const missingRunLabel = intl.formatMessage({
    id: "threadPage.runAction.missing.label",
    defaultMessage: "Set up a run action",
    description:
      "Label for the run button (and tooltip) when no run action is configured",
  });
  const mode = getEnvironmentActionsMode({
    codexWorktree,
    localEnvironments,
    localEnvironmentsLoading,
    resolvedEnvironmentConfigPath,
  });

  if (mode === "selector") {
    return (
      <LocalConversationEnvironmentSelectorButton
        hostConfig={hostConfig}
        workspaceRoot={workspaceRoot}
      />
    );
  }

  if (mode === "setup") {
    return (
      <RunActionSetupPopover
        conversationId={conversationId}
        hostConfig={hostConfig}
        onShowTerminal={onShowTerminal}
        triggerLabel={missingRunLabel}
        workspaceRoot={workspaceRoot}
      />
    );
  }

  return (
    <LocalConversationActionCompoundButton
      conversationId={conversationId}
      hostConfig={hostConfig}
      onShowTerminal={onShowTerminal}
      workspaceRoot={workspaceRoot}
    />
  );
}
