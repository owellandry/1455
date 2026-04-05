import type * as AppServer from "app-server-types";
import type { FileDescriptor, GitCwd, McpRequestId } from "protocol";
import { z } from "zod";

import type { McpServerElicitation } from "@/app-server/mcp-server-elicitation";
import type { CodeReviewFinding } from "@/code-review-schema";

import type { LocalConversationTurn } from "./map-mcp-conversation-turn";
import type { ParsedCmd, ParsedCmdWithoutStatus } from "./parsed-cmd";

export type UserMessageDiffComment = {
  path: string;
  side: "left" | "right" | null;
  lineRange: string | null;
  body: string;
};

export type UserMessageLocalConversationItem = {
  type: "user-message";
  message: string;
  systemHeartbeat?: boolean;
  referencesPriorConversation: boolean;
  commentCount: number;
  comments?: Array<UserMessageDiffComment>;
  pullRequestCheckCount?: number;
  images: Array<string>;
  attachments: Array<FileDescriptor>;
  reviewMode?: boolean;
  pullRequestFixMode?: boolean;
  autoResolveSync?: boolean;
};

export type ExecLocalConversationItem = {
  type: "exec";
  callId: string;
  processId?: string | null;
  cwd: GitCwd | null;
  cmd: Array<string>;
  executionStatus?: AppServer.v2.CommandExecutionStatus | "interrupted";
  approvalRequestId: McpRequestId | null;
  approvalReason?: string | null;
  networkApprovalContext?: AppServer.v2.CommandExecutionRequestApprovalParams["networkApprovalContext"];
  proposedNetworkPolicyAmendments?: AppServer.v2.CommandExecutionRequestApprovalParams["proposedNetworkPolicyAmendments"];
  proposedExecpolicyAmendment: AppServer.v2.CommandExecutionRequestApprovalParams["proposedExecpolicyAmendment"];
  parsedCmd: ParsedCmd;
  output: {
    aggregatedOutput: string;
    exitCode?: number;
  } | null;
};

export type FileChange =
  | { type: "add"; content: string }
  | { type: "delete"; content: string }
  | { type: "update"; unified_diff: string; move_path: string | null };

export type PatchApplyLocalConversationItem = {
  type: "patch";
  callId: string;
  approvalRequestId: McpRequestId | null;
  grantRoot: GitCwd | null;
  changes: Record<string, FileChange>;
  success: boolean | null;
};

export type UserInputQuestionOption = {
  label: string;
  description: string;
};

export type UserInputQuestion = {
  id: string;
  header: string;
  question: string;
  isOther: boolean;
  options: Array<UserInputQuestionOption>;
};

export type UserInputLocalConversationItem = {
  type: "userInput";
  requestId: McpRequestId;
  callId: string;
  turnId: string;
  questions: Array<UserInputQuestion>;
  completed: boolean;
};

export type UserInputResponseLocalConversationItem = {
  type: "user-input-response";
  requestId: McpRequestId;
  turnId: string;
  questionsAndAnswers: Array<{
    id: string;
    header: string;
    question: string;
    answers: Array<string>;
  }>;
  completed: boolean;
};

export type HookLocalConversationItem = {
  type: "hook";
  id: string;
  run: AppServer.v2.HookRunSummary;
};

export type McpServerElicitationLocalConversationItem = {
  type: "mcp-server-elicitation";
  requestId: McpRequestId;
  turnId: string;
  elicitation: McpServerElicitation;
  completed: boolean;
  action: AppServer.v2.McpServerElicitationRequestResponse["action"] | null;
};

export type AutomaticApprovalReviewLocalConversationItem =
  AppServer.v2.GuardianApprovalReview & {
    type: "automatic-approval-review";
    id: string;
    targetItemId: string;
  };

export type SystemEventLocalConversationItem = {
  type: "system-error";
  content: string;
};

export type StreamErrorLocalConversationItem = {
  type: "stream-error";
  content: string;
  additionalDetails: string | null;
};

export type TurnDiffLocalConversationItem = {
  type: "turn-diff";
  unifiedDiff: string;
  cwd: GitCwd | null;
};

export type ReasoningLocalConversationItem = {
  type: "reasoning";
  content: string;
  completed: boolean;
};

export type WorkedForLocalConversationItem = {
  type: "worked-for";
  timeLabel: string;
};

export type CodeReviewStructuredOutput = {
  type: "code-review";
  findings: Array<CodeReviewFinding>;
  overallCorrectness: "patch is correct" | "patch is incorrect" | null;
  overallExplanation: string | null;
  overallConfidenceScore: number | null;
};

