import { useSetAtom } from "jotai";
import { isCodexWorktree } from "protocol";
import { useEffect } from "react";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import CloudIcon from "@/icons/cloud.svg";
import MacbookIcon from "@/icons/macbook.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { useGate } from "@/statsig/statsig";
import { useFetchFromVSCode } from "@/vscode-api";

import type { ComposerMode } from "../composer";
import { aLastUsedContinueInMode } from "../composer-view-state";

export function HotkeyWindowHomeLocalWorktreeDropdown({
  composerMode,
  setComposerMode,
  showLabel = false,
  disabledTooltipText,
}: {
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  showLabel?: boolean;
  disabledTooltipText?: string;
}): React.ReactElement {
  const intl = useIntl();
  const setLastUsedContinueInMode = useSetAtom(aLastUsedContinueInMode);
  const isWorktreePickerEnabled = useGate(__statsigName("codex_app_worktrees"));
  const localHostConfig = useHostConfig(DEFAULT_HOST_ID);
  const { data: activeWorkspaceRoots } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const { data: codexHomeResp } = useFetchFromVSCode("codex-home");
  const activeWorkspaceRoot = activeWorkspaceRoots?.roots?.[0] ?? null;
  const { data: gitMetadata } = useGitStableMetadata(
    activeWorkspaceRoot,
    localHostConfig,
  );
  const showWorktree =
    activeWorkspaceRoot != null &&
    gitMetadata?.root != null &&
    isWorktreePickerEnabled &&
    !isCodexWorktree(activeWorkspaceRoot, codexHomeResp?.codexHome);

  useEffect(() => {
    if (disabledTooltipText && composerMode !== "local") {
      setComposerMode("local");
      return;
    }
    if (composerMode === "worktree" && !showWorktree) {
      setComposerMode("local");
    }
  }, [composerMode, disabledTooltipText, setComposerMode, showWorktree]);

  const triggerContent = (
    <>
      {composerMode === "cloud" ? (
        <CloudIcon className="icon-2xs" />
      ) : composerMode === "worktree" && showWorktree ? (
        <WorktreeIcon className="icon-2xs" />
      ) : (
        <MacbookIcon className="icon-2xs" />
      )}
      {showLabel ? (
        <span className="max-w-40 truncate text-left whitespace-nowrap">
          {composerMode === "cloud" ? (
            <FormattedMessage
              id="composer.footer.v2.cloudTab"
              defaultMessage="Cloud"
              description="Cloud mode label"
            />
          ) : composerMode === "worktree" && showWorktree ? (
            <FormattedMessage
              id="composer.mode.worktreeSegment"
              defaultMessage="Worktree"
              description="Worktree mode label for the segmented toggle"
            />
          ) : (
            <FormattedMessage
              id="composer.hotkeyWindow.modeDropdown.localProject"
              defaultMessage="Local project"
              description="Hotkey window overflow menu label for local project mode"
            />
          )}
        </span>
      ) : null}
      <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
    </>
  );
  const triggerButton = (
    <Button size="composerSm" color="ghost" className="gap-1 px-1.5">
      {triggerContent}
    </Button>
  );

  if (disabledTooltipText) {
    return (
      <Tooltip tooltipContent={disabledTooltipText}>
        <span>
          <Button
            size="composerSm"
            color="ghost"
            className="gap-1 px-1.5"
            disabled
          >
            {triggerContent}
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <BasicDropdown
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="composer.hotkeyWindow.modeDropdown.tooltip"
              defaultMessage="Select where to run the task"
              description="Tooltip for the hotkey-window mode selector"
            />
          }
        >
          {triggerButton}
        </Tooltip>
      }
      contentWidth="menuNarrow"
    >
      <Dropdown.Item
        LeftIcon={MacbookIcon}
        RightIcon={composerMode === "local" ? CheckMdIcon : undefined}
        onSelect={() => {
          setLastUsedContinueInMode("local");
          setComposerMode("local");
        }}
      >
        <FormattedMessage
          id="composer.mode.local"
          defaultMessage="Local"
          description="Local mode label"
        />
      </Dropdown.Item>
      <Dropdown.Item
        LeftIcon={CloudIcon}
        RightIcon={composerMode === "cloud" ? CheckMdIcon : undefined}
        onSelect={() => {
          setLastUsedContinueInMode("cloud");
          setComposerMode("cloud");
        }}
      >
        <FormattedMessage
          id="composer.footer.v2.cloudTab"
          defaultMessage="Cloud"
          description="Cloud mode label"
        />
      </Dropdown.Item>
      <Dropdown.Item
        LeftIcon={WorktreeIcon}
        RightIcon={composerMode === "worktree" ? CheckMdIcon : undefined}
        onSelect={() => {
          setLastUsedContinueInMode("worktree");
          setComposerMode("worktree");
        }}
        disabled={!showWorktree}
        tooltipText={
          !showWorktree
            ? intl.formatMessage({
                id: "composer.hotkeyWindow.modeDropdown.localOnly",
                defaultMessage:
                  "Initialize a git repo to run tasks in worktrees",
                description:
                  "Tooltip for disabled hotkey-window worktree mode selector",
              })
            : undefined
        }
      >
        <FormattedMessage
          id="composer.mode.worktreeSegment"
          defaultMessage="Worktree"
          description="Worktree mode label for the segmented toggle"
        />
      </Dropdown.Item>
    </BasicDropdown>
  );
}
