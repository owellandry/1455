import {
  createWorkerRequestId,
  type WorkerEventType,
  type WorkerEventUnion,
  type WorkerId,
  type WorkerMessageForViewForId,
  type WorkerRequestId,
  type WorkerRequestMethod,
} from "protocol";

export type PendingEntry<W extends WorkerId> = {
  method: WorkerRequestMethod<W>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  disposeSignalListener?: () => void;
};

export function isWorkerMessageForViewForId<W extends WorkerId>(
  workerId: W,
  message: unknown,
): message is WorkerMessageForViewForId<W> {
  if (message == null || typeof message !== "object") {
    return false;
  }
  if (!("type" in message) || !("workerId" in message)) {
    return false;
  }

  const type = (message as { type?: unknown }).type;
  const messageWorkerId = (message as { workerId?: unknown }).workerId;
  if (messageWorkerId !== workerId) {
    return false;
  }

  return type === "worker-response" || type === "worker-event";
}

export function createAbortError(): Error {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

export function createWorkerRequestIdForView(): WorkerRequestId {
  return createWorkerRequestId(
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
}

export function handleWorkerRpcMessage<W extends WorkerId>(options: {
  message: WorkerMessageForViewForId<W>;
  pending: Map<WorkerRequestId, PendingEntry<W>>;
  listeners: Map<WorkerEventType<W>, Set<(event: WorkerEventUnion<W>) => void>>;
  allEventListeners: Set<(event: WorkerEventUnion<W>) => void>;
}): void {
  const { message, pending, listeners, allEventListeners } = options;

  if (message.type === "worker-event") {
    const event = message.event;
    allEventListeners.forEach((listener): void => {
      listener(event);
    });
    const typeListeners = listeners.get(event.type as WorkerEventType<W>);
    if (!typeListeners) {
      return;
    }
    typeListeners.forEach((listener): void => {
      listener(event);
    });
    return;
  }

  const pendingEntry = pending.get(message.response.id);
  if (!pendingEntry) {
    return;
  }
  pending.delete(message.response.id);
  pendingEntry.disposeSignalListener?.();

  if (pendingEntry.method !== message.response.method) {
    pendingEntry.reject(new Error("Mismatched worker response method"));
    return;
  }

  if (message.response.result.type === "ok") {
    pendingEntry.resolve(message.response.result.value);
    return;
  }
  pendingEntry.reject(new Error(message.response.result.error.message));
}