export type HeartbeatStructuredOutput = {
  type: "heartbeat";
  decision: "NOTIFY" | "DONT_NOTIFY";
  notificationMessage: string | null;
};

export type AssistantMessageStructuredOutput =
  | CodeReviewStructuredOutput
  | HeartbeatStructuredOutput;

export type AssistantMessageLocalConversationItem<
  T extends AssistantMessageStructuredOutput = AssistantMessageStructuredOutput,
> = {
  type: "assistant-message";
  content: string;
  completed: boolean;
  phase: AppServer.MessagePhase | null;
  renderPlaceholderWhileStreaming?: boolean;
  structuredOutput: T | undefined;
};

export type ProposedPlanLocalConversationItem = {
  type: "proposed-plan";
  content: string;
  completed: boolean;
};

export type WebSearchLocalConversationItem = {
  type: "web-search";
  query: string;
  action: AppServer.v2.WebSearchAction | null;
  completed: boolean;
};

export type TodoListConversationItem = {
  type: "todo-list";
  explanation: string | null;
  plan: Array<{
    step: string;
    status: "pending" | "in_progress" | "completed";
  }>;
};

export type PlanImplementationLocalConversationItem = {
  type: "plan-implementation";
  id: string;
  turnId: string;
  planContent: string;
  isCompleted: boolean;
};

export type RemoteTaskCreatedLocalConversationItem = {
  type: "remote-task-created";
  taskId: string;
};

export type ContextCompactionLocalConversationItem = {
  type: "context-compaction";
  id: string;
  completed: boolean;
};

export type PersonalityChangedLocalConversationItem = {
  type: "personality-changed";
  id: string;
  personality: AppServer.Personality;
};

export type ForkedFromConversationLocalConversationItem = {
  type: "forked-from-conversation";
  id: string;
  sourceConversationId: string;
};

export type ModelChangedLocalConversationItem = {
  type: "model-changed";
  id: string;
  fromModel: string;
  toModel: string;
};

export type ModelReroutedLocalConversationItem = {
  type: "model-rerouted";
  id: string;
  fromModel: string;
  toModel: string;
  reason: AppServer.v2.ModelRerouteReason;
};

type McpToolCallContent = AppServer.v2.McpToolCallResult["content"][number];
type McpInvocation = {
  server: string;
  tool: string;
  arguments: unknown;
};

export type McpAnnotationAudience = "assistant" | "user";

export type McpAnnotations = {
  audience?: Array<McpAnnotationAudience>;
  priority?: number;
  lastModified?: string;
};

export type McpTextContentBlock = {
  type: "text";
  text: string;
  annotations?: McpAnnotations;
};

export type McpImageContentBlock = {
  type: "image";
  mimeType: string;
  data: string;
  annotations?: McpAnnotations;
};

export type McpAudioContentBlock = {
  type: "audio";
  mimeType: string;
  data: string;
  annotations?: McpAnnotations;
};

export type McpResourceLinkContentBlock = {
  type: "resource_link";
  uri: string;
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: McpAnnotations;
};

export type McpEmbeddedResourceValue = {
  uri: string;
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  text?: string;
  blob?: string;
  annotations?: McpAnnotations;
};

export type McpEmbeddedResourceContentBlock = {
  type: "embedded_resource";
  resource: McpEmbeddedResourceValue;
};

export type McpEmbeddedResource = McpEmbeddedResourceContentBlock;

export type McpUnknownContentBlock = {
  type: "unknown";
  raw: McpToolCallContent;
};

export type McpContentBlock =
  | McpTextContentBlock
  | McpImageContentBlock
  | McpAudioContentBlock
  | McpResourceLinkContentBlock
  | McpEmbeddedResourceContentBlock
  | McpUnknownContentBlock;

export type McpToolCallSuccessResult = {
  type: "success";
  content: Array<McpContentBlock>;
  structuredContent: AppServer.v2.McpToolCallResult["structuredContent"];
  raw: AppServer.v2.McpToolCallResult;
};

export type McpToolCallErrorResult = {
  type: "error";
  kind?: "protocol";
  error: string;
  rawError?: AppServer.v2.McpToolCallError;
};

export type McpToolCallResult =
  | McpToolCallSuccessResult
  | McpToolCallErrorResult
  | null;

const optionalMcpStringSchema = z.string().optional().catch(undefined);

const mcpAnnotationsSchema = z
  .object({
    audience: z
      .array(z.enum(["assistant", "user"]))
      .nonempty()
      .optional()
      .catch(undefined),
    priority: z.number().finite().optional().catch(undefined),
    lastModified: optionalMcpStringSchema,
  })
  .strip()
  .transform((annotations): McpAnnotations | undefined => {
    if (
      annotations.audience == null &&
      annotations.priority == null &&
      annotations.lastModified == null
    ) {
      return undefined;
    }
    return annotations;
  });

