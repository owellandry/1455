import { useScope } from "maitai";
import type {
  CodeTaskTurnResponse,
  ExternalPullRequest,
  PRItemOutput,
  TaskAssistantTurn,
} from "protocol";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import GitHubMarkIcon from "@/icons/github-mark.svg";
import { messageBus } from "@/message-bus";
import {
  PullRequestLabel,
  PullRequestStatusIcon,
} from "@/pull-requests/pull-request-status";
import {
  getPullRequestNumberFromUrl,
  getPullRequestStatusFromOutput,
} from "@/pull-requests/pull-request-status-utils";
import { AppScope } from "@/scopes/app-scope";

import { useCreateTaskPrMutation, useTaskTurn } from "../codex-api";
import { isTaskUserTurn, type RemoteConversationTurn } from "./turn-tree";

const PR_POLL_INTERVAL_MS = 2000;

export function RemotePrButton({
  taskId,
  turns,
  selectedTurn,
  diffTaskTurn,
  pullRequests,
  size = "toolbar",
}: {
  taskId: string | null;
  turns: Array<RemoteConversationTurn>;
  selectedTurn: TaskAssistantTurn | null;
  diffTaskTurn: TaskAssistantTurn | null;
  pullRequests: Array<ExternalPullRequest>;
  size?: "default" | "large" | "composer" | "composerSm" | "toolbar";
}): React.ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const createTaskPrMutation = useCreateTaskPrMutation();
  const openWhenReadyRef = useRef(false);
  const failureNotifiedTurnIdRef = useRef<string | null>(null);
  const [requestedTurnId, setRequestedTurnId] = useState<string | null>(null);

  const turnById = useMemo(() => {
    const map = new Map<string, RemoteConversationTurn>();
    for (const turn of turns) {
      map.set(turn.id, turn);
    }
    if (selectedTurn) {
      map.set(selectedTurn.id, selectedTurn);
    }
    if (diffTaskTurn) {
      map.set(diffTaskTurn.id, diffTaskTurn);
    }
    return map;
  }, [diffTaskTurn, selectedTurn, turns]);

  const resolution = useMemo(
    () =>
      resolveActionTurnAndPrItem({
        turnById,
        selectedTurn,
        diffTaskTurn,
      }),
    [diffTaskTurn, selectedTurn, turnById],
  );

  const actionTurn = resolution?.actionTurn ?? null;
  const prItem = resolution?.prItem ?? null;
  const unifiedDiff = prItem?.output_diff?.diff ?? null;
  const actionTurnId = actionTurn?.id ?? null;
  const pullRequestStatus = actionTurn?.pull_request_status ?? null;
  const isCreatePrRequestedForTurn =
    !!requestedTurnId && requestedTurnId === actionTurnId;
  const shouldPollTurn =
    !!taskId &&
    !!actionTurnId &&
    (createTaskPrMutation.isPending ||
      pullRequestStatus === "creating" ||
      isCreatePrRequestedForTurn);
  const refetchInterval = shouldPollTurn
    ? (query: { state: { data?: CodeTaskTurnResponse } }): number | false => {
        const turn = query.state.data?.turn;
        if (
          isPrTerminalStatus(
            turn?.pull_request_status ?? null,
            turn?.pull_request_data?.url ?? null,
          )
        ) {
          return false;
        }
        return PR_POLL_INTERVAL_MS;
      }
    : false;

  const { data: actionTurnData } = useTaskTurn(taskId, actionTurnId, {
    enabled: shouldPollTurn,
    refetchInterval,
  });

  const effectiveTurn = actionTurnData?.turn ?? actionTurn;
  const effectiveStatus = effectiveTurn?.pull_request_status ?? null;
  const prUrl = effectiveTurn?.pull_request_data?.url ?? null;
  const matchingPullRequest =
    resolvePullRequestForTurn(pullRequests, effectiveTurn?.id ?? null, prUrl) ??
    resolvePullRequestForTurn(pullRequests, actionTurnId, prUrl);
  const isTurnComplete = effectiveTurn?.turn_status === "completed";
  const isTerminalPrState = isPrTerminalStatus(effectiveStatus, prUrl);
  const isCreating =
    createTaskPrMutation.isPending ||
    effectiveStatus === "creating" ||
    (isCreatePrRequestedForTurn && !isTerminalPrState);

  useEffect(() => {
    // The create PR API does not return a URL immediately. We mark that we want
    // to open the PR, then wait for polling to surface the URL.
    if (!openWhenReadyRef.current) {
      return;
    }
    if (!prUrl) {
      return;
    }
    messageBus.dispatchMessage("open-in-browser", {
      url: prUrl,
    });
    openWhenReadyRef.current = false;
  }, [prUrl]);

  useEffect(() => {
    if (!actionTurnId || effectiveStatus !== "failed") {
      return;
    }
    if (failureNotifiedTurnIdRef.current === actionTurnId) {
      return;
    }
    failureNotifiedTurnIdRef.current = actionTurnId;
    openWhenReadyRef.current = false;
    scope.get(toast$).danger(
      intl.formatMessage({
        id: "localConversationPage.createPullRequestError",
        defaultMessage: "Failed to create pull request",
        description: "Error message when creating a pull request fails",
      }),
    );
  }, [actionTurnId, scope, effectiveStatus, intl]);

  function openPr(): void {
    if (!prUrl) {
      return;
    }
    messageBus.dispatchMessage("open-in-browser", {
      url: prUrl,
    });
  }

  async function createPr(): Promise<void> {
    if (!taskId || !actionTurnId || !isTurnComplete || isCreating) {
      return;
    }
    openWhenReadyRef.current = false;
    failureNotifiedTurnIdRef.current = null;
    setRequestedTurnId(actionTurnId);
    try {
      await createTaskPrMutation.mutateAsync({
        taskId,
        turnId: actionTurnId,
      });
      openWhenReadyRef.current = true;
    } catch {
      openWhenReadyRef.current = false;
      setRequestedTurnId(null);
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "localConversationPage.createPullRequestError",
          defaultMessage: "Failed to create pull request",
          description: "Error message when creating a pull request fails",
        }),
      );
    }
  }

  if (!taskId || !actionTurnId || !unifiedDiff) {
    return null;
  }

  if (prUrl) {
    const pullRequestNumber =
      matchingPullRequest?.number ?? getPullRequestNumberFromUrl(prUrl);
    const pullRequestStatus = matchingPullRequest
      ? getPullRequestStatusFromOutput(matchingPullRequest)
      : "open";

    return (
      <Button className="shrink-0" color="outline" size={size} onClick={openPr}>
        <PullRequestStatusIcon
          className="icon-xs shrink-0"
          status={pullRequestStatus}
        />
        <PullRequestLabel number={pullRequestNumber} />
      </Button>
    );
  }

  return (
    <Button
      className="shrink-0"
      color="outline"
      disabled={!isTurnComplete || isCreating}
      size={size}
      onClick={() => {
        void createPr();
      }}
    >
      {isCreating ? (
        <Spinner className="icon-xs" />
      ) : (
        <GitHubMarkIcon className="icon-xs" />
      )}
      {isCreating ? (
        <FormattedMessage
          id="review.commit.loading.title.createPr"
          defaultMessage="Creating a PR"
          description="Title shown while creating a pull request"
        />
      ) : (
        <FormattedMessage
          id="localConversationPage.createPullRequestButtonLabel"
          defaultMessage="Create PR"
          description="Label for create pull request action"
        />
      )}
    </Button>
  );
}

