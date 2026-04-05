import type {
  WorkerEvent,
  WorkerEventType,
  WorkerId,
  WorkerRequestForMethod,
  WorkerRequestMethod,
  WorkerRequestResult,
} from "protocol";

import { WorkerRpcClient } from "./worker-rpc-client";

const clients = new Map<WorkerId, WorkerRpcClient<WorkerId>>();

export function workerRpcClient<W extends WorkerId>(
  workerId: W,
): WorkerRpcClient<W> {
  const existing = clients.get(workerId);
  if (existing) {
    return existing as unknown as WorkerRpcClient<W>;
  }
  const client = new WorkerRpcClient<W>(workerId);
  clients.set(workerId, client);
  return client;
}

/**
 * Interface that all host-specific WorkerRpcClient implementations must implement.
 *
 * This client lets the webview interact with a worker on the host. For electron, it will be backed by
 * a separate bridge.
 *
 * @see protocol/src/workers/index.ts for instructions on how to create a new worker.
 */
export type IWorkerRpcClient<W extends WorkerId> = {
  request<M extends WorkerRequestMethod<W>>(options: {
    method: M;
    params: WorkerRequestForMethod<W, M>["params"];
    signal?: AbortSignal;
  }): Promise<WorkerRequestResult<W, M>>;
  subscribe<T extends WorkerEventType<W>>(
    type: T,
    listener: (event: WorkerEvent<W, T>) => void,
  ): () => void;
};
