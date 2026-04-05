import type { LocalEnvironmentResultWithPath } from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Dropdown, DropdownSeparator } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import CheckMdIcon from "@/icons/check-md.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import StarIcon from "@/icons/star.svg";
import { getEnvironmentLabel } from "@/local-conversation/environment-labels";
import { normalizePath } from "@/utils/path";

const defaultEnvironmentTooltipMessage = {
  id: "composer.worktreeEnvironment.default",
  defaultMessage: "Default environment",
  description: "Tooltip for default local environment icon",
};

export function LocalConversationEnvironmentMenuContent({
  localEnvironmentsLoading,
  localEnvironmentsError,
  localEnvironments,
  availableEnvironments,
  defaultEnvironment,
  defaultEnvironmentNormalized,
  normalizedResolvedConfigPath,
  onSelectEnvironment,
  onOpenSettings,
}: {
  localEnvironmentsLoading: boolean;
  localEnvironmentsError: boolean;
  localEnvironments: Array<LocalEnvironmentResultWithPath>;
  availableEnvironments: Array<LocalEnvironmentResultWithPath>;
  defaultEnvironment: LocalEnvironmentResultWithPath | null;
  defaultEnvironmentNormalized: string | null;
  normalizedResolvedConfigPath: string | null;
  onSelectEnvironment: (configPath: string | null) => void;
  onOpenSettings: () => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <div className="flex flex-col gap-0.5 pb-1">
      <div className="vertical-scroll-fade-mask flex max-h-[200px] flex-col gap-0.5 overflow-y-auto pr-1">
        <Dropdown.Item
          RightIcon={
            normalizedResolvedConfigPath == null ? CheckMdIcon : undefined
          }
          onSelect={() => {
            onSelectEnvironment(null);
          }}
        >
          <FormattedMessage
            id="codex.environmentSelector.noEnvironment"
            defaultMessage="No environment"
            description="No environment selected message"
          />
        </Dropdown.Item>
        {defaultEnvironment ? (
          <Dropdown.Item
            RightIcon={
              defaultEnvironmentNormalized != null &&
              defaultEnvironmentNormalized === normalizedResolvedConfigPath
                ? CheckMdIcon
                : undefined
            }
            tooltipText={intl.formatMessage(defaultEnvironmentTooltipMessage)}
            onSelect={() => {
              onSelectEnvironment(defaultEnvironment.configPath);
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <StarIcon className="icon-xxs shrink-0 text-token-description-foreground" />
              <span className="truncate">
                {getEnvironmentLabel(defaultEnvironment)}
              </span>
            </div>
          </Dropdown.Item>
        ) : null}
        {localEnvironmentsLoading && localEnvironments.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Spinner className="icon-xxs" />
          </div>
        ) : localEnvironmentsError ? (
          <Dropdown.Message compact tone="error">
            <FormattedMessage
              id="composer.worktreeEnvironment.error"
              defaultMessage="Error loading environments"
              description="Error state for worktree environment dropdown"
            />
          </Dropdown.Message>
        ) : availableEnvironments.length > 0 ? (
          availableEnvironments.map((environment) => {
            return (
              <Dropdown.Item
                key={environment.configPath}
                RightIcon={
                  normalizedResolvedConfigPath != null &&
                  normalizePath(environment.configPath) ===
                    normalizedResolvedConfigPath
                    ? CheckMdIcon
                    : undefined
                }
                onSelect={() => {
                  onSelectEnvironment(environment.configPath);
                }}
              >
                <span className="min-w-0 truncate">
                  {getEnvironmentLabel(environment)}
                </span>
              </Dropdown.Item>
            );
          })
        ) : localEnvironments.length === 0 ? (
          <Dropdown.Message compact>
            <FormattedMessage
              id="codex.environments.noEnvironmentsFound"
              defaultMessage="No environments found"
              description="Message shown when no Codex environments were found"
            />
          </Dropdown.Message>
        ) : null}
      </div>
      <DropdownSeparator />
      <Dropdown.Item
        onSelect={() => {
          onOpenSettings();
        }}
      >
        <div className="flex items-center gap-1.5">
          <SettingsCogIcon className="icon-sm" />
          <FormattedMessage
            id="threadPage.runAction.setup.editMore"
            defaultMessage="Environment settings"
            description="Edit more action label in run action setup popover"
          />
        </div>
      </Dropdown.Item>
    </div>
  );
}
