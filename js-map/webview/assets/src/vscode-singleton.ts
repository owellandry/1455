import type { MessageFromView } from "protocol";

import { logger } from "./utils/logger";
import type { VSCodeAPI } from "./vscode-singleton.types";

let __memoryState: unknown;

const isBrowserHost = __WINDOW_TYPE__ === "browser";

export const vscode: VSCodeAPI = isBrowserHost
  ? {
      postMessage: (message: unknown): void => {
        let forwardedToDesktop = false;
        const { electronBridge } = window;
        if (electronBridge?.sendMessageFromView) {
          const typedMessage = message as MessageFromView;
          void electronBridge
            .sendMessageFromView(typedMessage)
            .catch((error) => {
              if (typedMessage.type !== "log-message") {
                logger.warning("Failed to send message from view", {
                  safe: { type: typedMessage.type },
                  sensitive: { message, error },
                });
              }
            });
          forwardedToDesktop = true;
        }

        const event = new CustomEvent("codex-message-from-view", {
          detail: message,
        });
        if (forwardedToDesktop) {
          (
            event as CustomEvent & { __codexForwardedViaBridge?: boolean }
          ).__codexForwardedViaBridge = true;
        }
        window.dispatchEvent(event);
      },
      getState: () => __memoryState as unknown,
      setState: (newState: unknown): void => {
        __memoryState = newState;
      },
    }
  : __STORYBOOK__ || __TEST__
    ? {
        postMessage: (): void => {},
        getState: () => __memoryState as unknown,
        setState: (newState: unknown): void => {
          __memoryState = newState;
        },
      }
    : // @ts-expect-error acquireVsCodeApi extern not guaranteed to be defined
      acquireVsCodeApi();

export type { VSCodeAPI } from "./vscode-singleton.types";
