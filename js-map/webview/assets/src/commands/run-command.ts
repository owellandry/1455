import type { CodexCommandId } from "protocol";

import { messageBus } from "@/message-bus";
import { openLocalProjectPicker } from "@/project-setup/open-project-setup-dialog";

type CommandHandler = () => void;

const handleNewThread: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "new-chat" });
};

const handleOpenThreadOverlay: CommandHandler = (): void => {
  if (__WINDOW_TYPE__ !== "electron") {
    return;
  }
  messageBus.dispatchHostMessage({ type: "thread-overlay-open-current" });
};

const handleSettings: CommandHandler = (): void => {
  if (__WINDOW_TYPE__ === "extension") {
    // This settings page is not supported in the extension.
    return;
  }
  messageBus.dispatchHostMessage({
    type: "navigate-to-route",
    path: "/settings",
  });
};

const handleMcpSettings: CommandHandler = (): void => {
  if (__WINDOW_TYPE__ === "extension") {
    // This settings page is not supported in the extension.
    return;
  }
  messageBus.dispatchHostMessage({
    type: "navigate-to-route",
    path: "/settings/mcp-settings",
  });
};

const handlePersonalitySettings: CommandHandler = (): void => {
  if (__WINDOW_TYPE__ === "extension") {
    // This settings page is not supported in the extension.
    return;
  }
  messageBus.dispatchHostMessage({
    type: "navigate-to-route",
    path: "/settings/personalization",
  });
};

const handleManageTasks: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({
    type: "navigate-to-route",
    path: "/inbox?automationMode=create",
  });
};

const handleOpenSkills: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({
    type: "navigate-to-route",
    path: "/skills",
  });
};

const handleOpenFolder: CommandHandler = (): void => {
  if (__WINDOW_TYPE__ !== "electron") {
    return;
  }
  openLocalProjectPicker();
};

const handleToggleSidebar: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "toggle-sidebar" });
};

const handleToggleTerminal: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "toggle-terminal" });
};

const handleToggleDiffPanel: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "toggle-diff-panel" });
};

const handleFindInThread: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "find-in-thread" });
};

const handleNavigateBack: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "navigate-back" });
};

const handleNavigateForward: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "navigate-forward" });
};

const handlePreviousThread: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "previous-thread" });
};

const handleNextThread: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "next-thread" });
};

const handleLogOut: CommandHandler = (): void => {
  messageBus.dispatchHostMessage({ type: "log-out" });
};

const BASE_COMMAND_HANDLERS = new Map<CodexCommandId, CommandHandler>([
  ["newThread", handleNewThread],
  ["openThreadOverlay", handleOpenThreadOverlay],
  ["settings", handleSettings],
  ["mcpSettings", handleMcpSettings],
  ["personalitySettings", handlePersonalitySettings],
  ["manageTasks", handleManageTasks],
  ["openSkills", handleOpenSkills],
  ["openFolder", handleOpenFolder],
  ["toggleSidebar", handleToggleSidebar],
  ["toggleTerminal", handleToggleTerminal],
  ["toggleDiffPanel", handleToggleDiffPanel],
  ["findInThread", handleFindInThread],
  ["navigateBack", handleNavigateBack],
  ["navigateForward", handleNavigateForward],
  ["previousThread", handlePreviousThread],
  ["nextThread", handleNextThread],
  ["logOut", handleLogOut],
]);

const REGISTERED_COMMAND_HANDLERS = new Map<
  CodexCommandId,
  Set<CommandHandler>
>();

export function registerCommand(
  id: CodexCommandId,
  handler: CommandHandler,
): () => void {
  const handlers = REGISTERED_COMMAND_HANDLERS.get(id) ?? new Set();
  handlers.add(handler);
  REGISTERED_COMMAND_HANDLERS.set(id, handlers);
  return (): void => {
    const currentHandlers = REGISTERED_COMMAND_HANDLERS.get(id);
    if (!currentHandlers) {
      return;
    }
    currentHandlers.delete(handler);
    if (currentHandlers.size === 0) {
      REGISTERED_COMMAND_HANDLERS.delete(id);
    }
  };
}

/** Runs a Codex command by id, reusing existing message-bus flows where possible. */
export function runCommand(id: CodexCommandId): void {
  const handlers = REGISTERED_COMMAND_HANDLERS.get(id);
  if (handlers && handlers.size > 0) {
    for (const handler of handlers) {
      handler();
    }
    return;
  }
  const handler = BASE_COMMAND_HANDLERS.get(id);
  if (handler) {
    handler();
  }
}
