import type * as AppServer from "app-server-types";
import type {
  ConversationId,
  IpcRequestMessageContent,
  McpRequestId,
} from "protocol";

import { ipcRequest } from "@/ipc-request";
import { messageBus } from "@/message-bus";
import { logger } from "@/utils/logger";

type StreamRoleForApprovals =
  | { role: "owner" }
  | { role: "follower"; ownerClientId: string };

type ApprovalRequestMethod =
  | "item/commandExecution/requestApproval"
  | "item/fileChange/requestApproval";

type ApprovalDecisionByMethod = {
  "item/commandExecution/requestApproval": AppServer.v2.CommandExecutionApprovalDecision;
  "item/fileChange/requestApproval": AppServer.v2.FileChangeApprovalDecision;
};

type ToolRequestUserInputRequest = Extract<
  AppServer.ServerRequest,
  { method: "item/tool/requestUserInput" }
>;
type McpServerElicitationRequest = Extract<
  AppServer.ServerRequest,
  { method: "mcpServer/elicitation/request" }
>;

type ThreadFollowerApprovalRequestMethod =
  | "thread-follower-command-approval-decision"
  | "thread-follower-file-approval-decision"
  | "thread-follower-submit-user-input"
  | "thread-follower-submit-mcp-server-elicitation-response";

export type ApprovalActionContext = {
  hostId: string;
  getStreamRole: (
    conversationId: ConversationId,
  ) => StreamRoleForApprovals | null | undefined;
  getConversationRequest: (
    conversationId: ConversationId,
    requestId: McpRequestId,
  ) => AppServer.ServerRequest | null;
  removeConversationRequest: (
    conversationId: ConversationId,
    requestId: McpRequestId,
  ) => void;
  applyUserInputResponse: (
    conversationId: ConversationId,
    requestId: McpRequestId,
    requestParams: ToolRequestUserInputRequest["params"],
    answersByQuestionId: Record<string, Array<string>>,
  ) => void;
  applyMcpServerElicitationResponse: (
    conversationId: ConversationId,
    requestId: McpRequestId,
    requestParams: McpServerElicitationRequest["params"],
    action: AppServer.v2.McpServerElicitationRequestResponse["action"],
  ) => void;
};

function getFollowerOwnerClientId(
  context: ApprovalActionContext,
  conversationId: ConversationId,
): string | null {
  const role = context.getStreamRole(conversationId);
  if (role?.role !== "follower") {
    return null;
  }
  return role.ownerClientId;
}

async function forwardFollowerApprovalRequest<
  M extends ThreadFollowerApprovalRequestMethod,
>(
  ownerClientId: string,
  method: M,
  params: IpcRequestMessageContent[M]["params"],
): Promise<void> {
  const response = await ipcRequest(method, params, {
    targetClientId: ownerClientId,
  });
  if (response.resultType === "error") {
    throw new Error(response.error);
  }
}

function replyWithApprovalDecision<M extends ApprovalRequestMethod>(
  context: ApprovalActionContext,
  conversationId: ConversationId,
  requestId: McpRequestId,
  method: M,
  decision: ApprovalDecisionByMethod[M],
): void {
  const request = context.getConversationRequest(conversationId, requestId);
  if (!request) {
    return;
  }

  if (request.method !== method) {
    logger.error("Unexpected approval request method", {
      safe: { method: request.method },
      sensitive: {},
    });
    return;
  }

  let response:
    | {
        id: McpRequestId;
        result: AppServer.v2.CommandExecutionRequestApprovalResponse;
      }
    | {
        id: McpRequestId;
        result: AppServer.v2.FileChangeRequestApprovalResponse;
      };
  switch (method) {
    case "item/commandExecution/requestApproval":
      response = {
        id: requestId,
        result: {
          decision,
        },
      };
      break;
    case "item/fileChange/requestApproval":
      response = {
        id: requestId,
        result: {
          decision,
        },
      };
      break;
  }

  logger.info("Sending server response", {
    safe: {},
    sensitive: {
      id: requestId,
      method: request.method,
      response: response.result,
    },
  });
  messageBus.dispatchMessage("mcp-response", {
    hostId: context.hostId,
    response,
  });
  context.removeConversationRequest(conversationId, requestId);
}

