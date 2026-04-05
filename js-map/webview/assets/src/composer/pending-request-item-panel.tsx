import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactNode,
  useState,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import { IMPLEMENT_PLAN_PREFIX } from "@/app-server/conversation-request";
import { Button } from "@/components/button";
import { aAgentMode } from "@/composer/composer-atoms";
import { useCollaborationMode } from "@/composer/use-collaboration-mode";
import type {
  ExecLocalConversationItem,
  PatchApplyLocalConversationItem,
  UserInputLocalConversationItem,
} from "@/local-conversation/items/local-conversation-item";
import { FileChangeEntryContent } from "@/local-conversation/items/patch-item-content";
import { quoteCmd } from "@/local-conversation/items/quote-cmd";
import type { PendingRequest } from "@/local-conversation/pending-request";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";

import { McpServerElicitationRequestPanel } from "./mcp-server-elicitation-request-panel";
import {
  RequestInputPanel,
  type RequestInputPanelAnswers,
} from "./request-input-panel";

const IMPLEMENT_PLAN_OPTION_ID = "implement-plan";

export type { PendingRequest } from "@/local-conversation/pending-request";

export function PendingRequestItemPanel({
  approvalQuestionActor,
  conversationId,
  pendingRequest,
  onSubmitLocalFollowup,
}: {
  approvalQuestionActor?: ReactNode;
  conversationId: ConversationId;
  pendingRequest: PendingRequest;
  onSubmitLocalFollowup: (
    prompt: string,
    collaborationMode?: AppServer.CollaborationMode,
  ) => Promise<void> | void;
}): React.ReactElement | null {
  const appServerManager = useAppServerManagerForConversationId(conversationId);

  switch (pendingRequest.type) {
    case "userInput":
      return (
        <UserInputRequestPanel
          conversationId={conversationId}
          appServerManager={appServerManager}
          request={pendingRequest.item}
        />
      );
    case "approval":
      return (
        <ApprovalRequestPanel
          actor={approvalQuestionActor}
          conversationId={conversationId}
          item={pendingRequest.item}
          appServerManager={appServerManager}
          onSubmitLocalFollowup={onSubmitLocalFollowup}
        />
      );
    case "mcpServerElicitation":
      return (
        <McpServerElicitationRequestPanel
          conversationId={conversationId}
          requestId={pendingRequest.requestId}
          elicitation={pendingRequest.elicitation}
        />
      );
    case "implementPlan":
      return (
        <ImplementPlanRequestPanel
          conversationId={conversationId}
          pendingRequest={pendingRequest}
          onSubmitLocalFollowup={onSubmitLocalFollowup}
        />
      );
  }
}

function ImplementPlanRequestPanel({
  conversationId,
  pendingRequest,
  onSubmitLocalFollowup,
}: {
  conversationId: ConversationId;
  pendingRequest: Extract<PendingRequest, { type: "implementPlan" }>;
  onSubmitLocalFollowup: (
    prompt: string,
    collaborationMode?: AppServer.CollaborationMode,
  ) => Promise<void> | void;
}): React.ReactElement {
  const { modes, setSelectedMode } = useCollaborationMode(conversationId);
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const intl = useIntl();
  const scope = useScope(AppScope);

  const handleSubmit = (answers: RequestInputPanelAnswers): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_request_input_submitted",
      metadata: {
        kind: "implement_plan",
        question_count: 1,
      },
    });

    const answer = answers[0];
    const selectedOptionId = answer?.selectedOptionId ?? null;
    appServerManager.removePlanImplementationRequest(
      conversationId,
      pendingRequest.turnId,
    );
    if (selectedOptionId === IMPLEMENT_PLAN_OPTION_ID) {
      setSelectedMode("default");
      void onSubmitLocalFollowup(
        `${IMPLEMENT_PLAN_PREFIX}\n${pendingRequest.planContent}`,
        modes.find((m) => m.mode === "default"),
      );
      return;
    }
    const freeformText = answer?.freeformText?.trim();
    if (freeformText == null || freeformText.length === 0) {
      return;
    }
    void onSubmitLocalFollowup(freeformText);
  };

  const handleEscapeDismiss = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_request_input_dismissed",
      metadata: {
        kind: "implement_plan",
      },
    });

    appServerManager.removePlanImplementationRequest(
      conversationId,
      pendingRequest.turnId,
    );
  };

  return (
    <RequestInputPanel
      isPlanMode
      questionAndOptions={[
        {
          question: intl.formatMessage({
            id: "implementPlanRequest.prompt",
            defaultMessage: "Implement this plan?",
            description:
              "Prompt shown when approving execution of a completed plan",
          }),
          isOther: true,
          options: [
            {
              id: IMPLEMENT_PLAN_OPTION_ID,
              value: intl.formatMessage({
                id: "implementPlanRequest.option.implement",
                defaultMessage: "Yes, implement this plan",
                description: "Option label to implement the plan immediately",
              }),
            },
          ],
        },
      ]}
      onSubmit={handleSubmit}
      onEscapeDissmiss={handleEscapeDismiss}
    />
  );
}

