import type { MessageDescriptor } from "react-intl";
import { defineMessages, FormattedMessage } from "react-intl";

import { BasicDropdown, Dropdown } from "@/components/dropdown";
import ChevronDownIcon from "@/icons/chevron.svg";

import type { FilterState } from "./recent-tasks-menu";

const recentsMenuMessages = defineMessages({
  recent: {
    id: "codex.recentTasksMenu.recent",
    defaultMessage: "All tasks",
    description: "Menu title for recent Codex tasks",
  },
  cloud: {
    id: "codex.recentTasksMenu.cloud",
    defaultMessage: "Cloud tasks",
    description: "Menu title for cloud Codex tasks",
  },
  local: {
    id: "codex.recentTasksMenu.local",
    defaultMessage: "Local tasks",
    description: "Menu title for local Codex tasks",
  },
}) satisfies Record<FilterState, MessageDescriptor>;

export function RecentsMenuHeader({
  filter,
  onSelect,
}: {
  filter: FilterState;
  onSelect: (f: FilterState) => void;
}): React.ReactElement {
  const label = recentsMenuMessages[filter];
  return (
    <BasicDropdown
      triggerButton={
        <button className="flex items-center gap-1 px-2 pt-2 text-sm font-medium text-token-input-placeholder-foreground hover:text-token-foreground">
          <span>
            <FormattedMessage {...label} />
          </span>
          <ChevronDownIcon className="icon-2xs" />
        </button>
      }
    >
      <div className="flex flex-col">
        <Dropdown.Item onClick={() => onSelect("recent")}>
          <FormattedMessage
            id="codex.recentTasksMenu.recent"
            defaultMessage="All tasks"
            description="Menu title for recent Codex tasks"
          />
        </Dropdown.Item>
        <Dropdown.Item onClick={() => onSelect("cloud")}>
          <FormattedMessage
            id="codex.recentTasksMenu.cloud"
            defaultMessage="Cloud tasks"
            description="Menu title for cloud Codex tasks"
          />
        </Dropdown.Item>
        <Dropdown.Item onClick={() => onSelect("local")}>
          <FormattedMessage
            id="codex.recentTasksMenu.local"
            defaultMessage="Local tasks"
            description="Menu title for local Codex tasks"
          />
        </Dropdown.Item>
      </div>
    </BasicDropdown>
  );
}
