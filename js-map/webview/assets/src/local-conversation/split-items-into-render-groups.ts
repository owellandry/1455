import { isAgentBodyItem } from "./items/is-agent-body-item";
import type {
  AssistantMessageLocalConversationItem,
  AutomaticApprovalReviewLocalConversationItem,
  ExecLocalConversationItem,
  ForkedFromConversationLocalConversationItem,
  HookLocalConversationItem,
  LocalConversationItemOrHook,
  ModelChangedLocalConversationItem,
  ModelReroutedLocalConversationItem,
  McpServerElicitationLocalConversationItem,
  PatchApplyLocalConversationItem,
  PersonalityChangedLocalConversationItem,
  PlanImplementationLocalConversationItem,
  ProposedPlanLocalConversationItem,
  RemoteTaskCreatedLocalConversationItem,
  SystemEventLocalConversationItem,
  TodoListConversationItem,
  TurnDiffLocalConversationItem,
  UserInputLocalConversationItem,
  UserMessageLocalConversationItem,
} from "./items/local-conversation-item";
import type { LocalConversationTurn } from "./items/map-mcp-conversation-turn";

/**
 * Groups items into the user, agent, and assistant items for the visual display.
 * The first user message and last assistant message are always shown.
 * All agent items are shown, with expansion state determined by completion status.
 *
 * NOTE: the logic in this function is held together with unit tests.
 * To clean this up, we need more information like isFinal on assistant messages (CODEX-2785)
 */
export function splitItemsIntoRenderGroups(
  items: Array<LocalConversationItemOrHook>,
  status: LocalConversationTurn["status"],
): {
  // Items
  preUserItems: Array<HookLocalConversationItem>;
  userItems: Array<UserMessageLocalConversationItem>;
  agentItems: Array<LocalConversationItemOrHook>;
  assistantItem: AssistantMessageLocalConversationItem | null;
  postAssistantItems: Array<
    AutomaticApprovalReviewLocalConversationItem | HookLocalConversationItem
  >;
  systemEventItem: SystemEventLocalConversationItem | null;
  unifiedDiffItem: TurnDiffLocalConversationItem | null;
  remoteTaskCreatedItems: Array<RemoteTaskCreatedLocalConversationItem>;
  personalityChangedItems: Array<PersonalityChangedLocalConversationItem>;
  forkedFromConversationItems: Array<ForkedFromConversationLocalConversationItem>;
  modelChangedItems: Array<ModelChangedLocalConversationItem>;
  modelReroutedItems: Array<ModelReroutedLocalConversationItem>;
  todoListItem: TodoListConversationItem | null;
  proposedPlanItem: ProposedPlanLocalConversationItem | null;
  planImplementationItem: PlanImplementationLocalConversationItem | null;
  mcpServerElicitationItems: Array<McpServerElicitationLocalConversationItem>;
  approvalItem:
    | PatchApplyLocalConversationItem
    | ExecLocalConversationItem
    | null;
  userInputItem: UserInputLocalConversationItem | null;
} {
  let latestApproval:
    | PatchApplyLocalConversationItem
    | ExecLocalConversationItem
    | null = null;
  let userInputItem: UserInputLocalConversationItem | null = null;
  const preUserItems = Array<HookLocalConversationItem>();
  const userItems = Array<UserMessageLocalConversationItem>();
  let unifiedDiffItem: TurnDiffLocalConversationItem | null = null;
  let todoListItem: TodoListConversationItem | null = null;
  let proposedPlanItem: ProposedPlanLocalConversationItem | null = null;
  let planImplementationItem: PlanImplementationLocalConversationItem | null =
    null;
  const mcpServerElicitationItems =
    Array<McpServerElicitationLocalConversationItem>();
  const pendingMcpServerNames = new Set<string>();

  const agentItems = Array<LocalConversationItemOrHook>();
  const postAssistantItems = Array<
    AutomaticApprovalReviewLocalConversationItem | HookLocalConversationItem
  >();
  const remoteTaskCreatedItems =
    Array<RemoteTaskCreatedLocalConversationItem>();
  const personalityChangedItems =
    Array<PersonalityChangedLocalConversationItem>();
  const forkedFromConversationItems =
    Array<ForkedFromConversationLocalConversationItem>();
  const modelChangedItems = Array<ModelChangedLocalConversationItem>();
  const modelReroutedItems = Array<ModelReroutedLocalConversationItem>();
  let foundNonUserMessage = false;

  for (const [index, item] of items.entries()) {
    if (!foundNonUserMessage && item.type === "user-message") {
      userItems.push(item);
      continue;
    }
    if (!foundNonUserMessage && item.type === "hook") {
      preUserItems.push(item);
      continue;
    }
    foundNonUserMessage = true;

    if (item.type === "turn-diff") {
      unifiedDiffItem = item;
    }
    if (item.type === "todo-list") {
      todoListItem = item;
    }
    if (item.type === "proposed-plan") {
      proposedPlanItem = item;
      continue;
    }
    if (item.type === "remote-task-created") {
      remoteTaskCreatedItems.push(item);
    }
    if (item.type === "personality-changed") {
      personalityChangedItems.push(item);
    }
    if (item.type === "forked-from-conversation") {
      forkedFromConversationItems.push(item);
    }
    if (item.type === "model-changed") {
      modelChangedItems.push(item);
      continue;
    }
    if (item.type === "model-rerouted") {
      modelReroutedItems.push(item);
      continue;
    }

    // Approval items
    if (item.type === "plan-implementation") {
      planImplementationItem = item;
      continue;
    }
    if (item.type === "mcp-server-elicitation" && item.completed !== true) {
      const pendingMcpServerName = getPendingMcpServerName(item);
      if (pendingMcpServerName != null) {
        pendingMcpServerNames.add(pendingMcpServerName);
      }
      mcpServerElicitationItems.push(item);
      continue;
    }
    const pendingPatchApproval = isPendingPatchApproval(item);
    const pendingExecApproval =
      !pendingPatchApproval && isPendingExecApproval(item);
    if (pendingPatchApproval || pendingExecApproval) {
      latestApproval = item;
      continue;
    }
    if (item.type === "userInput" && item.completed !== true) {
      userInputItem = item;
      continue;
    }
    if (item.type === "hook") {
      const hasLaterChronologicalContent = items
        .slice(index + 1)
        .some(
          (laterItem) =>
            laterItem.type === "user-message" || isAgentBodyItem(laterItem),
        );
      if (hasLaterChronologicalContent) {
        agentItems.push(item);
        continue;
      }
      postAssistantItems.push(item);
      continue;
    }
    if (item.type === "user-message") {
      agentItems.push(item);
      continue;
    }

    if (isAgentBodyItem(item)) {
      agentItems.push(item);
    }
  }
  // TODO (CODEX-2785): we really want an isFinal flag on the assistant message to know whether to extract it or not.
  const trailingAutomaticApprovalReviewItems =
    popTrailingAutomaticApprovalReviewItems(agentItems);
  const filteredAgentItems =
    pendingMcpServerNames.size > 0
      ? agentItems.filter((item) => {
          return (
            item.type !== "mcp-tool-call" ||
            item.completed ||
            !pendingMcpServerNames.has(item.invocation.server)
          );
        })
      : agentItems;
  const lastAssistantCandidate =
    filteredAgentItems[filteredAgentItems.length - 1];
  const assistantItem = isAssistantMessage(lastAssistantCandidate)
    ? lastAssistantCandidate
    : null;
  const assistantHasContent =
    (assistantItem?.content?.trim().length ?? 0) > 0 ||
    // Should always have content if structured output is present, however, keeping here for clarity and forwards compatibility.
    !!assistantItem?.structuredOutput;
  if (assistantItem) {
    filteredAgentItems.pop();
    postAssistantItems.push(...trailingAutomaticApprovalReviewItems);
  } else {
    filteredAgentItems.push(...trailingAutomaticApprovalReviewItems);
  }

  const lastAgentAfterAssistant =
    filteredAgentItems[filteredAgentItems.length - 1];
  // If there is no assistant message and there is a system event, show the system event.
  // This will show errors like auth or model issues.
  const systemEventItem =
    status !== "in_progress" &&
    !assistantHasContent &&
    isSystemError(lastAgentAfterAssistant)
      ? lastAgentAfterAssistant
      : null;
  if (systemEventItem) {
    filteredAgentItems.pop();
  }

  return {
    preUserItems,
    userItems,
    agentItems: filteredAgentItems,
    assistantItem,
    postAssistantItems,
    systemEventItem,
    unifiedDiffItem,
    remoteTaskCreatedItems,
    personalityChangedItems,
    forkedFromConversationItems,
    modelChangedItems,
    modelReroutedItems,
    todoListItem,
    proposedPlanItem,
    planImplementationItem,
    mcpServerElicitationItems,
    approvalItem: latestApproval,
    userInputItem,
  };
}

