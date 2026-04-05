import type { ConversationId } from "./protocol";

export const HOTKEY_WINDOW_ROUTE_PREFIX = "/hotkey-window";
export const HOTKEY_WINDOW_HOME_ROUTE = HOTKEY_WINDOW_ROUTE_PREFIX;
export const HOTKEY_WINDOW_NEW_THREAD_ROUTE = `${HOTKEY_WINDOW_ROUTE_PREFIX}/new-thread`;
const HOTKEY_WINDOW_THREAD_ROUTE_PREFIX = `${HOTKEY_WINDOW_ROUTE_PREFIX}/thread`;
export const HOTKEY_WINDOW_THREAD_ROUTE_PATTERN = `${HOTKEY_WINDOW_THREAD_ROUTE_PREFIX}/:conversationId`;
const HOTKEY_WINDOW_REMOTE_ROUTE_PREFIX = `${HOTKEY_WINDOW_ROUTE_PREFIX}/remote`;
export const HOTKEY_WINDOW_REMOTE_ROUTE_PATTERN = `${HOTKEY_WINDOW_REMOTE_ROUTE_PREFIX}/:taskId`;
const HOTKEY_WINDOW_WORKTREE_INIT_ROUTE_PREFIX = `${HOTKEY_WINDOW_ROUTE_PREFIX}/worktree-init-v2`;
export const HOTKEY_WINDOW_WORKTREE_INIT_ROUTE_PATTERN = `${HOTKEY_WINDOW_WORKTREE_INIT_ROUTE_PREFIX}/:pendingWorktreeId`;

const LOCAL_CONVERSATION_ROUTE_PREFIX = "/local";
export const LOCAL_CONVERSATION_ROUTE_PATTERN = `${LOCAL_CONVERSATION_ROUTE_PREFIX}/:conversationId`;
const REMOTE_CONVERSATION_ROUTE_PREFIX = "/remote";
export const REMOTE_CONVERSATION_ROUTE_PATTERN = `${REMOTE_CONVERSATION_ROUTE_PREFIX}/:taskId`;
const WORKTREE_INIT_ROUTE_PREFIX = "/worktree-init-v2";
export const WORKTREE_INIT_ROUTE_PATTERN = `${WORKTREE_INIT_ROUTE_PREFIX}/:pendingWorktreeId`;

const HOTKEY_WINDOW_THREAD_ROUTE_MATCHER = new RegExp(
  `^${HOTKEY_WINDOW_THREAD_ROUTE_PREFIX}/([^/?#]+)$`,
);

export function buildHotkeyWindowThreadRoute(
  conversationId: ConversationId,
): string {
  return `${HOTKEY_WINDOW_THREAD_ROUTE_PREFIX}/${conversationId}`;
}

export function getHotkeyWindowNewConversationRoute(
  hasConfiguredHotkey: boolean,
): string {
  return hasConfiguredHotkey
    ? HOTKEY_WINDOW_HOME_ROUTE
    : HOTKEY_WINDOW_NEW_THREAD_ROUTE;
}

export function buildHotkeyWindowRemoteConversationRoute(
  taskId: string,
): string {
  return `${HOTKEY_WINDOW_REMOTE_ROUTE_PREFIX}/${taskId}`;
}

export function buildHotkeyWindowWorktreeInitRoute(
  pendingWorktreeId: string,
): string {
  return `${HOTKEY_WINDOW_WORKTREE_INIT_ROUTE_PREFIX}/${pendingWorktreeId}`;
}

export function buildLocalConversationRoute(
  conversationId: ConversationId,
): string {
  return `${LOCAL_CONVERSATION_ROUTE_PREFIX}/${conversationId}`;
}

export function buildRemoteConversationRoute(taskId: string): string {
  return `${REMOTE_CONVERSATION_ROUTE_PREFIX}/${taskId}`;
}

export function buildWorktreeInitRoute(pendingWorktreeId: string): string {
  return `${WORKTREE_INIT_ROUTE_PREFIX}/${pendingWorktreeId}`;
}

export function isHotkeyWindowRoutePath(
  path: string | null | undefined,
): boolean {
  return isRoutePathWithPrefix(path, HOTKEY_WINDOW_ROUTE_PREFIX);
}

export function isMainWindowRoutePath(
  path: string | null | undefined,
): boolean {
  return (
    path === "/" ||
    isRoutePathWithPrefix(path, LOCAL_CONVERSATION_ROUTE_PREFIX) ||
    isRoutePathWithPrefix(path, REMOTE_CONVERSATION_ROUTE_PREFIX) ||
    isRoutePathWithPrefix(path, WORKTREE_INIT_ROUTE_PREFIX)
  );
}

export function getHotkeyWindowThreadConversationId(
  path: string,
): ConversationId | null {
  const conversationId = HOTKEY_WINDOW_THREAD_ROUTE_MATCHER.exec(path)?.[1];
  return (conversationId as ConversationId | undefined) ?? null;
}

function isRoutePathWithPrefix(
  path: string | null | undefined,
  prefix: string,
): boolean {
  if (!path) {
    return false;
  }
  return path === prefix || path.startsWith(`${prefix}/`);
}
