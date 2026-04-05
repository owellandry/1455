import type * as AppServer from "app-server-types";
import type {
  AppServerMethodResponseMap,
  RequestParamsForMethod,
} from "protocol";
import { v4 as uuidv4 } from "uuid";

import { logger } from "@/utils/logger";

export type FuzzySearchSession = {
  update: (query: string) => Promise<void>;
  stop: () => Promise<void>;
};

type SendRequestFn = <T extends keyof AppServerMethodResponseMap>(
  method: T,
  params: RequestParamsForMethod<T>,
) => Promise<AppServerMethodResponseMap[T]>;

export class FuzzyFileSearchController {
  private sessionSupport: "unknown" | "supported" | "unsupported" = "unknown";
  private updatedCallbacks: Array<
    (notification: AppServer.FuzzyFileSearchSessionUpdatedNotification) => void
  > = [];
  private completedCallbacks: Array<
    (
      notification: AppServer.FuzzyFileSearchSessionCompletedNotification,
    ) => void
  > = [];

  constructor(private readonly sendRequest: SendRequestFn) {}

  async createSession(params: {
    roots: Array<string>;
    onUpdated?: (
      notification: AppServer.FuzzyFileSearchSessionUpdatedNotification,
    ) => void;
    onCompleted?: (
      notification: AppServer.FuzzyFileSearchSessionCompletedNotification,
    ) => void;
  }): Promise<FuzzySearchSession> {
    const sessionId = uuidv4();
    if (this.sessionSupport !== "unsupported") {
      try {
        await this.sendRequest("fuzzyFileSearch/sessionStart", {
          sessionId,
          roots: params.roots,
        });
        this.sessionSupport = "supported";
      } catch (error) {
        if (isMcpMethodNotFoundError(error)) {
          this.sessionSupport = "unsupported";
        } else {
          throw error;
        }
      }
    }

    let stopped = false;
    const unsubscribeUpdated =
      params.onUpdated == null
        ? (): void => {}
        : this.addUpdatedCallback((notification) => {
            if (notification.sessionId !== sessionId) {
              return;
            }
            params.onUpdated?.(notification);
          });
    const unsubscribeCompleted =
      params.onCompleted == null
        ? (): void => {}
        : this.addCompletedCallback((notification) => {
            if (notification.sessionId !== sessionId) {
              return;
            }
            params.onCompleted?.(notification);
          });

    return {
      update: async (query: string): Promise<void> => {
        if (stopped) {
          return;
        }
        await this.updateQuery({
          sessionId,
          query,
          roots: params.roots,
        });
      },
      stop: async (): Promise<void> => {
        if (stopped) {
          return;
        }
        stopped = true;
        unsubscribeUpdated();
        unsubscribeCompleted();
        await this.stopSession({ sessionId });
      },
    };
  }

  onSessionUpdated(
    notification: AppServer.FuzzyFileSearchSessionUpdatedNotification,
  ): void {
    for (const callback of Array.from(this.updatedCallbacks)) {
      callback(notification);
    }
  }

  onSessionCompleted(
    notification: AppServer.FuzzyFileSearchSessionCompletedNotification,
  ): void {
    for (const callback of Array.from(this.completedCallbacks)) {
      callback(notification);
    }
  }

  private async updateQuery(params: {
    sessionId: string;
    query: string;
    roots: Array<string>;
  }): Promise<void> {
    if (this.sessionSupport === "supported") {
      try {
        await this.sendRequest("fuzzyFileSearch/sessionUpdate", {
          sessionId: params.sessionId,
          query: params.query,
        });
        return;
      } catch (error) {
        if (!isFuzzyFileSearchSessionNotFoundError(error)) {
          throw error;
        }
        await this.sendRequest("fuzzyFileSearch/sessionStart", {
          sessionId: params.sessionId,
          roots: params.roots,
        });
        await this.sendRequest("fuzzyFileSearch/sessionUpdate", {
          sessionId: params.sessionId,
          query: params.query,
        });
        return;
      }
    }

    const response = await this.sendRequest("fuzzyFileSearch", {
      query: params.query,
      roots: params.roots,
      cancellationToken: "vscode-fuzzy-file-search",
    });
    this.onSessionUpdated({
      sessionId: params.sessionId,
      query: params.query,
      files: response.files,
    });
    this.onSessionCompleted({
      sessionId: params.sessionId,
    });
  }

  private addUpdatedCallback(
    cb: (
      notification: AppServer.FuzzyFileSearchSessionUpdatedNotification,
    ) => void,
  ): () => void {
    this.updatedCallbacks.push(cb);
    return () => {
      this.updatedCallbacks = this.updatedCallbacks.filter(
        (candidate) => candidate !== cb,
      );
    };
  }

  private addCompletedCallback(
    cb: (
      notification: AppServer.FuzzyFileSearchSessionCompletedNotification,
    ) => void,
  ): () => void {
    this.completedCallbacks.push(cb);
    return () => {
      this.completedCallbacks = this.completedCallbacks.filter(
        (candidate) => candidate !== cb,
      );
    };
  }

  private async stopSession(params: { sessionId: string }): Promise<void> {
    if (this.sessionSupport === "unsupported") {
      return;
    }

    try {
      await this.sendRequest("fuzzyFileSearch/sessionStop", {
        sessionId: params.sessionId,
      });
    } catch (error) {
      if (isMcpMethodNotFoundError(error)) {
        this.sessionSupport = "unsupported";
      } else {
        logger.warning("Failed to close fuzzy file search session", {
          safe: {},
          sensitive: {
            error,
          },
        });
      }
    }
  }
}

function isMcpMethodNotFoundError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    (error as { code?: unknown }).code === -32601
  ) {
    return true;
  }
  if (
    typeof error === "object" &&
    error != null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.toLowerCase();
    return message.includes("method not found");
  }
  return false;
}

function isFuzzyFileSearchSessionNotFoundError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error != null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message
      .toLowerCase()
      .includes("fuzzy file search session not found");
  }
  return false;
}