function UserInputRequestPanel({
  conversationId,
  appServerManager,
  request,
}: {
  conversationId: ConversationId;
  appServerManager: AppServerManager;
  request: UserInputLocalConversationItem;
}): React.ReactElement | null {
  const { activeMode } = useCollaborationMode(conversationId);
  const isPlanMode = activeMode.mode === "plan";
  const scope = useScope(AppScope);
  if (request.questions.length === 0) {
    return null;
  }

  const questionAndOptions = request.questions.map((question) => ({
    question: question.question,
    isOther: question.isOther,
    options: question.options.map((option) => ({
      id: option.label,
      value: option.label,
      description:
        option.description.trim().length > 0 ? option.description : null,
    })),
  }));

  const handleSubmit = (answers: RequestInputPanelAnswers): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_request_input_submitted",
      metadata: {
        kind: "user_input",
        question_count: request.questions.length,
      },
    });

    const response = buildUserInputResponse(request.questions, answers);
    appServerManager.replyWithUserInputResponse(
      conversationId,
      request.requestId,
      response,
    );
  };

  const handleEscapeDismiss = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_request_input_dismissed",
      metadata: {
        kind: "user_input",
      },
    });

    void appServerManager.interruptConversation(conversationId);
  };

  return (
    <RequestInputPanel
      isPlanMode={isPlanMode}
      questionAndOptions={questionAndOptions}
      onSubmit={handleSubmit}
      onEscapeDissmiss={handleEscapeDismiss}
    />
  );
}

