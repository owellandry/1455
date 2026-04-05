import type * as AppServer from "app-server-types";
import type { WritableDraft } from "immer";
import type { ConversationId, McpRequestId } from "protocol";

import { logger } from "@/utils/logger";

import type { ApprovalActionContext } from "../app-server-approval-actions";
import type {
  AppServerConversationState,
  StreamRole,
} from "../app-server-manager-types";
import { isPlanImplementationRequest } from "../conversation-request";

export function buildApprovalActionContext(params: {
  hostId: string;
  getStreamRole: (conversationId: ConversationId) => StreamRole | null;
  conversations: Map<ConversationId, AppServerConversationState>;
  updateConversationState: (
    conversationId: ConversationId,
    updater: (draft: WritableDraft<AppServerConversationState>) => void,
  ) => void;
  upsertUserInputResponseSyntheticItem: (
    draft: WritableDraft<AppServerConversationState>,
    requestId: McpRequestId,
    requestParams: Extract<
      AppServer.ServerRequest,
      { method: "item/tool/requestUserInput" }
    >["params"],
    answersByQuestionId: Record<string, Array<string>>,
    completed: boolean,
  ) => void;
  upsertMcpServerElicitationSyntheticItem: (
    draft: WritableDraft<AppServerConversationState>,
    requestId: McpRequestId,
    requestParams: Extract<
      AppServer.ServerRequest,
      { method: "mcpServer/elicitation/request" }
    >["params"],
    completed: boolean,
    action: AppServer.v2.McpServerElicitationRequestResponse["action"] | null,
  ) => void;
}): ApprovalActionContext {
  return {
    hostId: params.hostId,
    getStreamRole: params.getStreamRole,
    getConversationRequest: (
      conversationId,
      requestId,
    ): AppServer.ServerRequest | null => {
      const role = params.getStreamRole(conversationId);
      if (role?.role === "follower") {
        throw new Error(
          "Please continue this conversation on the window where it was started.",
        );
      }

      const existingState = params.conversations.get(conversationId);
      if (!existingState) {
        logger.error("Conversation state not found", {
          safe: { conversationId },
          sensitive: {},
        });
        return null;
      }
      const request = existingState.requests.find(
        (candidate): candidate is AppServer.ServerRequest =>
          candidate.id === requestId && !isPlanImplementationRequest(candidate),
      );
      if (!request) {
        logger.error("Request not found", {
          safe: { requestId },
          sensitive: {},
        });
        return null;
      }

      return request;
    },
    removeConversationRequest: (conversationId, requestId): void => {
      params.updateConversationState(conversationId, (draft) => {
        draft.requests = draft.requests.filter(
          (request) => request.id !== requestId,
        );
      });
    },
    applyUserInputResponse: (
      conversationId,
      requestId,
      requestParams,
      answersByQuestionId,
    ): void => {
      params.updateConversationState(conversationId, (draft) => {
        params.upsertUserInputResponseSyntheticItem(
          draft,
          requestId,
          requestParams,
          answersByQuestionId,
          true,
        );
        draft.requests = draft.requests.filter(
          (request) => request.id !== requestId,
        );
      });
    },
    applyMcpServerElicitationResponse: (
      conversationId,
      requestId,
      requestParams,
      action,
    ): void => {
      params.updateConversationState(conversationId, (draft) => {
        params.upsertMcpServerElicitationSyntheticItem(
          draft,
          requestId,
          requestParams,
          true,
          action,
        );
        draft.requests = draft.requests.filter(
          (request) => request.id !== requestId,
        );
      });
    },
  };
}
