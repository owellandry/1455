import clsx from "clsx";
import type { ConversationId, GitCwd } from "protocol";
import type React from "react";

import { Markdown } from "./markdown";

export function MarkdownSurface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "relative overflow-clip rounded-lg bg-token-foreground/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MarkdownSurfaceBody({
  markdown,
  conversationId = null,
  cwd = null,
  hideCodeBlocks,
  fadeType = "none",
}: {
  markdown: string;
  conversationId?: ConversationId | null;
  cwd?: GitCwd | null;
  hideCodeBlocks?: boolean;
  fadeType?: "none" | "indexed";
}): React.ReactElement {
  return (
    <div className="px-4 py-3">
      <Markdown
        className="text-size-chat"
        conversationId={conversationId}
        hideCodeBlocks={hideCodeBlocks}
        fadeType={fadeType}
        cwd={cwd}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