function ApprovalRequestPanel({
  actor,
  conversationId,
  item,
  appServerManager,
  onSubmitLocalFollowup,
}: {
  actor?: ReactNode;
  conversationId: ConversationId;
  item: ExecLocalConversationItem | PatchApplyLocalConversationItem;
  appServerManager: AppServerManager;
  onSubmitLocalFollowup: (
    prompt: string,
    collaborationMode?: AppServer.CollaborationMode,
  ) => Promise<void> | void;
}): React.ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const agentMode = useAtomValue(aAgentMode);
  const actorWithKey =
    actor != null && isValidElement(actor)
      ? cloneElement(actor, { key: "actor" })
      : actor;

  if (item.approvalRequestId == null) {
    return null;
  }

  const networkApprovalContext =
    item.type === "exec" ? (item.networkApprovalContext ?? null) : null;
  const isNetworkApproval = networkApprovalContext != null;
  const allowNetworkPolicyAmendment =
    item.type === "exec"
      ? (item.proposedNetworkPolicyAmendments?.find(
          (amendment) => amendment.action === "allow",
        ) ?? null)
      : null;
  const validExecpolicyAmendment =
    item.type === "exec"
      ? getValidExecpolicyAmendment(item.proposedExecpolicyAmendment)
      : null;

  const question =
    item.type === "exec" ? (
      isNetworkApproval ? (
        actor == null ? (
          intl.formatMessage(
            {
              id: "execApprovalRequest.network.prompt",
              defaultMessage:
                'Do you want to approve network access to "{host}"?',
              description: "Prompt shown when approving managed network access",
            },
            { host: networkApprovalContext.host },
          )
        ) : (
          <FormattedMessage
            id="execApprovalRequest.network.prompt.actor"
            defaultMessage='Do you want {actor} to approve network access to "{host}"?'
            description="Prompt shown when approving managed network access for a child agent."
            values={{
              actor: actorWithKey,
              host: networkApprovalContext.host,
            }}
          />
        )
      ) : (
        (item.approvalReason ??
        (actor == null ? (
          intl.formatMessage({
            id: "execApprovalRequest.prompt",
            defaultMessage: "Do you want to run this command?",
            description: "Prompt shown when approving a command execution",
          })
        ) : (
          <FormattedMessage
            id="execApprovalRequest.prompt.actor"
            defaultMessage="Do you want {actor} to run this command?"
            description="Prompt shown when approving a command execution for a child agent."
            values={{ actor: actorWithKey }}
          />
        )))
      )
    ) : actor == null ? (
      intl.formatMessage({
        id: "patchApprovalRequest.prompt",
        defaultMessage: "Do you want to make these changes?",
        description: "Prompt shown when approving a patch application",
      })
    ) : (
      <FormattedMessage
        id="patchApprovalRequest.prompt.actor"
        defaultMessage="Do you want {actor} to make these changes?"
        description="Prompt shown when approving a patch application for a child agent."
        values={{ actor: actorWithKey }}
      />
    );
  const amendmentCommand =
    item.type === "exec" && validExecpolicyAmendment != null
      ? quoteCmd(validExecpolicyAmendment)
      : null;
  const isSingleLineAmendmentCommand =
    amendmentCommand != null &&
    !amendmentCommand.includes("\n") &&
    !amendmentCommand.includes("\r");
  const questionAndOptions = [
    {
      question,
      isOther: true,
      options:
        item.type === "exec"
          ? isNetworkApproval
            ? [
                {
                  id: "accept",
                  value: intl.formatMessage({
                    id: "execApprovalRequest.network.menu.allowOnce",
                    defaultMessage: "Yes, just this once",
                    description:
                      "Approve a network request only for the current attempt",
                  }),
                },
                {
                  id: "acceptForSession",
                  value: intl.formatMessage({
                    id: "execApprovalRequest.network.menu.allowForSession",
                    defaultMessage:
                      "Yes, and allow this host for this conversation",
                    description:
                      "Approve a network request for the current conversation",
                  }),
                },
                ...(allowNetworkPolicyAmendment == null
                  ? []
                  : [
                      {
                        id: "applyNetworkPolicyAmendment",
                        value: intl.formatMessage({
                          id: "execApprovalRequest.network.menu.allowAlways",
                          defaultMessage:
                            "Yes, and allow this host in the future",
                          description:
                            "Approve a network request and save a host allowlist rule",
                        }),
                      },
                    ]),
              ]
            : [
                {
                  id: "accept",
                  value: intl.formatMessage({
                    id: "execApprovalRequest.menu.runOnce",
                    defaultMessage: "Yes",
                    description: "Approve a command execution",
                  }),
                },
                ...(amendmentCommand
                  ? [
                      {
                        id: "acceptWithExecpolicyAmendment",
                        value: isSingleLineAmendmentCommand ? (
                          <span className="flex w-full min-w-0 items-center gap-1">
                            <FormattedMessage
                              id="execApprovalRequest.menu.runAlwaysWithAmendment.prefix"
                              defaultMessage="Yes, and don't ask again for commands that start with"
                              description="Prefix for approving a command execution with an execpolicy amendment"
                            />
                            <span
                              className="text-size-code min-w-0 flex-1 truncate rounded-md font-mono leading-relaxed text-token-input-placeholder-foreground"
                              title={amendmentCommand}
                            >
                              {amendmentCommand}
                            </span>
                          </span>
                        ) : (
                          <span className="flex w-full min-w-0 flex-col gap-1">
                            <FormattedMessage
                              id="execApprovalRequest.menu.runAlwaysWithAmendment.prefix"
                              defaultMessage="Yes, and don't ask again for commands that start with"
                              description="Prefix for approving a command execution with an execpolicy amendment"
                            />
                            <span
                              className="text-size-code line-clamp-2 w-full min-w-0 rounded-md font-mono leading-relaxed text-token-input-placeholder-foreground"
                              title={amendmentCommand}
                            >
                              {amendmentCommand}
                            </span>
                          </span>
                        ),
                        ariaLabel: intl.formatMessage(
                          {
                            id: "execApprovalRequest.menu.runAlwaysWithAmendment",
                            defaultMessage:
                              "Yes, and don't ask again for commands that start with {command}",
                            description:
                              "Approve a command execution for commands with the same prefix",
                          },
                          { command: amendmentCommand },
                        ),
                      },
                    ]
                  : [
                      {
                        id: "acceptForSession",
                        value: intl.formatMessage({
                          id: "execApprovalRequest.menu.runAlways",
                          defaultMessage:
                            "Yes, and don't ask again this session",
                          description:
                            "Approve a command execution for this session",
                        }),
                      },
                    ]),
              ]
          : [
              {
                id: "accept",
                value: intl.formatMessage({
                  id: "patchApprovalRequest.menu.allowOnce",
                  defaultMessage: "Yes",
                  description: "Approve a patch application",
                }),
              },
              {
                id: "acceptForSession",
                value: intl.formatMessage({
                  id: "patchApprovalRequest.menu.allowForSession",
                  defaultMessage: "Yes, and don't ask again this session",
                  description: "Approve a patch application for this session",
                }),
              },
            ],
    },
  ];

  const approvalRequestId = item.approvalRequestId;

  const logApprovalChoice = ({
    selectedOptionId,
    hasFeedback,
  }: {
    selectedOptionId: string | null;
    hasFeedback: boolean;
  }): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_approval_request_responded",
      metadata: {
        kind: getApprovalRequestKind({
          itemType: item.type,
          isNetworkApproval,
        }),
        agent_mode: agentMode,
        choice: getApprovalRequestChoice(selectedOptionId),
        has_feedback: hasFeedback,
      },
    });
  };

  const denyApproval = ({
    hasFeedback = false,
  }: {
    hasFeedback?: boolean;
  } = {}): void => {
    logApprovalChoice({ selectedOptionId: null, hasFeedback });
    if (item.type === "exec") {
      appServerManager.replyWithCommandExecutionApprovalDecision(
        conversationId,
        approvalRequestId,
        "decline",
      );
      return;
    } else if (item.type === "patch") {
      appServerManager.replyWithFileChangeApprovalDecision(
        conversationId,
        approvalRequestId,
        "decline",
      );
      return;
    }
  };

  const handleSkip = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_request_input_dismissed",
      metadata: {
        kind: "approval",
      },
    });
    denyApproval();
  };

  const handleSubmit = (answers: RequestInputPanelAnswers): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_request_input_submitted",
      metadata: {
        kind: "approval",
        question_count: 1,
      },
    });

    const selectedOptionId = answers[0]?.selectedOptionId ?? null;
    const rejectionFeedback = answers[0]?.freeformText?.trim();
    const hasFeedback =
      rejectionFeedback != null && rejectionFeedback.length > 0;
    if (selectedOptionId == null) {
      denyApproval({ hasFeedback });
      if (hasFeedback) {
        void onSubmitLocalFollowup(rejectionFeedback);
      }
      return;
    }

    logApprovalChoice({ selectedOptionId, hasFeedback });
    if (item.type === "exec") {
      const decision = buildExecApprovalDecision(
        selectedOptionId,
        validExecpolicyAmendment,
        allowNetworkPolicyAmendment,
      );
      appServerManager.replyWithCommandExecutionApprovalDecision(
        conversationId,
        approvalRequestId,
        decision,
      );
      return;
    } else if (item.type === "patch") {
      const decision = buildFileChangeApprovalDecision(selectedOptionId);
      appServerManager.replyWithFileChangeApprovalDecision(
        conversationId,
        approvalRequestId,
        decision,
      );
      return;
    }
  };

  return (
    <RequestInputPanel
      body={<ApprovalRequestBody item={item} />}
      questionAndOptions={questionAndOptions}
      onSubmit={handleSubmit}
      onSkip={handleSkip}
    />
  );
}

