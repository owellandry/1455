import clsx from "clsx";
import type { LocalEnvironmentResultWithPath } from "protocol";
import { useState, type ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import StarIcon from "@/icons/star.svg";
import { getDefaultLocalEnvironmentResult } from "@/utils/local-environments";
import { normalizePath } from "@/utils/path";

export function WorktreeEnvironmentDropdown({
  className,
  environments,
  isLoading,
  hasError,
  hideLabel = false,
  selectedConfigPath,
  onSelectConfigPath,
  onOpenSettings,
  showDefaultOption = true,
}: {
  className?: string;
  environments: Array<LocalEnvironmentResultWithPath>;
  isLoading: boolean;
  hasError: boolean;
  hideLabel?: boolean;
  selectedConfigPath?: string | null;
  onSelectConfigPath: (configPath: string | null) => void;
  onOpenSettings: () => void;
  showDefaultOption?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const defaultEnvironment = getDefaultLocalEnvironmentResult(environments);
  const normalizedSelected = selectedConfigPath
    ? normalizePath(selectedConfigPath)
    : null;
  const selectedEnvironment =
    environments.find(
      (environment) =>
        normalizePath(environment.configPath) === normalizedSelected,
    ) ?? null;
  const showNoEnvironmentOption = !isLoading && !hasError;
  const availableEnvironments =
    defaultEnvironment && showDefaultOption
      ? environments.filter(
          (environment) =>
            normalizePath(environment.configPath) !==
            normalizePath(defaultEnvironment.configPath),
        )
      : environments;
  const label = getEnvironmentLabel({
    isLoading,
    selectedEnvironment,
  });

  return (
    <BasicDropdown
      open={open}
      onOpenChange={setOpen}
      side="top"
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="composer.worktreeEnvironment.tooltip"
              defaultMessage="Select a local environment"
              description="Tooltip for local environment selector"
            />
          }
        >
          <Button
            className={clsx("whitespace-nowrap", className)}
            size="composerSm"
            color="ghost"
          >
            <SettingsCogIcon className="icon-2xs" />
            {!hideLabel ? (
              <span className="composer-footer__label--sm composer-footer__secondary-label max-w-40 truncate whitespace-nowrap">
                {label}
              </span>
            ) : null}
            {isLoading ? (
              <Spinner className="icon-2xs text-token-input-placeholder-foreground" />
            ) : (
              <ChevronIcon className="composer-footer__secondary-chevron icon-2xs text-token-input-placeholder-foreground" />
            )}
          </Button>
        </Tooltip>
      }
    >
      <div className="flex w-64 flex-col overflow-hidden">
        <Dropdown.Title>
          <FormattedMessage
            id="composer.worktreeEnvironment.title"
            defaultMessage="Local environment"
            description="Title for worktree environment dropdown"
          />
        </Dropdown.Title>
        <div className="vertical-scroll-fade-mask flex max-h-[220px] flex-col overflow-y-auto">
          {showNoEnvironmentOption ? (
            <Dropdown.Item
              RightIcon={selectedConfigPath == null ? CheckMdIcon : undefined}
              onClick={() => {
                onSelectConfigPath(null);
                setOpen(false);
              }}
            >
              <FormattedMessage
                id="codex.environmentSelector.noEnvironment"
                defaultMessage="No environment"
                description="No environment selected message"
              />
            </Dropdown.Item>
          ) : null}
          {showDefaultOption && defaultEnvironment ? (
            <Dropdown.Item
              RightIcon={
                normalizedSelected != null &&
                normalizePath(defaultEnvironment.configPath) ===
                  normalizedSelected
                  ? CheckMdIcon
                  : undefined
              }
              onClick={() => {
                onSelectConfigPath(defaultEnvironment.configPath);
                setOpen(false);
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Tooltip
                  tooltipContent={
                    <FormattedMessage
                      id="composer.worktreeEnvironment.default"
                      defaultMessage="Default environment"
                      description="Tooltip for default local environment icon"
                    />
                  }
                >
                  <StarIcon className="icon-xxs shrink-0 text-token-description-foreground" />
                </Tooltip>
                <span className="truncate">
                  {getEnvironmentLabelForOption(defaultEnvironment)}
                </span>
              </div>
            </Dropdown.Item>
          ) : null}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="icon-xxs" />
            </div>
          ) : hasError ? (
            <Dropdown.Message compact tone="error">
              <FormattedMessage
                id="composer.worktreeEnvironment.error"
                defaultMessage="Error loading environments"
                description="Error state for worktree environment dropdown"
              />
            </Dropdown.Message>
          ) : availableEnvironments.length > 0 ? (
            <div className="flex flex-col">
              {availableEnvironments.map((environment) => {
                const isSelected =
                  selectedConfigPath != null &&
                  normalizePath(environment.configPath) === normalizedSelected;
                return (
                  <Dropdown.Item
                    key={environment.configPath}
                    RightIcon={isSelected ? CheckMdIcon : undefined}
                    onClick={() => {
                      onSelectConfigPath(environment.configPath);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 truncate">
                      {getEnvironmentLabelForOption(environment)}
                    </span>
                  </Dropdown.Item>
                );
              })}
            </div>
          ) : environments.length === 0 ? (
            <Dropdown.Message compact>
              <FormattedMessage
                id="codex.environments.noEnvironmentsFound"
                defaultMessage="No environments found"
                description="Message shown when no Codex environments were found"
              />
            </Dropdown.Message>
          ) : null}
        </div>
        <Dropdown.Separator />
        <Dropdown.Section className="flex flex-col pb-1">
          <Dropdown.Item
            LeftIcon={LinkExternalIcon}
            onClick={() => {
              onOpenSettings();
              setOpen(false);
            }}
          >
            <FormattedMessage
              id="composer.worktreeEnvironment.create"
              defaultMessage="Create local environment"
              description="CTA to open local environment settings from worktree dropdown"
            />
          </Dropdown.Item>
        </Dropdown.Section>
      </div>
    </BasicDropdown>
  );
}

function getEnvironmentFileName(configPath: string): string {
  const normalized = normalizePath(configPath);
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}

function getEnvironmentLabelForOption(
  environment: LocalEnvironmentResultWithPath,
): string {
  if (environment.type === "success") {
    const name = environment.environment.name.trim();
    return name.length > 0
      ? name
      : getEnvironmentFileName(environment.configPath);
  }
  return getEnvironmentFileName(environment.configPath);
}

function getEnvironmentLabel({
  isLoading,
  selectedEnvironment,
}: {
  isLoading: boolean;
  selectedEnvironment: LocalEnvironmentResultWithPath | null;
}): ReactElement {
  if (isLoading) {
    return (
      <FormattedMessage
        id="composer.worktreeEnvironment.loading"
        defaultMessage="Loading environments…"
        description="Loading label for worktree environment dropdown"
      />
    );
  } else if (selectedEnvironment?.type === "success") {
    return <>{selectedEnvironment.environment.name}</>;
  }
  return (
    <FormattedMessage
      id="codex.environmentSelector.noEnvironment"
      defaultMessage="No environment"
      description="No environment selected message"
    />
  );
}