const isPendingPatchApproval = (
  item: LocalConversationItemOrHook,
): item is PatchApplyLocalConversationItem =>
  item.type === "patch" &&
  item.approvalRequestId != null &&
  item.success == null;

const isPendingExecApproval = (
  item: LocalConversationItemOrHook,
): item is ExecLocalConversationItem =>
  item.type === "exec" &&
  item.approvalRequestId != null &&
  item.output?.exitCode === undefined;

const isAssistantMessage = (
  item: LocalConversationItemOrHook | undefined,
): item is AssistantMessageLocalConversationItem =>
  item?.type === "assistant-message";

const popTrailingAutomaticApprovalReviewItems = (
  items: Array<LocalConversationItemOrHook>,
): Array<AutomaticApprovalReviewLocalConversationItem> => {
  const trailingItems = Array<AutomaticApprovalReviewLocalConversationItem>();

  while (true) {
    const lastItem = items[items.length - 1];
    if (lastItem?.type !== "automatic-approval-review") {
      break;
    }
    items.pop();
    trailingItems.unshift(lastItem);
  }

  return trailingItems;
};

const getPendingMcpServerName = (
  item: McpServerElicitationLocalConversationItem,
): string | null => {
  switch (item.elicitation.kind) {
    case "generic":
      return item.elicitation.serverName.trim() || null;
    case "mcpToolCall":
      return item.elicitation.approval.connector_id;
    case "toolSuggestion":
      return null;
  }
};

const isSystemError = (
  item: LocalConversationItemOrHook | undefined,
): item is SystemEventLocalConversationItem => item?.type === "system-error";