function getValidExecpolicyAmendment(
  proposedExecpolicyAmendment:
    | AppServer.v2.ExecPolicyAmendment
    | null
    | undefined,
): AppServer.v2.ExecPolicyAmendment | null {
  if (proposedExecpolicyAmendment == null) {
    return null;
  }

  const renderedPrefix = proposedExecpolicyAmendment.join(" ");
  if (renderedPrefix.includes("\n") || renderedPrefix.includes("\r")) {
    return null;
  }

  return proposedExecpolicyAmendment;
}

function ApprovalRequestBody({
  item,
}: {
  item: ExecLocalConversationItem | PatchApplyLocalConversationItem;
}): React.ReactElement {
  if (item.type === "patch") {
    return (
      <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto py-2 text-sm">
        <div className="flex flex-col gap-2 px-2">
          {Object.entries(item.changes).map(([path, change]) => (
            <FileChangeEntryContent
              key={path}
              path={path}
              change={change}
              status="pending"
              grantRoot={item.grantRoot}
            />
          ))}
        </div>
      </div>
    );
  }

  if (item.networkApprovalContext != null) {
    return (
      <ApprovalNetworkBody
        networkApprovalContext={item.networkApprovalContext}
      />
    );
  }

  return <ApprovalExecBody item={item} />;
}

