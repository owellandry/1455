import clsx from "clsx";
import { useAtom } from "jotai";
import type React from "react";
import { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useEnvironmentSearch, useWorkspaceEnvironments } from "@/codex-api";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import CheckMdIcon from "@/icons/check-md.svg";
import DockIcon from "@/icons/dock.svg";
import { useEnvironment } from "@/utils/use-environment";

import { aCloudTasksEnvFilterIdAtom } from "./recent-task-menu-atoms";

export function RecentTasksMenuEnvironmentsFilterDropdown({
  className,
}: {
  className?: string;
}): React.ReactElement {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [envQuery, setEnvQuery] = useState("");
  const [envFilterId, setEnvFilterId] = useAtom(aCloudTasksEnvFilterIdAtom);
  const selectedRunEnvironment = useEnvironment();

  const {
    data: envs,
    isLoading: isLoadingWorkspaceEnvironments,
    isError: isEnvError,
    refetch: refetchEnvs,
  } = useWorkspaceEnvironments();

  const {
    data: searchResults,
    isLoading: isSearching,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useEnvironmentSearch(envQuery, { enabled: envQuery.trim().length > 0 });

  const listToShow = useMemo(() => {
    const q = envQuery.trim();
    const base = q.length > 0 ? (searchResults ?? []) : (envs ?? []);
    // If no query, lift the current run environment to the top of the list.
    if (q.length === 0 && selectedRunEnvironment) {
      const top = base.find((e) => e.id === selectedRunEnvironment.id);
      if (!top) {
        return base;
      }
      const rest = base.filter((e) => e.id !== selectedRunEnvironment.id);
      return [top, ...rest];
    }
    return base;
  }, [envs, searchResults, envQuery, selectedRunEnvironment]);

  const selectedFilterEnv = useMemo(() => {
    return envs?.find((e) => e.id === envFilterId) ?? null;
  }, [envFilterId, envs]);

  return (
    <BasicDropdown
      contentWidth="menuWide"
      side="top"
      open={open}
      onOpenChange={setOpen}
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="codex.recentTasksMenu.filterTooltip"
              defaultMessage="Filter tasks by environment"
              description="Tooltip explaining the environment filter button"
            />
          }
        >
          <Button
            color="ghost"
            size={envFilterId ? "default" : "icon"}
            className={clsx("mr-1", className)}
          >
            <span className="flex items-center gap-1.5">
              <DockIcon className="icon-2xs" />
              {!!envFilterId && selectedFilterEnv?.label && (
                <span className="text-sm">{selectedFilterEnv.label}</span>
              )}
            </span>
          </Button>
        </Tooltip>
      }
    >
      <div className="flex max-w-full flex-col py-1">
        <div className="pb-1 text-xs tracking-wide text-token-input-placeholder-foreground uppercase">
          <FormattedMessage
            id="codex.recentTasksMenu.filterCloudTasks"
            defaultMessage="Filter cloud tasks"
            description="Title for environment filter menu in recent tasks"
          />
        </div>
        <Dropdown.Item
          className={envFilterId ? undefined : "font-medium"}
          RightIcon={envFilterId ? undefined : CheckMdIcon}
          onClick={() => {
            setEnvFilterId(null);
            setOpen(false);
          }}
        >
          <FormattedMessage
            id="codex.recentTasksMenu.filterAll"
            defaultMessage="All"
            description="All environments filter option"
          />
        </Dropdown.Item>

        <Dropdown.Separator />
        <Dropdown.Section className="my-1">
          <Dropdown.SearchInput
            placeholder={intl.formatMessage({
              id: "composer.searchEnvironments",
              defaultMessage: "Search environments",
              description: "Search environments placeholder",
            })}
            value={envQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEnvQuery(e.currentTarget.value)
            }
          />
        </Dropdown.Section>
        <Dropdown.Section className="flex max-h-[140px] flex-col overflow-y-auto pb-1">
          {envQuery.trim().length > 0 && isSearchError ? (
            <Dropdown.Message className="flex w-full items-center justify-center gap-2">
              <span>
                <FormattedMessage
                  id="codex.environments.searchError"
                  defaultMessage="Failed to search environments."
                  description="Error shown when environment search fails"
                />
              </span>
              <Button
                size="default"
                color="outline"
                onClick={() => refetchSearch()}
              >
                <FormattedMessage
                  id="codex.common.retry"
                  defaultMessage="Retry"
                  description="Retry button"
                />
              </Button>
            </Dropdown.Message>
          ) : envQuery.trim().length === 0 && isEnvError ? (
            <Dropdown.Message className="flex w-full items-center justify-center gap-2">
              <span>
                <FormattedMessage
                  id="codex.environments.listError"
                  defaultMessage="Failed to load environments."
                  description="Error shown when listing environments fails"
                />
              </span>
              <Button
                size="default"
                color="outline"
                onClick={() => refetchEnvs()}
              >
                <FormattedMessage
                  id="codex.common.retry"
                  defaultMessage="Retry"
                  description="Retry button"
                />
              </Button>
            </Dropdown.Message>
          ) : listToShow?.length > 0 ? (
            listToShow.map((env) => {
              const isSelected = env.id === envFilterId;
              return (
                <Dropdown.Item
                  key={env.id}
                  className={isSelected ? "font-medium" : undefined}
                  RightIcon={isSelected ? CheckMdIcon : undefined}
                  onClick={() => {
                    setEnvFilterId(env.id);
                    setOpen(false);
                  }}
                >
                  {env.label}
                </Dropdown.Item>
              );
            })
          ) : isSearching || isLoadingWorkspaceEnvironments ? (
            <Spinner className="icon-xxs my-2 self-center text-token-description-foreground" />
          ) : (
            <Dropdown.Message centered>
              <FormattedMessage
                id="codex.environments.noEnvironmentsFound"
                defaultMessage="No environments found"
                description="Message shown when no Codex environments were found"
              />
            </Dropdown.Message>
          )}
        </Dropdown.Section>
      </div>
    </BasicDropdown>
  );
}
