import { ScopeProvider } from "maitai";
import type { ConversationId } from "protocol";
import type { ReactElement, ReactNode } from "react";

import {
  useAppServerManagerForConversationIdOrDefault,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { HeartbeatAutomationThreadBridge } from "@/automations/heartbeat-automation-thread-bridge";
import {
  createThreadRouteScopeValue,
  ThreadRouteScope,
} from "@/scopes/thread-route-scope";
import { ThreadScope } from "@/scopes/thread-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { useFetchFromVSCode } from "@/vscode-api";

export function LocalConversationRouteScopeProviders({
  children,
  conversationId,
}: {
  children: ReactNode;
  conversationId: ConversationId;
}): ReactElement {
  const conversationCwd = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.cwd ?? null,
  );
  const conversationHostId = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.hostId ?? null,
  );
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data) => data.codexHome,
  });
  const { data: activeWorkspaceRoot } = useFetchFromVSCode(
    "active-workspace-roots",
    {
      select: (data): string | null => data.roots?.[0] ?? null,
    },
  );
  const effectiveHostId = conversationHostId ?? appServerManager.getHostId();
  const hostConfig = useHostConfig(effectiveHostId);
  const effectiveCwd = conversationCwd ?? activeWorkspaceRoot ?? null;

  return (
    <ScopeProvider
      scope={ThreadScope}
      value={{ threadId: conversationId, threadType: "local" }}
    >
      <ScopeProvider
        scope={ThreadRouteScope}
        value={createThreadRouteScopeValue({
          codexHome: codexHome ?? null,
          cwd: effectiveCwd,
          hostConfig,
          hostId: effectiveHostId,
        })}
      >
        <HeartbeatAutomationThreadBridge conversationId={conversationId} />
        {children}
      </ScopeProvider>
    </ScopeProvider>
  );
}
