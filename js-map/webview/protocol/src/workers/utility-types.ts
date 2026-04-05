import type { WorkerDefinitionUnion } from ".";
import type { Result } from "../result";

/** --------------------------- Utility types ---------------------------------- */

export type WorkerId = WorkerDefinitionUnion["id"];

export type WorkerRequestId = string & { readonly _brand: unique symbol };

export function createWorkerRequestId(id: string): WorkerRequestId {
  return id as WorkerRequestId;
}

export type WorkerRequestConfig = {
  cancelable?: boolean;
};

export type WorkerRequestDefinition<
  Request extends Record<string, unknown>,
  Result,
  Config extends WorkerRequestConfig = WorkerRequestConfig,
> = {
  request: Request;
  result: Result;
} & Config;

export type WorkerRequestParams<
  Config extends WorkerRequestConfig = WorkerRequestConfig,
> = Record<
  string,
  WorkerRequestDefinition<Record<string, unknown>, unknown, Config>
>;

type WorkerDefinitionForId<W extends WorkerId> = Extract<
  WorkerDefinitionUnion,
  { id: W }
>;

export type WorkerRequests<W extends WorkerId> =
  WorkerDefinitionForId<W>["requests"];
export type WorkerMutations<W extends WorkerId> =
  WorkerDefinitionForId<W>["mutations"];
export type WorkerEvents<W extends WorkerId> =
  WorkerDefinitionForId<W>["events"];

export type WorkerQueryMethod<W extends WorkerId> = keyof WorkerRequests<W> &
  string;
export type WorkerMutationMethod<W extends WorkerId> =
  keyof WorkerMutations<W> & string;
export type WorkerRequestMethod<W extends WorkerId> =
  | WorkerQueryMethod<W>
  | WorkerMutationMethod<W>;
export type WorkerEventType<W extends WorkerId> = keyof WorkerEvents<W> &
  string;

type WorkerRequestConfigForMethod<
  W extends WorkerId,
  M extends WorkerRequestMethod<W>,
> = M extends keyof WorkerRequests<W>
  ? WorkerRequests<W>[M]
  : M extends keyof WorkerMutations<W>
    ? WorkerMutations<W>[M]
    : never;

export type WorkerRequestCancelOptions<
  W extends WorkerId,
  M extends WorkerRequestMethod<W>,
> =
  WorkerRequestConfigForMethod<W, M> extends { cancelable: false }
    ? { signal?: never }
    : { signal?: AbortSignal };

export type WorkerRequestForMethod<
  W extends WorkerId,
  M extends WorkerRequestMethod<W>,
> = {
  id: WorkerRequestId;
  method: M;
  params: (WorkerRequestConfigForMethod<W, M> & {
    request: Record<string, unknown>;
  })["request"];
};

export type WorkerParamsForMethod<
  W extends WorkerId,
  M extends WorkerRequestMethod<W>,
> = WorkerRequestForMethod<W, M>["params"];

export type WorkerRequest<W extends WorkerId> = {
  [M in WorkerRequestMethod<W>]: WorkerRequestForMethod<W, M>;
}[WorkerRequestMethod<W>];

export type WorkerResponse = {
  id: WorkerRequestId;
  method: string;
  result: Result<unknown>;
};

export type WorkerRequestResultMap<W extends WorkerId> = {
  [M in WorkerRequestMethod<W>]: (WorkerRequestConfigForMethod<W, M> & {
    result: unknown;
  })["result"];
};

export type WorkerRequestResult<
  W extends WorkerId,
  M extends WorkerRequestMethod<W>,
> = (WorkerRequestConfigForMethod<W, M> & { result: unknown })["result"];

export type WorkerEvent<W extends WorkerId, T extends WorkerEventType<W>> = {
  type: T;
} & WorkerEvents<W>[T];

export type WorkerEventUnion<W extends WorkerId> = {
  [T in WorkerEventType<W>]: WorkerEvent<W, T>;
}[WorkerEventType<W>];

