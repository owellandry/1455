import type * as AppServer from "app-server-types";

export type McpResponseMessage<Result = unknown> = {
  id: AppServer.RequestId;
  result?: Result;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type McpNotificationMessage<Params = Record<string, unknown>> = {
  method: string;
  params?: Params;
};

export type McpMessage<Result = unknown, Params = Record<string, unknown>> =
  | AppServer.ServerRequest
  | AppServer.ClientRequest
  | McpResponseMessage<Result>
  | McpNotificationMessage<Params>;

export type AppServerNotificationMethod =
  AppServer.ServerNotification["method"];

export type AppServerNotificationParamsForMethod<
  M extends AppServerNotificationMethod,
> = Extract<AppServer.ServerNotification, { method: M }>["params"];

export type AppServerNotificationForMethod<
  M extends AppServerNotificationMethod,
> = Extract<AppServer.ServerNotification, { method: M }>;

/**
 * Exhaustive routing decision for all notifications.
 * `true` means the notification is delivered to webview.
 */
export const APP_SERVER_NOTIFICATION_OPT_IN = {
  error: true,
  "thread/started": true,
  "thread/name/updated": true,
  "thread/tokenUsage/updated": true,
  "turn/started": true,
  "hook/started": true,
  "turn/completed": true,
  "hook/completed": true,
  "turn/diff/updated": true,
  "turn/plan/updated": true,
  "item/started": true,
  "item/autoApprovalReview/started": true,
  "item/autoApprovalReview/completed": true,
  "item/completed": true,
  "rawResponseItem/completed": false,
  "item/agentMessage/delta": true,
  "item/plan/delta": true,
  "command/exec/outputDelta": false,
  "item/commandExecution/outputDelta": true,
  "item/commandExecution/terminalInteraction": false,
  "item/fileChange/outputDelta": true,
  "serverRequest/resolved": true,
  "item/mcpToolCall/progress": true,
  "mcpServer/oauthLogin/completed": true,
  "mcpServer/startupStatus/updated": false,
  "account/updated": true,
  "account/rateLimits/updated": true,
  "app/list/updated": true,
  "fs/changed": false,
  "item/reasoning/summaryTextDelta": true,
  "item/reasoning/summaryPartAdded": true,
  "item/reasoning/textDelta": true,
  "thread/compacted": false,
  deprecationNotice: true,
  configWarning: true,
  "windows/worldWritableWarning": false,
  "windowsSandbox/setupCompleted": true,
  "account/login/completed": true,
  "model/rerouted": true,
  authStatusChange: false,
  loginChatGptComplete: false,
  sessionConfigured: true,
  "codex/event/session_configured": true,
  "codex/event/task_started": false,
  "codex/event/agent_reasoning": false,
  "codex/event/agent_message": false,
  "codex/event/task_complete": false,
  "codex/event/mcp_tool_call_begin": false,
  "codex/event/mcp_tool_call_end": false,
  "codex/event/exec_command_begin": false,
  "codex/event/exec_command_end": false,
  "codex/event/exec_command_output_delta": false,
  "codex/event/exec_approval_request": false,
  "codex/event/apply_patch_approval_request": false,
  "codex/event/background_event": false,
  "codex/event/turn_diff": false,
  "codex/event/get_history_entry_response": false,
  "codex/event/agent_reasoning_delta": false,
  "codex/event/agent_reasoning_section_break": false,
  "codex/event/agent_message_delta": false,
  "codex/event/stream_error": false,
  "codex/event/error": false,
  "codex/event/turn_aborted": false,
  "codex/event/plan_delta": false,
  "codex/event/plan_update": false,
  "codex/event/patch_apply_begin": false,
  "codex/event/patch_apply_end": false,
  "codex/event/item_started": false,
  "codex/event/item_completed": false,
  "codex/event/user_message": false,
  "codex/event/agent_reasoning_raw_content": false,
  "codex/event/agent_reasoning_raw_content_delta": false,
  "codex/event/web_search_begin": false,
  "codex/event/web_search_end": false,
  "codex/event/mcp_list_tools_response": false,
  "codex/event/list_skills_response": false,
  "codex/event/list_remote_skills_response": false,
  "codex/event/remote_skill_downloaded": false,
  "codex/event/list_custom_prompts_response": false,
  "codex/event/raw_response_item": false,
  "codex/event/agent_message_content_delta": false,
  "codex/event/reasoning_content_delta": false,
  "codex/event/reasoning_raw_content_delta": false,
  "codex/event/warning": false,
  "codex/event/undo_started": false,
  "codex/event/undo_completed": false,
  "codex/event/shutdown_complete": false,
  "codex/event/entered_review_mode": false,
  "codex/event/exited_review_mode": false,
  "codex/event/view_image_tool_call": false,
  "codex/event/mcp_startup_update": false,
  "codex/event/mcp_startup_complete": false,
  "codex/event/remote_task_created": false,
  "codex/event/thread_rolled_back": false,
  "codex/event/thread_name_updated": false,
  "codex/event/collab_agent_spawn_begin": true,
  "codex/event/collab_agent_spawn_end": true,
  "codex/event/collab_agent_interaction_begin": true,
  "codex/event/collab_agent_interaction_end": true,
  "codex/event/collab_resume_begin": true,
  "codex/event/collab_resume_end": true,
  "codex/event/collab_waiting_begin": true,
  "codex/event/collab_waiting_end": true,
  "codex/event/collab_close_begin": true,
  "codex/event/collab_close_end": true,
  "codex/event/elicitation_request": false,
  "codex/event/dynamic_tool_call_request": false,
  "codex/event/request_user_input": false,
  "codex/event/terminal_interaction": false,
  "codex/event/token_count": false,
  "codex/event/deprecation_notice": false,
  "fuzzyFileSearch/sessionUpdated": true,
  "fuzzyFileSearch/sessionCompleted": true,
  "thread/archived": true,
  "thread/closed": false,
  "thread/unarchived": true,
  "skills/changed": true,
  "thread/realtime/started": true,
  "thread/realtime/itemAdded": false,
  "thread/realtime/transcriptUpdated": false,
  "thread/realtime/outputAudio/delta": true,
  "thread/realtime/error": true,
  "thread/realtime/closed": true,
  "thread/status/changed": true,
} as const satisfies Record<AppServerNotificationMethod, boolean> &
  Record<string, boolean>;

export type AppServerKnownNotificationMethod =
  keyof typeof APP_SERVER_NOTIFICATION_OPT_IN;

export type AppServerWebviewNotificationMethod = Extract<
  {
    [M in AppServerKnownNotificationMethod]: (typeof APP_SERVER_NOTIFICATION_OPT_IN)[M] extends true
      ? M
      : never;
  }[AppServerKnownNotificationMethod],
  AppServerNotificationMethod
>;

export type AppServerWebviewNotification =
  AppServerNotificationForMethod<AppServerWebviewNotificationMethod>;

const CONNECTION_INTERNAL_NOTIFICATION_METHODS =
  new Set<AppServerKnownNotificationMethod>(["command/exec/outputDelta"]);

export const APP_SERVER_NOTIFICATION_METHODS_TO_OPT_OUT = (
  Object.entries(APP_SERVER_NOTIFICATION_OPT_IN) as Array<
    [AppServerKnownNotificationMethod, boolean]
  >
)
  .filter(
    ([method, shouldHandleInWebview]) =>
      !shouldHandleInWebview &&
      !CONNECTION_INTERNAL_NOTIFICATION_METHODS.has(method),
  )
  .map(([method]) => method);

export function isAppServerNotificationMethod(
  method: string,
): method is AppServerKnownNotificationMethod {
  return method in APP_SERVER_NOTIFICATION_OPT_IN;
}

export function isAppServerWebviewNotificationMethod(
  method: string,
): method is AppServerWebviewNotificationMethod {
  if (!isAppServerNotificationMethod(method)) {
    return false;
  }
  return APP_SERVER_NOTIFICATION_OPT_IN[method];
}

export type ClientRequestWithParams = AppServer.ClientRequest extends infer U
  ? U extends { params: unknown }
    ? U
    : U & { params: Record<string, never> }
  : never;

/**
 * Mapping of MCP methods to their response payloads.
 * Keep this in sync with the app-server API.
 */
export type AppServerMethodResponseMap = {
  "account/login/cancel": AppServer.v2.CancelLoginAccountResponse;
  "account/login/start": AppServer.v2.LoginAccountResponse;
  "account/logout": AppServer.v2.LogoutAccountResponse;
  "account/rateLimits/read": AppServer.v2.GetAccountRateLimitsResponse;
  "account/read": AppServer.v2.GetAccountResponse;
  "config/mcpServer/reload": Record<string, never>;
  "config/batchWrite": AppServer.v2.ConfigWriteResponse;
  "config/read": AppServer.v2.ConfigReadResponse;
  "configRequirements/read": AppServer.v2.ConfigRequirementsReadResponse;
  "config/value/write": AppServer.v2.ConfigWriteResponse;
  "externalAgentConfig/detect": AppServer.v2.ExternalAgentConfigDetectResponse;
  "externalAgentConfig/import": AppServer.v2.ExternalAgentConfigImportResponse;
  "app/list": AppServer.v2.AppsListResponse;
  "fs/copy": AppServer.v2.FsCopyResponse;
  "fs/createDirectory": AppServer.v2.FsCreateDirectoryResponse;
  "fs/getMetadata": AppServer.v2.FsGetMetadataResponse;
  "fs/readDirectory": AppServer.v2.FsReadDirectoryResponse;
  "fs/readFile": AppServer.v2.FsReadFileResponse;
  "fs/remove": AppServer.v2.FsRemoveResponse;
  "fs/unwatch": AppServer.v2.FsUnwatchResponse;
  "fs/watch": AppServer.v2.FsWatchResponse;
  "fs/writeFile": AppServer.v2.FsWriteFileResponse;
  "plugin/install": AppServer.v2.PluginInstallResponse;
  "plugin/list": AppServer.v2.PluginListResponse;
  "plugin/read": AppServer.v2.PluginReadResponse;
  "plugin/uninstall": AppServer.v2.PluginUninstallResponse;
  "experimentalFeature/enablement/set": AppServer.v2.ExperimentalFeatureEnablementSetResponse;
  "experimentalFeature/list": AppServer.v2.ExperimentalFeatureListResponse;
  "collaborationMode/list": AppServer.v2.CollaborationModeListResponse;
  getConversationSummary: AppServer.GetConversationSummaryResponse;
  "model/list": AppServer.v2.ModelListResponse;
  "mock/experimentalMethod": AppServer.v2.MockExperimentalMethodResponse;
  "review/start": AppServer.v2.ReviewStartResponse;
  "skills/config/write": AppServer.v2.SkillsConfigWriteResponse;
  "skills/list": AppServer.v2.SkillsListResponse;
  "command/exec": AppServer.v2.CommandExecResponse;
  "command/exec/write": AppServer.v2.CommandExecWriteResponse;
  "command/exec/resize": AppServer.v2.CommandExecResizeResponse;
  "command/exec/terminate": AppServer.v2.CommandExecTerminateResponse;
  "thread/list": AppServer.v2.ThreadListResponse;
  "thread/archive": AppServer.v2.ThreadArchiveResponse;
  "thread/backgroundTerminals/clean": AppServer.v2.ThreadBackgroundTerminalsCleanResponse;
  "thread/compact/start": AppServer.v2.ThreadCompactStartResponse;
  "thread/loaded/list": AppServer.v2.ThreadLoadedListResponse;
  "thread/unarchive": AppServer.v2.ThreadUnarchiveResponse;
  "thread/read": AppServer.v2.ThreadReadResponse;
  "thread/fork": AppServer.v2.ThreadForkResponse;
  "thread/metadata/update": AppServer.v2.ThreadMetadataUpdateResponse;
  "thread/realtime/appendAudio": AppServer.v2.ThreadRealtimeAppendAudioResponse;
  "thread/realtime/appendText": AppServer.v2.ThreadRealtimeAppendTextResponse;
  "thread/realtime/start": AppServer.v2.ThreadRealtimeStartResponse;
  "thread/realtime/stop": AppServer.v2.ThreadRealtimeStopResponse;
  "thread/rollback": AppServer.v2.ThreadRollbackResponse;
  "thread/resume": AppServer.v2.ThreadResumeResponse;
  "thread/shellCommand": AppServer.v2.ThreadShellCommandResponse;
  "thread/start": AppServer.v2.ThreadStartResponse;
  "thread/name/set": AppServer.v2.ThreadSetNameResponse;
  "turn/start": AppServer.v2.TurnStartResponse;
  "turn/steer": AppServer.v2.TurnSteerResponse;
  "turn/interrupt": AppServer.v2.TurnInterruptResponse;
  "windowsSandbox/setupStart": AppServer.v2.WindowsSandboxSetupStartResponse;
  "feedback/upload": AppServer.v2.FeedbackUploadResponse;
  "mcpServerStatus/list": AppServer.v2.ListMcpServerStatusResponse;
  "mcpServer/oauth/login": AppServer.v2.McpServerOauthLoginResponse;
  fuzzyFileSearch: AppServer.FuzzyFileSearchResponse;
  "fuzzyFileSearch/sessionStart": AppServer.FuzzyFileSearchSessionStartResponse;
  "fuzzyFileSearch/sessionUpdate": AppServer.FuzzyFileSearchSessionUpdateResponse;
  "fuzzyFileSearch/sessionStop": AppServer.FuzzyFileSearchSessionStopResponse;
  getAuthStatus: AppServer.GetAuthStatusResponse;
  gitDiffToRemote: AppServer.GitDiffToRemoteResponse;
  initialize: AppServer.InitializeResponse;
};

type Assert<T extends true> = T;

type FsRequestMethod = Extract<
  ClientRequestWithParams["method"],
  `fs/${string}`
>;
type FsResponseMethod = Extract<
  keyof AppServerMethodResponseMap,
  `fs/${string}`
>;

export type KnownMcpMethod =
  Assert<FsRequestMethod extends FsResponseMethod ? true : false> extends true
    ? Assert<
        FsResponseMethod extends FsRequestMethod ? true : false
      > extends true
      ? keyof AppServerMethodResponseMap
      : never
    : never;

export type RequestParamsForMethod<M extends KnownMcpMethod> =
  Extract<ClientRequestWithParams, { method: M }> extends { params: infer P }
    ? P
    : never;

export type ResponseForMethod<M extends KnownMcpMethod> =
  AppServerMethodResponseMap[M];

export type McpResponseForMethod<M extends KnownMcpMethod> = McpResponseMessage<
  ResponseForMethod<M>
>;