function ApprovalNetworkBody({
  networkApprovalContext,
}: {
  networkApprovalContext: AppServer.v2.NetworkApprovalContext;
}): React.ReactElement {
  return (
    <div className="px-3 py-2 text-sm">
      <FormattedMessage
        id="execApprovalRequest.network.reason"
        defaultMessage="Reason: {host} isn't on the current network allowlist"
        description="Reason shown under a managed network approval prompt"
        values={{ host: networkApprovalContext.host }}
      />
    </div>
  );
}

function ApprovalExecBody({
  item,
}: {
  item: ExecLocalConversationItem;
}): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const commandText = item.cmd.join(" ");
  const shouldShowExpand = commandText.includes("\n");
  const clampStyle: CSSProperties | undefined = isExpanded
    ? undefined
    : {
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      };

  return (
    <div className="relative px-3">
      <div
        className={clsx(
          "bg-token-editor-background text-token-input-placeholder-foreground text-size-code  flex w-full flex-col gap-1.5 px-2 pt-2 font-mono font-medium rounded-md max-h-80 overflow-y-auto",
          shouldShowExpand || isExpanded ? "pb-9" : "pb-2",
        )}
      >
        <span
          className={clsx("block break-words whitespace-pre-wrap")}
          style={clampStyle}
        >
          {commandText}
        </span>
      </div>
      {shouldShowExpand || isExpanded ? (
        <div className="absolute right-4 bottom-1.5">
          <Button
            className="h-6 px-2 text-xs"
            color="ghost"
            onClick={() => {
              setIsExpanded((prev) => !prev);
            }}
          >
            {isExpanded ? (
              <FormattedMessage
                id="pendingRequest.approvalExec.collapse"
                defaultMessage="Collapse"
                description="Button label to collapse a long approval command preview"
              />
            ) : (
              <FormattedMessage
                id="pendingRequest.approvalExec.expand"
                defaultMessage="Expand"
                description="Button label to expand a long approval command preview"
              />
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function buildUserInputResponse(
  questions: UserInputLocalConversationItem["questions"],
  answers: RequestInputPanelAnswers,
): AppServer.v2.ToolRequestUserInputResponse {
  const response: Record<string, AppServer.v2.ToolRequestUserInputAnswer> = {};
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const answer = answers[index];
    const hasOptions = question.options.length > 0;
    const selectedOptionId = answer?.selectedOptionId ?? null;
    let resolvedValue = "";

    if (!hasOptions) {
      resolvedValue = answer?.freeformText?.trim() ?? "";
    } else if (selectedOptionId != null) {
      const selectedOption = question.options.find(
        (option) => option.label === selectedOptionId,
      );
      resolvedValue = selectedOption?.label?.trim() ?? "";
    }
    if (resolvedValue.length === 0 && question.isOther) {
      resolvedValue = answer?.freeformText?.trim() ?? "";
    }

    if (resolvedValue.length === 0) {
      continue;
    }

    response[question.id] = { answers: [resolvedValue] };
  }
  return { answers: response };
}

function buildExecApprovalDecision(
  selectedOptionId: string,
  validExecpolicyAmendment: AppServer.v2.ExecPolicyAmendment | null,
  allowNetworkPolicyAmendment: AppServer.v2.NetworkPolicyAmendment | null,
): AppServer.v2.CommandExecutionApprovalDecision {
  switch (selectedOptionId) {
    case "accept":
      return "accept";
    case "acceptForSession":
      return "acceptForSession";
    case "acceptWithExecpolicyAmendment":
      if (validExecpolicyAmendment == null) {
        return "acceptForSession";
      }

      return {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment:
            validExecpolicyAmendment as AppServer.v2.ExecPolicyAmendment,
        },
      };
    case "applyNetworkPolicyAmendment":
      if (allowNetworkPolicyAmendment == null) {
        return "acceptForSession";
      }

      return {
        applyNetworkPolicyAmendment: {
          network_policy_amendment: allowNetworkPolicyAmendment,
        },
      };
    case "decline":
      return "decline";
    default:
      throw new Error(`Unknown exec approval decision: ${selectedOptionId}`);
  }
}

function buildFileChangeApprovalDecision(
  selectedOptionId: string,
): AppServer.v2.FileChangeApprovalDecision {
  switch (selectedOptionId) {
    case "accept":
      return "accept";
    case "acceptForSession":
      return "acceptForSession";
    case "decline":
      return "decline";
    default:
      throw new Error(
        `Unknown file change approval decision: ${selectedOptionId}`,
      );
  }
}

function getApprovalRequestKind({
  itemType,
  isNetworkApproval,
}: {
  itemType:
    | ExecLocalConversationItem["type"]
    | PatchApplyLocalConversationItem["type"];
  isNetworkApproval: boolean;
}): "exec" | "file_change" | "network" {
  if (itemType === "patch") {
    return "file_change";
  }
  if (isNetworkApproval) {
    return "network";
  }
  return "exec";
}

function getApprovalRequestChoice(
  selectedOptionId: string | null,
):
  | "accept"
  | "accept_for_session"
  | "accept_with_execpolicy_amendment"
  | "apply_network_policy_amendment"
  | "decline" {
  switch (selectedOptionId) {
    case null:
      return "decline";
    case "accept":
      return "accept";
    case "acceptForSession":
      return "accept_for_session";
    case "acceptWithExecpolicyAmendment":
      return "accept_with_execpolicy_amendment";
    case "applyNetworkPolicyAmendment":
      return "apply_network_policy_amendment";
    default:
      throw new Error(`Unknown approval tracking choice: ${selectedOptionId}`);
  }
}
