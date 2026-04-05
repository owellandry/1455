import type {
  MessageForView as MessageFromExtension,
  MessageFromView as ProtocolMessageFromView,
} from "protocol";
import { useEffect, useEffectEvent } from "react";

import { getTrustedMessageForView } from "./get-trusted-message-for-view";
import { vscode } from "./vscode-singleton";

type MessageFromExtensionOfType<T extends MessageFromExtension["type"]> =
  Extract<MessageFromExtension, { type: T }>;

export type MessageToExtensionOfType<
  T extends ProtocolMessageFromView["type"],
> = Extract<ProtocolMessageFromView, { type: T }>;

type DispatchMessageToExtension = <T extends ProtocolMessageFromView["type"]>(
  type: T,
  payload: Omit<MessageToExtensionOfType<T>, "type">,
) => void;

type MessageHandler<T extends MessageFromExtension["type"]> = (
  payload: MessageFromExtensionOfType<T>,
  dispatch: DispatchMessageToExtension,
) => void;

export class MessageBus {
  private static instance: MessageBus | null = null;

  /**
   * It's important for this to be a singleton so we don't
   * subscribe to messages multiple times.
   */
  public static getInstance(): MessageBus {
    if (this.instance == null) {
      this.instance = new MessageBus();
    }
    return this.instance;
  }

  // Map message type -> set of handlers for that type.
  // oxlint-disable-next-line typescript/no-explicit-any
  private handlers: Map<string, Set<MessageHandler<any>>> = new Map();

  private constructor() {
    this.dispatchMessage = this.dispatchMessage.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    if (!__TEST__) {
      window.addEventListener("message", (event) => {
        this.handleMessage(event);
      });
    }
  }

  /**
   * Send a message to the extension.
   */
  dispatchMessage<T extends ProtocolMessageFromView["type"]>(
    type: T,
    payload: Omit<MessageToExtensionOfType<T>, "type">,
  ): void {
    vscode!.postMessage({ ...payload, type });
  }

  private deliverMessage(msgType: string, message: unknown): void {
    const handlers = this.handlers.get(msgType);
    if (!handlers) {
      return;
    }
    const dispatch: DispatchMessageToExtension = (type, payload): void => {
      this.dispatchMessage(type, payload);
    };
    for (const handler of handlers) {
      // oxlint-disable-next-line typescript/no-explicit-any
      handler(message as any, dispatch);
    }
  }

  /**
   * Dispatch a host->view message directly to local subscribers.
   * Useful for reusing existing accelerator handlers from UI surfaces.
   */
  dispatchHostMessage(message: MessageFromExtension): void {
    this.deliverMessage(message.type, message);
  }

  private handleMessage(event: MessageEvent<unknown>): void {
    const message = getTrustedMessageForView(event);
    if (message == null) {
      return;
    }
    this.deliverMessage(message.type, message);
  }

  /**
   * Subscribe to a message type.
   *
   * There can only be ONE subscriber of a given type.
   * If there are multiple, shared state, like an atom, should be used.
   *
   * @returns An unsubscribe function.
   */
  subscribe<T extends MessageFromExtension["type"]>(
    type: T,
    handler: MessageHandler<T>,
  ): () => void {
    const handlers = this.handlers.get(type) ?? new Set();
    handlers.add(handler);
    this.handlers.set(type, handlers);
    return () => {
      const currentHandlers = this.handlers.get(type);
      if (!currentHandlers) {
        return;
      }
      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }
}

/**
 * @param deps - The useEffect dependencies for the handler array.
 */
export function useMessage<T extends MessageFromExtension["type"]>(
  type: T,
  handler: MessageHandler<T>,
  deps: Array<unknown> = [],
): void {
  const messageBus = MessageBus.getInstance();
  const handlerEvent = useEffectEvent(handler);

  useEffect(() => {
    const unsubscribe = messageBus.subscribe(type, handlerEvent);
    return (): void => unsubscribe();
    // oxlint-disable-next-line react/exhaustive-deps
  }, [messageBus, type, ...deps]);
}

export const messageBus = MessageBus.getInstance();
