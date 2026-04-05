import type * as AppServer from "app-server-types";
import { z } from "zod";

const READ_THREAD_TERMINAL_ARGUMENTS_SCHEMA = z.strictObject({});
const NO_TERMINAL_SESSION_TEXT =
  "No app terminal session is attached to this thread yet.";

export type ThreadTerminalSnapshot = {
  cwd: string;
  shell: string;
  buffer: string;
  truncated: boolean;
};

export const READ_THREAD_TERMINAL_TOOL_NAME = "read_thread_terminal";
export const READ_THREAD_TERMINAL_TOOL: AppServer.v2.DynamicToolSpec = {
  name: READ_THREAD_TERMINAL_TOOL_NAME,
  description:
    "Read the current app terminal output for this desktop thread. Use it when you need shell output or the current prompt before deciding the next step. This tool takes no arguments.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

export function buildDynamicToolFailureResponse(
  text: string,
): AppServer.v2.DynamicToolCallResponse {
  return {
    contentItems: [
      {
        type: "inputText",
        text,
      },
    ],
    success: false,
  };
}

export function validateReadThreadTerminalToolArguments(
  argumentsValue: unknown,
): string | null {
  const parsed =
    READ_THREAD_TERMINAL_ARGUMENTS_SCHEMA.safeParse(argumentsValue);
  if (parsed.success) {
    return null;
  }
  return `${READ_THREAD_TERMINAL_TOOL_NAME} takes no arguments.`;
}

export function hasReadableThreadTerminalSnapshot(
  session: ThreadTerminalSnapshot | null,
): boolean {
  if (session == null) {
    return false;
  }

  return (
    session.cwd.length > 0 ||
    session.shell !== "unknown" ||
    session.buffer.length > 0 ||
    session.truncated
  );
}

export function buildReadThreadTerminalToolResponse(
  session: ThreadTerminalSnapshot | null,
): AppServer.v2.DynamicToolCallResponse {
  if (session == null) {
    return buildDynamicToolFailureResponse(NO_TERMINAL_SESSION_TEXT);
  }

  const lines = [
    "App terminal snapshot for this thread:",
    `cwd: ${session.cwd}`,
    `shell: ${session.shell}`,
    session.truncated
      ? "note: output is truncated to the latest terminal buffer kept by the app."
      : null,
    "```text",
    session.buffer.length > 0 ? session.buffer : "[terminal has no output yet]",
    "```",
  ].filter((line): line is string => line != null);

  return {
    contentItems: [
      {
        type: "inputText",
        text: lines.join("\n"),
      },
    ],
    success: true,
  };
}
