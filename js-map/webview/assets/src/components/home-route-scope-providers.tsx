import { ScopeProvider } from "maitai";
import type { ConversationId } from "protocol";
import type { ReactElement, ReactNode } from "react";

import {
  type ThreadRouteScopeValue,
  ThreadRouteScope,
} from "@/scopes/thread-route-scope";
import { ThreadScope } from "@/scopes/thread-scope";

export function HomeRouteScopeProviders({
  children,
  containerRef,
  threadId,
  threadRoute,
}: {
  children: ReactNode;
  containerRef?: React.Ref<HTMLDivElement>;
  threadId: ConversationId;
  threadRoute: ThreadRouteScopeValue;
}): ReactElement {
  return (
    <ScopeProvider
      scope={ThreadScope}
      value={{ threadId, threadType: "local" }}
    >
      <ScopeProvider scope={ThreadRouteScope} value={threadRoute}>
        <div
          className="flex h-full flex-col"
          // Define "context variable" for VS Code contextual menu support.
          // This variable is referenced in a "where" clause in package.json.
          data-vscode-context='{"chatgpt.supportsNewChatMenu": true}'
          tabIndex={0}
          ref={containerRef}
        >
          {children}
        </div>
      </ScopeProvider>
    </ScopeProvider>
  );
}