const optionalMcpAnnotationsSchema = mcpAnnotationsSchema
  .optional()
  .catch(undefined);

const mcpEmbeddedResourceValueSchema = z
  .object({
    uri: z.string(),
    name: optionalMcpStringSchema,
    title: optionalMcpStringSchema,
    description: optionalMcpStringSchema,
    mimeType: optionalMcpStringSchema,
    text: optionalMcpStringSchema,
    blob: optionalMcpStringSchema,
    annotations: optionalMcpAnnotationsSchema,
  })
  .strip();

const mcpKnownContentBlockSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("text"),
      text: z.string(),
      annotations: optionalMcpAnnotationsSchema,
    })
    .strip(),
  z
    .object({
      type: z.literal("image"),
      mimeType: z.string(),
      data: z.string(),
      annotations: optionalMcpAnnotationsSchema,
    })
    .strip(),
  z
    .object({
      type: z.literal("audio"),
      mimeType: z.string(),
      data: z.string(),
      annotations: optionalMcpAnnotationsSchema,
    })
    .strip(),
  z
    .object({
      type: z.literal("resource_link"),
      uri: z.string(),
      name: optionalMcpStringSchema,
      title: optionalMcpStringSchema,
      description: optionalMcpStringSchema,
      mimeType: optionalMcpStringSchema,
      annotations: optionalMcpAnnotationsSchema,
    })
    .strip(),
  z
    .object({
      type: z.literal("embedded_resource"),
      resource: mcpEmbeddedResourceValueSchema,
    })
    .strip(),
  z
    .object({
      type: z.literal("resource"),
      resource: mcpEmbeddedResourceValueSchema,
    })
    .strip(),
]);

export function mapMcpToolCallResult(
  result: AppServer.v2.McpToolCallResult | null,
  error: AppServer.v2.McpToolCallError | null,
): McpToolCallResult {
  if (!result && !error) {
    return null;
  }

  if (error) {
    return {
      type: "error",
      kind: "protocol",
      error: error.message,
      rawError: error,
    };
  }

  if (!result) {
    return null;
  }

  return {
    type: "success",
    content: result.content.map(mapContentBlock),
    structuredContent: result.structuredContent,
    raw: {
      content: result.content,
      structuredContent: result.structuredContent,
    },
  };
}

function mapContentBlock(block: McpToolCallContent): McpContentBlock {
  const parsedBlock = mcpKnownContentBlockSchema.safeParse(block);
  if (!parsedBlock.success) {
    return { type: "unknown", raw: block };
  }

  switch (parsedBlock.data.type) {
    case "text":
      return {
        type: "text",
        text: parsedBlock.data.text,
        ...(parsedBlock.data.annotations != null
          ? { annotations: parsedBlock.data.annotations }
          : {}),
      };

    case "image":
      return {
        type: "image",
        data: parsedBlock.data.data,
        mimeType: parsedBlock.data.mimeType,
        ...(parsedBlock.data.annotations != null
          ? { annotations: parsedBlock.data.annotations }
          : {}),
      };

    case "audio":
      return {
        type: "audio",
        data: parsedBlock.data.data,
        mimeType: parsedBlock.data.mimeType,
        ...(parsedBlock.data.annotations != null
          ? { annotations: parsedBlock.data.annotations }
          : {}),
      };

    case "resource_link":
      return {
        type: "resource_link",
        uri: parsedBlock.data.uri,
        ...(parsedBlock.data.name != null
          ? { name: parsedBlock.data.name }
          : {}),
        ...(parsedBlock.data.title != null
          ? { title: parsedBlock.data.title }
          : {}),
        ...(parsedBlock.data.description != null
          ? { description: parsedBlock.data.description }
          : {}),
        ...(parsedBlock.data.mimeType != null
          ? { mimeType: parsedBlock.data.mimeType }
          : {}),
        ...(parsedBlock.data.annotations != null
          ? { annotations: parsedBlock.data.annotations }
          : {}),
      };

    case "embedded_resource":
    case "resource":
      return {
        type: "embedded_resource",
        resource: {
          uri: parsedBlock.data.resource.uri,
          ...(parsedBlock.data.resource.name != null
            ? { name: parsedBlock.data.resource.name }
            : {}),
          ...(parsedBlock.data.resource.title != null
            ? { title: parsedBlock.data.resource.title }
            : {}),
          ...(parsedBlock.data.resource.description != null
            ? { description: parsedBlock.data.resource.description }
            : {}),
          ...(parsedBlock.data.resource.mimeType != null
            ? { mimeType: parsedBlock.data.resource.mimeType }
            : {}),
          ...(parsedBlock.data.resource.text != null
            ? { text: parsedBlock.data.resource.text }
            : {}),
          ...(parsedBlock.data.resource.blob != null
            ? { blob: parsedBlock.data.resource.blob }
            : {}),
          ...(parsedBlock.data.resource.annotations != null
            ? { annotations: parsedBlock.data.resource.annotations }
            : {}),
        },
      };
  }
}

