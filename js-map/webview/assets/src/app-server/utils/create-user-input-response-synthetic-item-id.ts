import type { McpRequestId } from "protocol";

export function createUserInputResponseSyntheticItemId(
  requestId: McpRequestId,
): string {
  return `user-input-response-${requestId}`;
}
