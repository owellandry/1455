import type { RequestId, ServerRequest } from "app-server-types";

export const IMPLEMENT_PLAN_PREFIX = "PLEASE IMPLEMENT THIS PLAN:";
export const PLAN_IMPLEMENTATION_REQUEST_METHOD =
  "item/plan/requestImplementation";

export type PlanImplementationRequestParams = {
  threadId: string;
  turnId: string;
  planContent: string;
};

export type PlanImplementationRequest = {
  method: typeof PLAN_IMPLEMENTATION_REQUEST_METHOD;
  id: RequestId;
  params: PlanImplementationRequestParams;
};

export type ConversationRequest = ServerRequest | PlanImplementationRequest;

export function isPlanImplementationRequest(
  request: ConversationRequest,
): request is PlanImplementationRequest {
  return request.method === PLAN_IMPLEMENTATION_REQUEST_METHOD;
}
