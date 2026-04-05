import type { SystemEventLocalConversationItem } from "./local-conversation-item";

export function SystemErrorContent({
  item,
}: {
  item: SystemEventLocalConversationItem;
}): React.ReactElement {
  return <SystemErrorItemContent content={item.content} />;
}

function SystemErrorItemContent({
  content,
}: {
  content: string;
}): React.ReactElement {
  return (
    <div className="text-size-chat flex w-full wrap-anywhere text-token-description-foreground/80">
      {content}
    </div>
  );
}
