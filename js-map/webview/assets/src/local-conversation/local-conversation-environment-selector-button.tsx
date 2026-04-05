import type { HostConfig } from "protocol";
import type { ReactElement } from "react";
import { useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { Button } from "@/components/button";
import { BasicDropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import SettingsCogIcon from "@/icons/settings.cog.svg";

import { LocalConversationEnvironmentMenuContent } from "./local-conversation-environment-menu-content";
import { useLocalConversationEnvironment } from "./use-local-conversation-environment";

export function LocalConversationEnvironmentSelectorButton({
  hostConfig,
  workspaceRoot,
}: {
  hostConfig: HostConfig;
  workspaceRoot: string | null;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    localEnvironmentsLoading,
    localEnvironmentsError,
    localEnvironments,
    availableEnvironments,
    defaultEnvironment,
    defaultEnvironmentNormalized,
    normalizedResolvedConfigPath,
    canChangeEnvironment,
    setEnvironmentSelection,
  } = useLocalConversationEnvironment(workspaceRoot, hostConfig);
  const environmentSelectorLabel = intl.formatMessage({
    id: "threadPage.runAction.environmentSelector.label",
    defaultMessage: "Choose environment",
    description:
      "Tooltip and aria label for the environment selector button when no environment is selected",
  });

  return (
    <BasicDropdown
      open={menuOpen}
      onOpenChange={setMenuOpen}
      contentWidth="workspace"
      align="end"
      triggerButton={
        <Tooltip tooltipContent={environmentSelectorLabel}>
          <Button
            className="shrink-0"
            color="ghost"
            size="toolbar"
            aria-label={environmentSelectorLabel}
            disabled={!canChangeEnvironment}
          >
            <SettingsCogIcon className="icon-sm" />
          </Button>
        </Tooltip>
      }
    >
      <LocalConversationEnvironmentMenuContent
        localEnvironmentsLoading={localEnvironmentsLoading}
        localEnvironmentsError={localEnvironmentsError}
        localEnvironments={localEnvironments}
        availableEnvironments={availableEnvironments}
        defaultEnvironment={defaultEnvironment}
        defaultEnvironmentNormalized={defaultEnvironmentNormalized}
        normalizedResolvedConfigPath={normalizedResolvedConfigPath}
        onSelectEnvironment={(configPath) => {
          setEnvironmentSelection(configPath);
          setMenuOpen(false);
        }}
        onOpenSettings={() => {
          setMenuOpen(false);
          void navigate("/settings/local-environments");
        }}
      />
    </BasicDropdown>
  );
}