export function replyWithCommandExecutionApprovalDecision(
  context: ApprovalActionContext,
  conversationId: ConversationId,
  requestId: McpRequestId,
  decision: AppServer.v2.CommandExecutionApprovalDecision,
): void {
  const ownerClientId = getFollowerOwnerClientId(context, conversationId);
  if (ownerClientId) {
    void forwardFollowerApprovalRequest(
      ownerClientId,
      "thread-follower-command-approval-decision",
      {
        conversationId,
        requestId,
        decision,
      },
    ).catch((error) => {
      logger.error("Failed to forward command approval decision", {
        safe: { conversationId },
        sensitive: { error },
      });
    });
    return;
  }

  replyWithApprovalDecision(
    context,
    conversationId,
    requestId,
    "item/commandExecution/requestApproval",
    decision,
  );
}

export function replyWithFileChangeApprovalDecision(
  context: ApprovalActionContext,
  conversationId: ConversationId,
  requestId: McpRequestId,
  decision: AppServer.v2.FileChangeApprovalDecision,
): void {
  const ownerClientId = getFollowerOwnerClientId(context, conversationId);
  if (ownerClientId) {
    void forwardFollowerApprovalRequest(
      ownerClientId,
      "thread-follower-file-approval-decision",
      {
        conversationId,
        requestId,
        decision,
      },
    ).catch((error) => {
      logger.error("Failed to forward file approval decision", {
        safe: { conversationId },
        sensitive: { error },
      });
    });
    return;
  }

  replyWithApprovalDecision(
    context,
    conversationId,
    requestId,
    "item/fileChange/requestApproval",
    decision,
  );
}

export function replyWithUserInputResponse(
  context: ApprovalActionContext,
  conversationId: ConversationId,
  requestId: McpRequestId,
  response: AppServer.v2.ToolRequestUserInputResponse,
): void {
  const ownerClientId = getFollowerOwnerClientId(context, conversationId);
  if (ownerClientId) {
    void forwardFollowerApprovalRequest(
      ownerClientId,
      "thread-follower-submit-user-input",
      {
        conversationId,
        requestId,
        response,
      },
    ).catch((error) => {
      logger.error("Failed to forward user-input response", {
        safe: { conversationId },
        sensitive: { error },
      });
    });
    return;
  }

  const request = context.getConversationRequest(conversationId, requestId);
  if (!request) {
    return;
  }
  if (request.method !== "item/tool/requestUserInput") {
    logger.error("Unexpected user input request method", {
      safe: { method: request.method },
      sensitive: {},
    });
    return;
  }

  const answersByQuestionId: Record<string, Array<string>> = {};
  for (const [questionId, answer] of Object.entries(response.answers)) {
    if (!answer) {
      continue;
    }
    answersByQuestionId[questionId] = [...answer.answers];
  }

  const result = {
    id: requestId,
    result: response,
  };

  logger.info("Sending server response", {
    safe: {},
    sensitive: {
      id: requestId,
      method: request.method,
      response: result.result,
    },
  });
  messageBus.dispatchMessage("mcp-response", {
    hostId: context.hostId,
    response: result,
  });

  context.applyUserInputResponse(
    conversationId,
    requestId,
    request.params,
    answersByQuestionId,
  );
}

export function replyWithMcpServerElicitationResponse(
  context: ApprovalActionContext,
  conversationId: ConversationId,
  requestId: McpRequestId,
  response: AppServer.v2.McpServerElicitationRequestResponse,
): void {
  const ownerClientId = getFollowerOwnerClientId(context, conversationId);
  if (ownerClientId) {
    void forwardFollowerApprovalRequest(
      ownerClientId,
      "thread-follower-submit-mcp-server-elicitation-response",
      {
        conversationId,
        requestId,
        response,
      },
    ).catch((error) => {
      logger.error("Failed to forward MCP server elicitation response", {
        safe: { conversationId },
        sensitive: { error },
      });
    });
    return;
  }

  const request = context.getConversationRequest(conversationId, requestId);
  if (!request) {
    return;
  }
  if (request.method !== "mcpServer/elicitation/request") {
    logger.error("Unexpected MCP server elicitation request method", {
      safe: { method: request.method },
      sensitive: {},
    });
    return;
  }

  logger.info("Sending server response", {
    safe: {},
    sensitive: {
      id: requestId,
      method: request.method,
      response,
    },
  });
  messageBus.dispatchMessage("mcp-response", {
    hostId: context.hostId,
    response: {
      id: requestId,
      result: response,
    },
  });
  context.applyMcpServerElicitationResponse(
    conversationId,
    requestId,
    request.params,
    response.action,
  );
}
