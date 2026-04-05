import type { LocalConversationItemOrHook } from "./local-conversation-item";

export function isItemStillRunning(
  item: LocalConversationItemOrHook | null,
): boolean {
  if (!item) {
    return false;
  }

  switch (item.type) {
    case "user-message":
    case "turn-diff":
    case "system-error":
    case "stream-error":
    case "remote-task-created":
    case "personality-changed":
    case "forked-from-conversation":
    case "model-changed":
    case "model-rerouted":
    case "plan-implementation":
    case "worked-for":
      return false;
    case "context-compaction":
      return !item.completed;
    case "hook":
      return item.run.status === "running";
    case "assistant-message":
    case "proposed-plan":
    case "reasoning":
      return !item.completed;
    case "exec":
      return item.output?.exitCode === undefined;
    case "patch":
      return item.success == null;
    case "mcp-tool-call":
      return !item.completed;
    case "automatic-approval-review":
      return item.status === "inProgress";
    case "multi-agent-action":
      return item.status === "inProgress";
    case "web-search":
      return !item.completed;
    case "todo-list":
      return item.plan.some((step) => step.status !== "completed");
    case "userInput":
      return !item.completed;
    case "user-input-response":
    case "mcp-server-elicitation":
      return !item.completed;
  }
}
