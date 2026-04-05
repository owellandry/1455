import type { LocalConversationItemOrHook } from "./local-conversation-item";

export function isAgentBodyItem(item: LocalConversationItemOrHook): boolean {
  switch (item.type) {
    case "todo-list":
    case "turn-diff":
    case "user-message":
    case "hook":
    case "remote-task-created":
    case "proposed-plan":
    case "plan-implementation":
    case "mcp-server-elicitation":
    case "userInput":
    case "personality-changed":
    case "forked-from-conversation":
    case "model-changed":
    case "model-rerouted":
      return false;
    case "web-search":
      return item.query.trim().length > 0;
    case "assistant-message":
    case "exec":
    case "patch":
    case "mcp-tool-call":
    case "automatic-approval-review":
    case "multi-agent-action":
    case "stream-error":
    case "system-error":
    case "context-compaction":
    case "reasoning":
    case "user-input-response":
    case "worked-for":
      return true;
  }
}
