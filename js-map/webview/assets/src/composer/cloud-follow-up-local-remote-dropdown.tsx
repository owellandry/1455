import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { defineMessages, FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import Cloud from "@/icons/cloud.svg";
import Macbook from "@/icons/macbook.svg";

import type { ComposerMode } from "./composer";
import type { FollowUpProps } from "./composer-follow-up";
import { aLastUsedContinueInMode } from "./composer-view-state";

export function CloudFollowUpLocalRemoteDropdown({
  composerMode,
  setComposerMode,
  followUp,
}: {
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  followUp: FollowUpProps;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const setLastUsedContinueInMode = useSetAtom(aLastUsedContinueInMode);
  const executionTarget = useWebviewExecutionTarget();
  const { data: gitMetadata, isLoading: isGitMetadataLoading } =
    useGitStableMetadata(executionTarget.cwd, executionTarget.hostConfig);
  const hasGitRepo = gitMetadata?.root != null;
  const hasAppliedCodeLocally =
    followUp.type === "cloud" && followUp.hasAppliedCodeLocally;
  useEffect(() => {
    // If the user has applied code locally, we should default to local mode so they
    // can quickly iterate on the code they just applied.
    if (hasAppliedCodeLocally) {
      setComposerMode("local");
    }
  }, [hasAppliedCodeLocally, setComposerMode]);
  useEffect(() => {
    if (isGitMetadataLoading) {
      return;
    }
    if (hasGitRepo) {
      return;
    }
    if (composerMode !== "local") {
      setComposerMode("local");
    }
  }, [composerMode, hasGitRepo, isGitMetadataLoading, setComposerMode]);

  const label =
    composerMode === "local" ? (
      <FormattedMessage {...messages.local} />
    ) : (
      <FormattedMessage {...messages.cloud} />
    );

  return (
    <BasicDropdown
      side="top"
      open={open}
      onOpenChange={setOpen}
      triggerButton={
        <Tooltip tooltipContent={<FormattedMessage {...messages.tooltip} />}>
          <Button size="composerSm" color="ghost" className="min-w-0">
            {composerMode === "cloud" ? (
              <Cloud className="icon-2xs" />
            ) : (
              <Macbook className="icon-2xs" />
            )}
            <span className="composer-footer__label--xs max-w-40 truncate">
              {label}
            </span>
            <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
          </Button>
        </Tooltip>
      }
    >
      <div className="flex w-44 flex-col">
        <Dropdown.Title>
          <FormattedMessage
            id="composer.mode.newTask.header"
            defaultMessage="Continue in"
            description="Header label above agent mode options"
          />
        </Dropdown.Title>
        <Dropdown.Item
          LeftIcon={Macbook}
          RightIcon={composerMode === "local" ? CheckMdIcon : undefined}
          onClick={() => {
            setLastUsedContinueInMode("local");
            setComposerMode("local");
            setOpen(false);
          }}
        >
          <FormattedMessage {...messages.local} />
        </Dropdown.Item>
        {hasGitRepo ? (
          <Dropdown.Item
            LeftIcon={Cloud}
            RightIcon={composerMode === "cloud" ? CheckMdIcon : undefined}
            onClick={() => {
              setLastUsedContinueInMode("cloud");
              setComposerMode("cloud");
              setOpen(false);
            }}
          >
            <FormattedMessage {...messages.cloud} />
          </Dropdown.Item>
        ) : null}
      </div>
    </BasicDropdown>
  );
}

const messages = defineMessages({
  local: {
    id: "composer.cloudFollowUp.local",
    defaultMessage: "Local",
    description: "Local follow-up option",
  },
  cloud: {
    id: "composer.cloudFollowUp.cloud",
    defaultMessage: "Cloud",
    description: "Cloud follow-up option",
  },
  tooltip: {
    id: "composer.cloudFollowUp.whereRun",
    defaultMessage: "Where should this follow-up run?",
    description: "Tooltip for choosing between local and cloud follow-ups",
  },
});
