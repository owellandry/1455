export function InlineStatusItemContent({
  icon,
  message,
  isShimmering = false,
  trailingContent,
}: {
  icon?: React.ReactNode;
  message: React.ReactNode;
  isShimmering?: boolean;
  trailingContent?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="text-size-chat my-2 flex items-center gap-2 text-token-text-secondary">
      <div className="flex-1 border-t border-current/20" />
      <div className="flex items-center gap-1 whitespace-nowrap">
        {icon ? icon : null}
        {isShimmering ? (
          <span className="loading-shimmer-pure-text">{message}</span>
        ) : (
          message
        )}
        {trailingContent}
      </div>
      <div className="flex-1 border-t border-current/20" />
    </div>
  );
}
