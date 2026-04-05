import type {
  CodeTaskDetailsResponse,
  ConversationId,
  LocalOrRemoteConversationId,
  TaskAssistantTurn,
} from "protocol";

/** Information about the task that the composer is following up to. */
export type FollowUpProps =
  | {
      type: "local";
      localConversationId: ConversationId;
    }
  | {
      type: "cloud";
      hasAppliedCodeLocally: boolean;
      taskDetails: CodeTaskDetailsResponse;
      selectedTurnId: string;
      selectedTurn?: TaskAssistantTurn;
    };

export function getFollowUpConversationId(
  followUp: FollowUpProps | undefined,
): LocalOrRemoteConversationId | null {
  switch (followUp?.type) {
    case "local":
      return followUp.localConversationId;
    case "cloud":
      return followUp.taskDetails.task.id;
    case undefined:
      return null;
  }
}