function getPrItem(turn: TaskAssistantTurn | null): PRItemOutput | null {
  if (!turn) {
    return null;
  }
  return (
    turn.output_items?.find(
      (item): item is PRItemOutput => item.type === "pr",
    ) ?? null
  );
}

function resolveActionTurnAndPrItem({
  turnById,
  selectedTurn,
  diffTaskTurn,
}: {
  turnById: Map<string, RemoteConversationTurn>;
  selectedTurn: TaskAssistantTurn | null;
  diffTaskTurn: TaskAssistantTurn | null;
}): { actionTurn: TaskAssistantTurn; prItem: PRItemOutput } | null {
  const assistantTurns = Array.from(turnById.values()).filter(
    (turn): turn is TaskAssistantTurn => !isTaskUserTurn(turn),
  );

  let actionTurn: TaskAssistantTurn | null = null;
  let prItem: PRItemOutput | null = null;

  const latestAttemptWithPrItem = selectedTurn
    ? getLatestAttemptAssistantTurnWithPrItem(
        assistantTurns,
        turnById,
        selectedTurn,
      )
    : null;
  if (latestAttemptWithPrItem) {
    actionTurn = latestAttemptWithPrItem.actionTurn;
    prItem = latestAttemptWithPrItem.prItem;
  }

  const diffTurnInSelectedAttempt =
    !!selectedTurn &&
    !!diffTaskTurn &&
    isSameOrDescendant(turnById, selectedTurn.id, diffTaskTurn.id);
  const diffTurnPrItem = diffTurnInSelectedAttempt
    ? getPrItem(diffTaskTurn)
    : null;
  if (
    diffTaskTurn &&
    diffTurnPrItem &&
    (!actionTurn || diffTaskTurn.created_at > actionTurn.created_at)
  ) {
    actionTurn = diffTaskTurn;
    prItem = diffTurnPrItem;
  }

  const selectedPrItem = getPrItem(selectedTurn);
  if (!actionTurn && selectedTurn && selectedPrItem) {
    actionTurn = selectedTurn;
    prItem = selectedPrItem;
  }

  const diffPrItem = getPrItem(diffTaskTurn);
  if (!actionTurn && diffTaskTurn && diffPrItem) {
    actionTurn = diffTaskTurn;
    prItem = diffPrItem;
  }

  if (!actionTurn || !prItem) {
    return null;
  }

  return { actionTurn, prItem };
}

