import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { DropdownSearchInput } from "@/components/dropdown";
import XIcon from "@/icons/x.svg";

export function RecentTaskSearch({
  searchQuery,
  onQueryChange,
  autoFocus = false,
}: {
  searchQuery: string;
  onQueryChange: (query: string) => void;
  autoFocus?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  return (
    <div>
      <label className="sr-only" htmlFor="recent-tasks-search">
        <FormattedMessage
          id="codex.recentTasksMenu.search"
          defaultMessage="Search recent tasks"
          description="Label for the recent tasks menu search input"
        />
      </label>
      <DropdownSearchInput
        id="recent-tasks-search"
        autoFocus={autoFocus}
        value={searchQuery}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={intl.formatMessage({
          id: "codex.recentTasksMenu.search",
          defaultMessage: "Search recent tasks",
          description: "Label for the recent tasks menu search input",
        })}
        trailingContent={
          searchQuery.length > 0 ? (
            <button
              type="button"
              className="flex items-center justify-center text-token-input-placeholder-foreground transition-colors hover:text-token-foreground"
              onClick={() => onQueryChange("")}
              aria-label={intl.formatMessage({
                id: "codex.recentTasksMenu.clearSearch",
                defaultMessage: "Clear search",
                description:
                  "Button label to clear the recent tasks menu search input",
              })}
            >
              <XIcon className="icon-2xs" />
            </button>
          ) : null
        }
      />
    </div>
  );
}
