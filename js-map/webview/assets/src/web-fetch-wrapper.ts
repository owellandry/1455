import type {
  FetchRequest,
  FetchResponse,
  FetchStreamComplete,
  FetchStreamError,
  FetchStreamEvent,
} from "protocol";

import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";

import { MessageBus } from "./message-bus";

export type ApiResponse<T> = {
  status: number;
  headers: Record<string, string>;
  body: T;
};

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export class WebFetchWrapper {
  private static instance: WebFetchWrapper | null = null;

  public static getInstance(): WebFetchWrapper {
    if (this.instance == null) {
      this.instance = new WebFetchWrapper();
    }
    return this.instance;
  }

  private messageCounter = 0;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: ApiResponse<unknown>) => void;
      reject: (error: Error) => void;
    }
  >();
  private streamHandlers = new Map<
    string,
    {
      onEvent?: (event: FetchStreamEvent) => void;
      onError?: (error: FetchStreamError) => void;
      onComplete?: (complete: FetchStreamComplete) => void;
    }
  >();

  private constructor() {
    this.onFetchResponse = this.onFetchResponse.bind(this);
    MessageBus.getInstance().subscribe("fetch-response", (message) => {
      this.onFetchResponse(message);
    });
    this.onFetchStreamEvent = this.onFetchStreamEvent.bind(this);
    this.onFetchStreamError = this.onFetchStreamError.bind(this);
    this.onFetchStreamComplete = this.onFetchStreamComplete.bind(this);
    MessageBus.getInstance().subscribe("fetch-stream-event", (message) => {
      this.onFetchStreamEvent(message);
    });
    MessageBus.getInstance().subscribe("fetch-stream-error", (message) => {
      this.onFetchStreamError(message);
    });
    MessageBus.getInstance().subscribe("fetch-stream-complete", (message) => {
      this.onFetchStreamComplete(message);
    });
  }

  private onFetchResponse(message: FetchResponse): void {
    const pending = this.pendingRequests.get(message.requestId);

    if (!pending) {
      return;
    }

    this.pendingRequests.delete(message.requestId);

    const responseType = message.responseType;
    switch (responseType) {
      case "success": {
        try {
          if (message.status >= 200 && message.status < 300) {
            pending.resolve({
              status: message.status,
              headers: message.headers,
              body: JSON.parse(message.bodyJsonString),
            });
          } else {
            pending.reject(
              new FetchError(message.bodyJsonString, message.status),
            );
          }
        } catch (error) {
          // Bubble malformed JSON payloads as rejections instead of crashing callers.
          pending.reject(
            error instanceof Error
              ? error
              : new Error(
                  typeof error === "string"
                    ? error
                    : (JSON.stringify(error) ?? "Unknown error"),
                ),
          );
        }
        break;
      }
      case "error": {
        pending.reject(new FetchError(message.error, message.status));
        break;
      }
    }
  }

  private onFetchStreamEvent(message: FetchStreamEvent): void {
    const handler = this.streamHandlers.get(message.requestId);
    if (!handler) {
      return;
    }
    handler.onEvent?.(message);
  }

  private onFetchStreamError(message: FetchStreamError): void {
    const handler = this.streamHandlers.get(message.requestId);
    if (!handler) {
      return;
    }
    handler.onError?.(message);
    this.streamHandlers.delete(message.requestId);
  }

  private onFetchStreamComplete(message: FetchStreamComplete): void {
    const handler = this.streamHandlers.get(message.requestId);
    if (!handler) {
      return;
    }
    handler.onComplete?.(message);
    this.streamHandlers.delete(message.requestId);
  }

  // Convenience methods
  public async get<T>(
    url: string,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    return this.sendRequest<T>("GET", url, { headers, signal });
  }

  public async post<T>(
    url: string,
    body: string | undefined,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    return this.sendRequest<T>("POST", url, { body, headers, signal });
  }

  public async put<T>(
    url: string,
    body: string | undefined,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    return this.sendRequest<T>("PUT", url, { body, headers, signal });
  }

  public stream(
    method: FetchRequest["method"],
    url: string,
    options: {
      headers?: Record<string, string>;
      body?: string;
      onEvent?: (event: FetchStreamEvent) => void;
      onError?: (error: FetchStreamError) => void;
      onComplete?: (complete: FetchStreamComplete) => void;
    } = {},
  ): string {
    const requestId = (++this.messageCounter).toString();
    this.streamHandlers.set(requestId, {
      onEvent: options.onEvent,
      onError: options.onError,
      onComplete: options.onComplete,
    });
    MessageBus.getInstance().dispatchMessage("fetch-stream", {
      hostId: DEFAULT_HOST_ID,
      requestId,
      url,
      method,
      headers: options.headers,
      body: options.body,
    });
    return requestId;
  }

  public cancelStream(requestId: string): void {
    MessageBus.getInstance().dispatchMessage("cancel-fetch-stream", {
      requestId,
    });
  }

  public async sendRequest<T>(
    method: FetchRequest["method"],
    url: string,
    options?: {
      headers?: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
    },
  ): Promise<ApiResponse<T>> {
    const requestId = (++this.messageCounter).toString();

    options?.signal?.addEventListener("abort", () => {
      MessageBus.getInstance().dispatchMessage("cancel-fetch", {
        requestId,
      });
    });

    const message: Omit<FetchRequest, "type"> = {
      hostId: DEFAULT_HOST_ID,
      requestId,
      method,
      url,
      headers: options?.headers,
      body: options?.body,
    };

    return new Promise<ApiResponse<T>>((resolve, reject) => {
      // @ts-expect-error The pending requests map store all types, not just T so we need to coerce T to unknown.
      this.pendingRequests.set(requestId, { resolve, reject });
      MessageBus.getInstance().dispatchMessage("fetch", message);
    });
  }
}
