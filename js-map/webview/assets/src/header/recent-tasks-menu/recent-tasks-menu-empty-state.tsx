import { FormattedMessage } from "react-intl";

export function RecentTasksMenuEmptyState(): React.ReactElement {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-token-input-placeholder-foreground">
      <FormattedMessage
        id="codex.recentTasksMenu.empty"
        defaultMessage="No threads yet"
        description="Empty state for recent tasks menu"
      />
    </div>
  );
}
