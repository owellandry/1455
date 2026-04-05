import { useScope } from "maitai";
import { useEffect } from "react";

import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import {
  startContentSearchOrchestration,
  type ContentSearchOrchestrationSources,
} from "./search-model";

export function ContentSearchControllerBridge({
  conversationSource = null,
  diffSource = null,
}: Partial<ContentSearchOrchestrationSources>): null {
  const scope = useScope(ThreadRouteScope);

  useEffect(() => {
    return startContentSearchOrchestration(scope, {
      conversationSource,
      diffSource,
    });
  }, [conversationSource, diffSource, scope]);

  return null;
}
