import type { IpcRequestMessageContent, IpcResponseMessageFor } from "protocol";

import { WebFetchWrapper } from "./web-fetch-wrapper";

/**
 * Initiates an IPC request directly from the webview to another IPC client.
 */
export async function ipcRequest<K extends keyof IpcRequestMessageContent>(
  method: K,
  params: IpcRequestMessageContent[K]["params"],
  options: {
    targetClientId?: string;
    signal?: AbortSignal;
  } = {},
): Promise<IpcResponseMessageFor<K>> {
  const { targetClientId, signal } = options;
  try {
    const response = await WebFetchWrapper.getInstance().post(
      "vscode://codex/ipc-request",
      JSON.stringify({
        method,
        params,
        ...(targetClientId ? { targetClientId } : {}),
      }),
      undefined,
      signal,
    );

    return response.body as IpcResponseMessageFor<K>;
  } catch (error) {
    return {
      requestId: "",
      type: "response",
      resultType: "error",
      error: error instanceof Error ? error.message : "unknown-error",
    };
  }
}
