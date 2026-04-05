import { useState } from "react";
import { defineMessages, FormattedMessage } from "react-intl";

import { Badged } from "@/components/badged";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import BranchIcon from "@/icons/branch.svg";
import CheckMdIcon from "@/icons/check-md.svg";

import "prosemirror-view/style/prosemirror.css";
import ChevronIcon from "@/icons/chevron.svg";

import type { CloudFollowUpStartingState } from "./composer";

export function CloudFollowUpStartingStateDropdown({
  startingState,
  setStartingState,
}: {
  startingState: CloudFollowUpStartingState;
  setStartingState: (state: CloudFollowUpStartingState) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);

  const label =
    startingState === "working-tree" ? (
      <FormattedMessage {...messages.workingTree} />
    ) : (
      <FormattedMessage {...messages.directFollowUp} />
    );

  return (
    <BasicDropdown
      side="top"
      open={open}
      onOpenChange={setOpen}
      triggerButton={
        <Tooltip
          tooltipContent={
            <div className="flex flex-col gap-2">
              <FormattedMessage
                id="composer.remote.startingPoint"
                defaultMessage="What code should this task start from?"
                description="Section label for remote starting point selector"
              />
            </div>
          }
        >
          <Button size="composerSm" color="ghost">
            <Badged
              borderColor="border-token-side-bar-background"
              badgeEnabled={startingState === "working-tree"}
            >
              <BranchIcon className="icon-2xs" />
            </Badged>
            <span className="truncate max-[440px]:hidden">{label}</span>
            <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
          </Button>
        </Tooltip>
      }
    >
      <div className="flex flex-col gap-1 pt-1">
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="composer.remote.currentEditsSuffix.followUp"
              defaultMessage="Create a new task that references this cloud task."
              description="Suffix text indicating the selection includes current edits"
            />
          }
        >
          <Dropdown.Item
            LeftIcon={BadgedBranchIcon}
            RightIcon={
              startingState === "working-tree" ? CheckMdIcon : undefined
            }
            onClick={() => {
              setStartingState("working-tree");
              setOpen(false);
            }}
          >
            <FormattedMessage {...messages.workingTree} />
          </Dropdown.Item>
        </Tooltip>
        <Dropdown.Item
          LeftIcon={BranchIcon}
          RightIcon={
            startingState === "direct-follow-up" ? CheckMdIcon : undefined
          }
          onClick={() => {
            setStartingState("direct-follow-up");
            setOpen(false);
          }}
        >
          <FormattedMessage {...messages.directFollowUp} />
        </Dropdown.Item>
      </div>
    </BasicDropdown>
  );
}

function BadgedBranchIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Badged borderColor="border-token-dropdown-background">
      <BranchIcon className={className} />
    </Badged>
  );
}

const messages = defineMessages({
  workingTree: {
    id: "composer.remote.localWorkingTree",
    defaultMessage: "Use local changes",
    description: "Label for local working tree selection in remote composer",
  },
  directFollowUp: {
    id: "composer.remote.directFollowUp",
    defaultMessage: "Don't use local changes",
    description: "Label for direct follow-up selection in remote composer",
  },
});
