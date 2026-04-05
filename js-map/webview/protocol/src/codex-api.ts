import type { components } from "@oai/codex-backend-client";

/** User-facing site, not necessarily the API URL. */
export const CODEX_HOME_URL = "https://chatgpt.com/codex";
export type AdhocEnvironment = components["schemas"]["AdhocEnvironment"];
export type LocalWorktreeRepoRef =
  components["schemas"]["LocalWorktreeRepoRef"];
export type CreateWorktreeSnapshotUploadUrlRequest =
  components["schemas"]["CreateWorktreeSnapshotUploadUrlRequest"];
export type CreateWorktreeSnapshotUploadUrlResponse =
  components["schemas"]["CreateWorktreeSnapshotUploadUrlResponse"];
export type FinishWorktreeSnapshotUploadRequest =
  components["schemas"]["FinishWorktreeSnapshotUploadRequest"];
export type FinishWorktreeSnapshotUploadResponse =
  components["schemas"]["FinishWorktreeSnapshotUploadResponse"];
export type TaskListItem = components["schemas"]["TaskListItem"];
export type CreateTaskTurnResponse =
  components["schemas"]["CreateCodeTaskTurnResponse"];
export type CodeTaskTurnResponse =
  components["schemas"]["CodeTaskTurnResponse"];
export type DiffStats = components["schemas"]["DiffStats"];
export type ExternalPullRequest =
  components["schemas"]["ExternalPullRequestResponse"];
export type GitPullRequestOutput = components["schemas"]["GitPullRequest"];
export type CodeEnvironment = components["schemas"]["CodeEnvironmentResponse"];
export type ExternalRepoProvider =
  components["schemas"]["ExternalRepoProvider"];
export type GitRepository = components["schemas"]["GitRepository"];
export type CodeTaskDetailsResponse =
  components["schemas"]["CodeTaskDetailsResponse"];
export type CodeTaskTurnsResponse =
  components["schemas"]["CodeTaskTurnsResponse"];
export type MessageOutputItem = components["schemas"]["MessageItem"];
export type PRItemOutput = components["schemas"]["PR"];
export type TextMessageContent = components["schemas"]["TextContent"];
export type TaskAssistantTurn =
  components["schemas"]["TaskAssistantTurnResponse"];
export type Task = components["schemas"]["TaskResponse"];
export type TaskTurnResponseNode =
  components["schemas"]["TaskTurnResponseNode"];
export type TaskUserTurn = components["schemas"]["TaskUserTurnResponse"];
export type OutputDiff = components["schemas"]["OutputDiff"];
export type CommentInputItem = components["schemas"]["CommentInputItem-Output"];
export type DiffModeEnum = components["schemas"]["DiffModeEnum"];
export type CreatePrRequestMode =
  components["schemas"]["CreatePrRequest"]["mode"];
export type CreatePrResponse = components["schemas"]["CreatePrResponse"];
export type PullRequestResponse = components["schemas"]["PullRequestResponse"];
export type InputItem =
  components["schemas"]["CreateTaskTurnRequest"]["input_items"][number];
export type ImageAssetPointer =
  components["schemas"]["ImageAssetPointer-Input"];
export type PriorConversation = Omit<
  components["schemas"]["PriorConversation-Input"],
  "type"
>;
export type AccountEntry = components["schemas"]["AccountEntry"];
export type AccountsCheckResponse =
  components["schemas"]["AccountsCheckResponse"];
export type EnrollRemoteClientResponse =
  components["schemas"]["EnrollRemoteClientResponse"];
export type RemoteEnvironmentSummaryResponse =
  components["schemas"]["RemoteEnvironmentSummaryResponse"];
export type PaginatedRemoteEnvironmentSummaryResponse =
  components["schemas"]["PaginatedList_RemoteEnvironmentSummaryResponse_"];
export type RateLimitStatusPayload =
  components["schemas"]["RateLimitStatusPayload"];
export type RateLimitStatusDetails =
  components["schemas"]["RateLimitStatusDetails"];
export type RateLimitWindowSnapshot =
  components["schemas"]["RateLimitWindowSnapshot"];
export type AdditionalRateLimitDetails =
  components["schemas"]["AdditionalRateLimitDetails"];
export type CreditsDetails = RateLimitStatusPayload["credits"];
export type PromoDetails = RateLimitStatusPayload["promo"];
