import clsx from "clsx";
import { FormattedMessage } from "react-intl";

import ChevronRight from "@/icons/chevron-right.svg";

import { WorkedForLabel } from "./items/worked-for-item-content";

export function CollapsedTurnSectionToggle({
  collapsedMessageCount,
  workedForTimeLabel,
  isCollapsed,
  onToggle,
}: {
  collapsedMessageCount: number;
  workedForTimeLabel: string | null;
  isCollapsed: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const label =
    workedForTimeLabel != null ? (
      <WorkedForLabel timeLabel={workedForTimeLabel} />
    ) : (
      <span className="text-token-foreground/60">
        <FormattedMessage
          id="localConversation.previousMessagesSummary"
          defaultMessage="{count, plural, one {# previous message} other {# previous messages}}"
          description="Summary shown in collapsed turns when no worked-for duration is available"
          values={{ count: collapsedMessageCount }}
        />
      </span>
    );

  return (
    <div className="text-size-chat flex items-center gap-2 text-token-text-secondary">
      <div className="flex-1 border-t border-current/20" />
      <button
        type="button"
        className="text-size-chat hover:bg-token-bg-subtle inline-flex items-center gap-2 rounded-md border border-transparent py-1 focus-visible:ring-2 focus-visible:ring-token-focus-border focus-visible:outline-none"
        aria-expanded={!isCollapsed}
        onClick={() => {
          onToggle();
        }}
      >
        <span>{label}</span>
        <ChevronRight
          className={clsx(
            "icon-2xs transition-transform duration-200",
            isCollapsed ? "rotate-0" : "rotate-90",
          )}
        />
      </button>
      <div className="flex-1 border-t border-current/20" />
    </div>
  );
}
