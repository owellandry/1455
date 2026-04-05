import { FormattedMessage } from "react-intl";

import CompactionIcon from "@/icons/compaction.svg";

export function ContextCompactionItemContent({
  completed,
  completedLabel,
  inProgressLabel,
  showCompletedIcon = true,
}: {
  completed: boolean;
  completedLabel?: React.ReactNode;
  inProgressLabel?: React.ReactNode;
  showCompletedIcon?: boolean;
}): React.ReactElement {
  const resolvedCompletedLabel = completedLabel ?? (
    <FormattedMessage
      id="localConversation.contextCompacted"
      defaultMessage="Context automatically compacted"
      description="Synthetic divider shown when context compaction occurs."
    />
  );
  const resolvedInProgressLabel = inProgressLabel ?? (
    <FormattedMessage
      id="localConversation.contextCompacting"
      defaultMessage="Automatically compacting context"
      description="In-progress label shown while context compaction is running."
    />
  );

  return (
    <div className="text-size-chat my-2 flex items-center gap-2 text-token-text-secondary">
      <div className="flex-1 border-t border-current/20" />
      <div className="flex items-center gap-1 whitespace-nowrap">
        {completed && showCompletedIcon ? (
          <CompactionIcon className="icon-2xs" />
        ) : null}
        {completed ? (
          resolvedCompletedLabel
        ) : (
          <span className="loading-shimmer-pure-text">
            {resolvedInProgressLabel}
          </span>
        )}
      </div>
      <div className="flex-1 border-t border-current/20" />
    </div>
  );
}
