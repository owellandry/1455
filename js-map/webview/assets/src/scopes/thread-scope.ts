import { scope, type Scope } from "maitai";
import type { ConversationId } from "protocol";

import { AppScope } from "@/scopes/app-scope";

export type ThreadScopeValue =
  | {
      threadId: ConversationId;
      threadType: "local";
    }
  | {
      threadId: string;
      threadType: "remote";
    };

export const ThreadScope = scope<
  "ThreadScope",
  ThreadScopeValue,
  typeof AppScope
>("ThreadScope", {
  parent: AppScope,
});

export type ThreadScopeHandle = Scope<typeof ThreadScope>;