function getLatestAttemptAssistantTurnWithPrItem(
  assistantTurns: Array<TaskAssistantTurn>,
  turnById: Map<string, RemoteConversationTurn>,
  selectedTurn: TaskAssistantTurn,
): { actionTurn: TaskAssistantTurn; prItem: PRItemOutput } | null {
  let latest: { actionTurn: TaskAssistantTurn; prItem: PRItemOutput } | null =
    null;
  for (const assistantTurn of assistantTurns) {
    if (!isSameOrDescendant(turnById, selectedTurn.id, assistantTurn.id)) {
      continue;
    }
    const prItem = getPrItem(assistantTurn);
    if (!prItem?.output_diff?.diff) {
      continue;
    }
    if (!latest || assistantTurn.created_at > latest.actionTurn.created_at) {
      latest = { actionTurn: assistantTurn, prItem };
    }
  }
  return latest;
}

function isPrTerminalStatus(
  status: TaskAssistantTurn["pull_request_status"] | null,
  prUrl: string | null,
): boolean {
  if (prUrl) {
    return true;
  }
  return (
    status === "created" ||
    status === "failed" ||
    status === "updated" ||
    status === "externally_created"
  );
}

function resolvePullRequestForTurn(
  pullRequests: Array<ExternalPullRequest>,
  turnId: string | null,
  prUrl: string | null,
): ExternalPullRequest["pull_request"] | null {
  if (turnId != null) {
    const matchingTurnPullRequest = pullRequests.find(
      (pullRequest) => pullRequest.assistant_turn_id === turnId,
    );
    if (matchingTurnPullRequest) {
      return matchingTurnPullRequest.pull_request;
    }
  }

  if (prUrl != null) {
    const matchingUrlPullRequest = pullRequests.find(
      (pullRequest) => pullRequest.pull_request.url === prUrl,
    );
    if (matchingUrlPullRequest) {
      return matchingUrlPullRequest.pull_request;
    }
  }

  return null;
}

function isSameOrDescendant(
  turnById: Map<string, RemoteConversationTurn>,
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) {
    return true;
  }
  let currentTurn = turnById.get(candidateId);
  const visited = new Set<string>();
  while (currentTurn?.previous_turn_id && !visited.has(currentTurn.id)) {
    visited.add(currentTurn.id);
    if (currentTurn.previous_turn_id === ancestorId) {
      return true;
    }
    currentTurn = turnById.get(currentTurn.previous_turn_id);
  }
  return false;
}