export type WorkerMessageFromViewForId<W extends WorkerId> =
  WorkerMessageFromViewForWorker<W, WorkerRequest<W>>;

export type WorkerMessageForViewForId<W extends WorkerId> =
  WorkerMessageForViewForWorker<W, WorkerResponseForId<W>, WorkerEventUnion<W>>;

export type WorkerServerMessageForId<W extends WorkerId> = WorkerServerMessage<
  WorkerResponseForId<W>,
  WorkerEventUnion<W>
>;
type WorkerRequestParamsUnion = WorkerDefinitionUnion["requests"];
type WorkerMutationParamsUnion = WorkerDefinitionUnion["mutations"];
// Enforce that each worker's request params map has `request` and `result` for every key.
type AssertSubtype<_Sub extends Super, Super> = true;
type _AssertAllWorkerRequestsHaveRequestAndResult = AssertSubtype<
  WorkerRequestParamsUnion,
  WorkerRequestParams
>;
type _AssertAllWorkerMutationsHaveRequestAndResult = AssertSubtype<
  WorkerMutationParamsUnion,
  WorkerRequestParams
>;
declare const _useAssertWorkerRequest: _AssertAllWorkerRequestsHaveRequestAndResult;
declare const _useAssertWorkerMutation: _AssertAllWorkerMutationsHaveRequestAndResult;

export type WorkerResponseForMethod<
  W extends WorkerId,
  M extends WorkerRequestMethod<W>,
> = {
  id: WorkerRequestId;
  method: M;
  result: Result<WorkerRequestResult<W, M>>;
};

export type WorkerResponseForId<W extends WorkerId> = {
  [M in WorkerRequestMethod<W>]: WorkerResponseForMethod<W, M>;
}[WorkerRequestMethod<W>]; // --------------------------  From view  --------------------------
type RequestBase = { id: WorkerRequestId; method: string };

export type WorkerRequestMessageFromView<
  W extends WorkerId,
  Request extends RequestBase,
> = {
  type: "worker-request";
  workerId: W;
  request: Request;
};

export type WorkerRequestCancelMessageFromView<W extends WorkerId> = {
  type: "worker-request-cancel";
  workerId: W;
  id: WorkerRequestId;
};

export type WorkerMessageFromViewForWorker<
  W extends WorkerId,
  Request extends RequestBase,
> =
  | WorkerRequestMessageFromView<W, Request>
  | WorkerRequestCancelMessageFromView<W>;
/**
 * Untyped worker bus message (used by the global protocol unions).
 * Individual workers can provide typed aliases via WorkerMessageFromViewForWorker.
 */
export type WorkerMessageFromView = WorkerMessageFromViewForWorker<
  WorkerId,
  RequestBase
>;
// --------------------------  For view  --------------------------
export type WorkerResponseMessageForView<
  W extends WorkerId,
  Response extends { id: WorkerRequestId; method: string },
> = {
  type: "worker-response";
  workerId: W;
  response: Response;
};

export type WorkerEventMessageForView<W extends WorkerId, Event> = {
  type: "worker-event";
  workerId: W;
  event: Event;
};

export type WorkerMessageForViewForWorker<
  W extends WorkerId,
  Response extends { id: WorkerRequestId; method: string },
  Event,
> =
  | WorkerResponseMessageForView<W, Response>
  | WorkerEventMessageForView<W, Event>;
/**
 * Untyped worker bus message (used by the global protocol unions).
 * Individual workers can provide typed aliases via WorkerMessageForViewForWorker.
 */
export type WorkerMessageForView = WorkerMessageForViewForWorker<
  WorkerId,
  { id: WorkerRequestId; method: string },
  unknown
>;

export type WorkerServerMessage<
  Response extends { id: WorkerRequestId; method: string },
  Event,
> =
  | { type: "worker-response"; response: Response }
  | { type: "worker-event"; event: Event };
