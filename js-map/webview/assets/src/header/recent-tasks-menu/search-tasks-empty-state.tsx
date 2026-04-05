import { FormattedMessage } from "react-intl";

export function SearchTasksEmptyState(): React.ReactElement {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-token-input-placeholder-foreground">
      <FormattedMessage
        id="codex.recentTasksMenu.searchEmpty"
        defaultMessage="No result"
        description="Empty state for recent tasks menu search results"
      />
    </div>
  );
}