export type McpToolCallConversationItem = {
  type: "mcp-tool-call";
  callId: string;
  functionName: string;
  invocation: McpInvocation;
  result: McpToolCallResult;
  durationMs: number | null;
  completed: boolean;
};

export type NonEmptyArray<T> = [T, ...Array<T>];

export type MultiAgentActionLocalConversationItem = {
  type: "multi-agent-action";
  id: string;
  action: Exclude<AppServer.v2.CollabAgentTool, "wait">;
  status: AppServer.v2.CollabAgentToolCallStatus;
  senderThreadId: string;
  receiverThreads: Array<{
    threadId: string;
    thread: AppServer.v2.Thread | null;
  }>;
  prompt: string | null;
  model: string | null;
  agentsStates: Record<string, AppServer.v2.CollabAgentState | undefined>;
};

export type LocalConversationItem =
  | UserMessageLocalConversationItem
  | ExecLocalConversationItem
  | ReasoningLocalConversationItem
  | WorkedForLocalConversationItem
  | AssistantMessageLocalConversationItem
  | ProposedPlanLocalConversationItem
  | WebSearchLocalConversationItem
  | PatchApplyLocalConversationItem
  | UserInputLocalConversationItem
  | UserInputResponseLocalConversationItem
  | McpServerElicitationLocalConversationItem
  | TurnDiffLocalConversationItem
  | TodoListConversationItem
  | PlanImplementationLocalConversationItem
  | SystemEventLocalConversationItem
  | StreamErrorLocalConversationItem
  | RemoteTaskCreatedLocalConversationItem
  | ContextCompactionLocalConversationItem
  | PersonalityChangedLocalConversationItem
  | ForkedFromConversationLocalConversationItem
  | ModelChangedLocalConversationItem
  | ModelReroutedLocalConversationItem
  | McpToolCallConversationItem
  | AutomaticApprovalReviewLocalConversationItem
  | MultiAgentActionLocalConversationItem;

export type LocalConversationItemOrHook =
  | LocalConversationItem
  | HookLocalConversationItem;

export function mapTurnStatus(
  status: AppServer.v2.Turn["status"],
): LocalConversationTurn["status"] {
  switch (status) {
    case "completed":
      return "complete";
    case "interrupted":
      return "cancelled";
    case "failed":
      return "complete";
    case "inProgress":
      return "in_progress";
  }
}

export function mapPlanStepStatus(
  status: AppServer.v2.TurnPlanStepStatus,
): TodoListConversationItem["plan"][number]["status"] {
  switch (status) {
    case "pending":
      return "pending";
    case "completed":
      return "completed";
    case "inProgress":
      return "in_progress";
  }
}

export function mapPlanSteps(
  plan: Array<AppServer.v2.TurnPlanStep>,
): TodoListConversationItem["plan"] {
  return plan.map((step) => ({
    step: step.step,
    status: mapPlanStepStatus(step.status),
  }));
}

export function mapCommandActionToParsedCmd(
  action: AppServer.v2.CommandAction,
): ParsedCmdWithoutStatus {
  switch (action.type) {
    case "read":
      return {
        type: "read",
        cmd: action.command,
        name: action.name,
        path: action.path,
      };
    case "listFiles":
      return { type: "list_files", cmd: action.command, path: action.path };
    case "search":
      return {
        type: "search",
        cmd: action.command,
        query: action.query,
        path: action.path,
      };
    case "unknown":
      return { type: "unknown", cmd: action.command };
  }
}

export function mapFileUpdateChanges(
  changes: Array<AppServer.v2.FileUpdateChange>,
): Record<string, FileChange> {
  const mapped: Record<string, FileChange> = {};
  for (const change of changes) {
    const { path, kind, diff } = change;
    switch (kind.type) {
      case "add":
        mapped[path] = { type: "add", content: diff };
        break;
      case "delete":
        mapped[path] = { type: "delete", content: diff };
        break;
      case "update":
        mapped[path] = {
          type: "update",
          unified_diff: diff,
          move_path: kind.move_path ?? null,
        };
        break;
    }
  }
  return mapped;
}
