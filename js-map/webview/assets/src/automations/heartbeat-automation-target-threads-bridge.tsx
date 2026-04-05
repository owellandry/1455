import {
  createConversationId,
  isHeartbeatAutomation,
  type Automation,
} from "protocol";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { maybeResumeConversation } from "@/app-server/requests/maybe-resume-conversation";
import { messageBus } from "@/message-bus";
import { useGate } from "@/statsig/statsig";
import { logger } from "@/utils/logger";
import { useFetchFromVSCode } from "@/vscode-api";

import { getHeartbeatAutomationEligibility } from "./heartbeat-automation-eligibility";

function buildHeartbeatTargetThreadIds(
  automations: Array<Automation> | undefined,
): Array<string> {
  if (automations == null) {
    return [];
  }

  return Array.from(
    new Set(
      automations.flatMap((automation) => {
        if (
          !isHeartbeatAutomation(automation) ||
          automation.status !== "ACTIVE" ||
          automation.targetThreadId.trim().length === 0
        ) {
          return [];
        }
        return [automation.targetThreadId];
      }),
    ),
  );
}

export function HeartbeatAutomationTargetThreadsBridge(): null {
  const heartbeatAutomationsEnabled = useGate(
    __statsigName("codex-app-automation-heartbeat"),
  );
  const appServerManager = useDefaultAppServerManager();
  const { data: automationsData } = useFetchFromVSCode("list-automations", {
    queryConfig: {
      enabled: heartbeatAutomationsEnabled,
    },
  });
  const { data: workspaceRootsResponse } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const [resumeRetryNonce, setResumeRetryNonce] = useState(0);
  const resumeInFlightThreadIdsRef = useRef(new Set<string>());
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentEligibilityByThreadIdRef = useRef(new Map<string, string>());

  const heartbeatTargetThreadIds = useMemo(
    () => buildHeartbeatTargetThreadIds(automationsData?.items),
    [automationsData?.items],
  );
  const heartbeatTargetThreadIdsKey = heartbeatTargetThreadIds.join(",");

  useEffect(() => {
    return (): void => {
      if (retryTimeoutRef.current != null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const conversationsSnapshotKey = useSyncExternalStore(
    (onStoreChange): (() => void) => {
      const unsubscribeConversation =
        appServerManager.addAnyConversationCallback(onStoreChange);
      const unsubscribeConversationMeta =
        appServerManager.addAnyConversationMetaCallback(onStoreChange);
      return (): void => {
        unsubscribeConversation();
        unsubscribeConversationMeta();
      };
    },
    () =>
      heartbeatTargetThreadIds
        .map((threadId) => {
          const conversationId = createConversationId(threadId);
          const conversation = appServerManager.getConversation(conversationId);
          const role =
            appServerManager.getStreamRole(conversationId)?.role ?? "none";
          return [
            threadId,
            conversation?.resumeState ?? "missing",
            conversation?.updatedAt ?? "none",
            conversation?.turns.length ?? 0,
            conversation?.turns.at(-1)?.status ?? "none",
            role,
          ].join(":");
        })
        .join("|"),
  );

  useEffect(() => {
    if (!heartbeatAutomationsEnabled || heartbeatTargetThreadIds.length === 0) {
      return;
    }

    void appServerManager
      .hydratePinnedThreads(heartbeatTargetThreadIds)
      .catch((error) => {
        logger.warning("heartbeat_automation_hydrate_threads_failed", {
          safe: {
            threadCount: heartbeatTargetThreadIds.length,
          },
          sensitive: { error },
        });
      });
  }, [
    appServerManager,
    heartbeatAutomationsEnabled,
    heartbeatTargetThreadIds,
    heartbeatTargetThreadIdsKey,
  ]);

  useEffect(() => {
    if (!heartbeatAutomationsEnabled || heartbeatTargetThreadIds.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled(
      heartbeatTargetThreadIds.map(async (threadId) => {
        if (resumeInFlightThreadIdsRef.current.has(threadId)) {
          return;
        }

        const conversationId = createConversationId(threadId);
        if (!appServerManager.needsResume(conversationId)) {
          return;
        }

        const conversation = appServerManager.getConversation(conversationId);
        const workspaceRoots =
          workspaceRootsResponse?.roots != null &&
          workspaceRootsResponse.roots.length > 0
            ? workspaceRootsResponse.roots
            : [conversation?.cwd ?? "/"];

        resumeInFlightThreadIdsRef.current.add(threadId);
        try {
          await maybeResumeConversation(appServerManager, {
            conversationId,
            model: null,
            reasoningEffort: null,
            workspaceRoots,
            collaborationMode: conversation?.latestCollaborationMode ?? null,
          });
        } catch (error) {
          logger.warning("heartbeat_automation_resume_failed", {
            safe: { threadId },
            sensitive: { error },
          });
          if (!cancelled && retryTimeoutRef.current == null) {
            retryTimeoutRef.current = setTimeout(() => {
              retryTimeoutRef.current = null;
              setResumeRetryNonce((value) => value + 1);
            }, 750);
          }
        } finally {
          resumeInFlightThreadIdsRef.current.delete(threadId);
        }
      }),
    );

    return (): void => {
      cancelled = true;
    };
  }, [
    appServerManager,
    conversationsSnapshotKey,
    heartbeatAutomationsEnabled,
    heartbeatTargetThreadIds,
    heartbeatTargetThreadIdsKey,
    resumeRetryNonce,
    workspaceRootsResponse?.roots,
  ]);

  useEffect(() => {
    if (!heartbeatAutomationsEnabled) {
      return;
    }

    const nextSentEligibilityByThreadId = new Map<string, string>();
    for (const threadId of heartbeatTargetThreadIds) {
      const conversationId = createConversationId(threadId);
      const conversation = appServerManager.getConversation(conversationId);
      const eligibility = getHeartbeatAutomationEligibility(conversation);
      const rendererState = {
        isEligible: eligibility.isEligible,
        reason: eligibility.reason,
        collaborationMode: conversation?.latestCollaborationMode ?? null,
      };
      const serializedRendererState = JSON.stringify(rendererState);
      nextSentEligibilityByThreadId.set(threadId, serializedRendererState);
      if (
        lastSentEligibilityByThreadIdRef.current.get(threadId) ===
        serializedRendererState
      ) {
        continue;
      }
      messageBus.dispatchMessage("heartbeat-automation-thread-state-changed", {
        threadId,
        ...rendererState,
      });
    }
    lastSentEligibilityByThreadIdRef.current = nextSentEligibilityByThreadId;
  }, [
    appServerManager,
    conversationsSnapshotKey,
    heartbeatAutomationsEnabled,
    heartbeatTargetThreadIds,
    heartbeatTargetThreadIdsKey,
  ]);

  return null;
}
