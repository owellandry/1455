import { CODEX_HOME_URL, type CodeEnvironment } from "protocol";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import DockIcon from "@/icons/dock.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import NotebookIcon from "@/icons/notebook.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";

import type { ComposerMode } from "./composer";

export function EnvironmentSelectorDropdownItem({
  selectedEnvironment,
  zeroEnvironments,
  onClick,
}: {
  selectedEnvironment: CodeEnvironment | null | undefined;
  zeroEnvironments: boolean;
  onClick: () => void;
}): React.ReactElement {
  const intl = useIntl();

  if (zeroEnvironments) {
    return (
      <Dropdown.Item RightIcon={LinkExternalIcon} href={CODEX_HOME_URL}>
        <span className="text-token-description-foreground">
          <FormattedMessage
            id="composer.mode.remote.setupViaWeb"
            defaultMessage="Set up an environment via Codex web"
            description="Menu item to setup an environment via Codex web"
          />
        </span>
      </Dropdown.Item>
    );
  }

  return (
    <Dropdown.Item
      RightIcon={ChevronRightIcon}
      className="pl-7"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      tooltipText={intl.formatMessage({
        id: "composer.environmentSelector.tooltip",
        defaultMessage: "Select a cloud environment",
        description: "Tooltip content for environment selector",
      })}
    >
      <span className="text-token-description-foreground">
        {selectedEnvironment?.label ?? (
          <FormattedMessage
            id="codex.environmentSelector.noEnvironment"
            defaultMessage="No environment"
            description="No environment selected message"
          />
        )}
      </span>
    </Dropdown.Item>
  );
}

export function EnvironmentSelector({
  selectedEnvironment,
  envQuery,
  setEnvQuery,
  envListState,
  listToShow,
  setComposerMode,
  setSelectedEnvironment,
  setOpen,
  onClosePanel,
}: {
  selectedEnvironment: CodeEnvironment | null | undefined;
  envQuery: string;
  setEnvQuery: React.Dispatch<React.SetStateAction<string>>;
  envListState: "list" | "loading" | "error" | "none-found" | "empty";
  listToShow: Array<CodeEnvironment> | undefined;
  setComposerMode: (mode: ComposerMode) => void;
  setSelectedEnvironment: (env: CodeEnvironment) => void;
  setOpen: (open: boolean) => void;
  onClosePanel: () => void;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-56 flex-col overflow-hidden">
        <Dropdown.Section className="my-1 flex w-full items-center gap-1.5 px-[var(--padding-row-x)]">
          <Button
            color="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClosePanel();
            }}
            aria-label={intl.formatMessage({
              id: "composer.environmentSelector.goBack",
              defaultMessage: "Back to composer",
              description: "Accessible label for closing environment selector",
            })}
          >
            <ArrowLeftIcon className="icon-xxs" />
          </Button>
          <Dropdown.SearchInput
            className="flex-1"
            placeholder={intl.formatMessage({
              id: "composer.searchEnvironments",
              defaultMessage: "Search environments",
              description: "Search environments placeholder",
            })}
            value={envQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEnvQuery(e.target.value)
            }
          />
        </Dropdown.Section>
        <div className="flex h-[150px] flex-col overflow-y-auto pb-1">
          {envListState === "list" &&
            listToShow?.map((env: CodeEnvironment) => (
              <Dropdown.Item
                key={env.id}
                RightIcon={
                  env.id === selectedEnvironment?.id ? CheckMdIcon : undefined
                }
                onClick={() => {
                  setComposerMode("cloud");
                  setSelectedEnvironment(env);
                  setOpen(false);
                }}
              >
                {env.label}
              </Dropdown.Item>
            ))}
          {envListState === "none-found" && (
            <Dropdown.Message centered>
              <FormattedMessage
                id="codex.environments.noEnvironmentsFound"
                defaultMessage="No environments found"
                description="Message shown when no Codex environments were found"
              />
            </Dropdown.Message>
          )}
          {envListState === "loading" && (
            <Spinner className="icon-xxs my-4 ms-2 self-center text-token-description-foreground" />
          )}
          {envListState === "error" && (
            <div className="w-full rounded-lg py-1.5 text-sm">
              <span className="flex items-center gap-1.5">
                <DockIcon className="icon-xs" />
                <span className="flex-1 truncate">
                  {selectedEnvironment?.label ?? (
                    <FormattedMessage
                      id="codex.environmentSelector.noEnvironment"
                      defaultMessage="No environment"
                      description="No environment selected message"
                    />
                  )}
                </span>
                <ChevronRightIcon className="icon-xs" />
              </span>
            </div>
          )}
        </div>
        <Dropdown.Separator />
        <Dropdown.Section className="flex flex-col">
          <Dropdown.Item
            LeftIcon={SettingsCogIcon}
            RightIcon={LinkExternalIcon}
            href={`${CODEX_HOME_URL}/settings/environments`}
          >
            <FormattedMessage
              id="codex.environments.environmentSettings"
              defaultMessage="Environment settings"
              description="Codex code environment settings link"
            />
          </Dropdown.Item>
          <Dropdown.Item
            LeftIcon={NotebookIcon}
            RightIcon={LinkExternalIcon}
            href="https://platform.openai.com/docs/codex/overview#environment-configuration"
          >
            <FormattedMessage
              id="codex.environments.learnMore"
              defaultMessage="Learn more"
              description="Codex code environment learn more link"
            />
          </Dropdown.Item>
        </Dropdown.Section>
      </div>
    </div>
  );
}
