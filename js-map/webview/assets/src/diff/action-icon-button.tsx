import type React from "react";
import { useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import MinusIcon from "@/icons/minus.svg";
import PlusIcon from "@/icons/plus.svg";
import UndoIcon from "@/icons/undo.svg";

export function LocalEnvironmentActionIcon({
  action,
  scope,
  onClick,
}: {
  action: "stage" | "unstage" | "revert";
  scope?: "file" | "hunk" | "section";
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}): React.ReactElement {
  const intl = useIntl();
  let icon = <UndoIcon className="icon-2xs" />;
  if (action === "stage") {
    icon = <PlusIcon className="icon-2xs" />;
  } else if (action === "unstage") {
    icon = <MinusIcon className="icon-2xs" />;
  }

  let tooltip: string | undefined;
  if (scope === "file") {
    if (action === "stage") {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.stageFile",
        defaultMessage: "Stage file",
        description: "Tooltip to stage a file using a git action",
      });
    } else if (action === "unstage") {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.unstageFile",
        defaultMessage: "Unstage file",
        description: "Tooltip to unstage a file using a git action",
      });
    } else {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.revertFile",
        defaultMessage: "Revert file",
        description: "Tooltip to revert a file using a git action",
      });
    }
  } else if (scope === "hunk") {
    if (action === "stage") {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.stageHunk",
        defaultMessage: "Stage",
        description: "Tooltip to stage a hunk using a git action",
      });
    } else if (action === "unstage") {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.unstageHunk",
        defaultMessage: "Unstage",
        description: "Tooltip to unstage a hunk using a git action",
      });
    } else {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.revertHunk",
        defaultMessage: "Revert",
        description: "Tooltip to revert a hunk using a git action",
      });
    }
  } else if (scope === "section") {
    if (action === "stage") {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.stageSection",
        defaultMessage: "Stage all",
        description: "Tooltip to stage a section using a git action",
      });
    } else if (action === "unstage") {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.unstageSection",
        defaultMessage: "Unstage all",
        description: "Tooltip to unstage a section using a git action",
      });
    } else {
      tooltip = intl.formatMessage({
        id: "diff.actionButton.revertSection",
        defaultMessage: "Revert all",
        description: "Tooltip to revert a section using a git action",
      });
    }
  }

  return (
    <Tooltip tooltipContent={tooltip}>
      <Button
        color="ghost"
        size="composerSm"
        uniform
        aria-label={tooltip}
        onClick={onClick}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}
