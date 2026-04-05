export function ConversationGap({
  size,
}: {
  size?: string;
}): React.ReactElement {
  return (
    <div
      aria-hidden
      className="w-full"
      style={{ height: size ?? "var(--conversation-tool-assistant-gap, 8px)" }}
    />
  );
}
