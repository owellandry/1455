import type {
  WorkerEvent,
  WorkerEventType,
  WorkerEventUnion,
  WorkerId,
  WorkerRequestForMethod,
  WorkerRequestId,
  WorkerRequestMethod,
  WorkerRequestResult,
} from "protocol";

import { messageBus } from "@/message-bus";

import type { IWorkerRpcClient } from ".";
import {
  createAbortError,
  createWorkerRequestIdForView,
  handleWorkerRpcMessage,
  isWorkerMessageForViewForId,
  type PendingEntry,
} from "./utils";

export class WorkerRpcClient<
  W extends WorkerId,
> implements IWorkerRpcClient<W> {
  private readonly pending = new Map<WorkerRequestId, PendingEntry<W>>();
  private readonly listeners = new Map<
    WorkerEventType<W>,
    Set<(event: WorkerEventUnion<W>) => void>
  >();
  private readonly allEventListeners = new Set<
    (event: WorkerEventUnion<W>) => void
  >();

  constructor(private readonly workerId: W) {
    // The extension uses the primary message bus, so filter the shared worker bus by workerId.
    messageBus.subscribe("worker-response", (message): void => {
      this.handleMessage(message);
    });
    messageBus.subscribe("worker-event", (message): void => {
      this.handleMessage(message);
    });
  }

  request<M extends WorkerRequestMethod<W>>(options: {
    method: M;
    params: WorkerRequestForMethod<W, M>["params"];
    signal?: AbortSignal;
  }): Promise<WorkerRequestResult<W, M>> {
    if (options.signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    const id = createWorkerRequestIdForView();

    const request: WorkerRequestForMethod<W, M> = {
      id,
      method: options.method,
      params: options.params,
    };

    const payload = {
      workerId: this.workerId,
      request,
    } as const;

    const promise = new Promise<WorkerRequestResult<W, M>>(
      (resolve, reject): void => {
        this.pending.set(id, {
          method: options.method,
          resolve: (value: unknown): void => {
            resolve(value as WorkerRequestResult<W, M>);
          },
          reject,
        });
      },
    );

    messageBus.dispatchMessage("worker-request", payload);

    const signal = options.signal;
    if (signal) {
      const onAbort = (): void => {
        signal.removeEventListener("abort", onAbort);
        const pending = this.pending.get(id);
        if (pending) {
          pending.reject(createAbortError());
          this.pending.delete(id);
        }
        messageBus.dispatchMessage("worker-request-cancel", {
          workerId: this.workerId,
          id,
        });
      };
      signal.addEventListener("abort", onAbort);
      const pending = this.pending.get(id);
      if (pending) {
        pending.disposeSignalListener = (): void => {
          signal.removeEventListener("abort", onAbort);
        };
      }
    }

    return promise;
  }

  subscribe<T extends WorkerEventType<W>>(
    type: T,
    listener: (event: WorkerEvent<W, T>) => void,
  ): () => void {
    const existing = this.listeners.get(type);
    if (existing) {
      existing.add(listener as (event: WorkerEventUnion<W>) => void);
      return (): void => {
        existing.delete(listener as (event: WorkerEventUnion<W>) => void);
      };
    }

    const set = new Set<(event: WorkerEventUnion<W>) => void>();
    set.add(listener as (event: WorkerEventUnion<W>) => void);
    this.listeners.set(type, set);
    return (): void => {
      set.delete(listener as (event: WorkerEventUnion<W>) => void);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  private handleMessage(message: unknown): void {
    if (!isWorkerMessageForViewForId(this.workerId, message)) {
      return;
    }

    handleWorkerRpcMessage({
      message,
      pending: this.pending,
      listeners: this.listeners,
      allEventListeners: this.allEventListeners,
    });
  }
}
