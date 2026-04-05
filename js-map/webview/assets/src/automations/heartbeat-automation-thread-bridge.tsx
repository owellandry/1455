import type { ConversationId } from "protocol";
import { useEffect } from "react";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { messageBus } from "@/message-bus";
import { useGate } from "@/statsig/statsig";

import { getHeartbeatAutomationEligibility } from "./heartbeat-automation-eligibility";

export function HeartbeatAutomationThreadBridge({
  conversationId,
}: {
  conversationId: ConversationId;
}): null {
  const heartbeatAutomationsEnabled = useGate(
    __statsigName("codex-app-automation-heartbeat"),
  );
  const conversation = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation,
  );
  const eligibility = getHeartbeatAutomationEligibility(conversation);

  useEffect(() => {
    messageBus.dispatchMessage("heartbeat-automation-thread-state-changed", {
      threadId: heartbeatAutomationsEnabled ? conversationId : null,
      isEligible: heartbeatAutomationsEnabled && eligibility.isEligible,
      collaborationMode: heartbeatAutomationsEnabled
        ? (conversation?.latestCollaborationMode ?? null)
        : null,
      reason: heartbeatAutomationsEnabled ? eligibility.reason : null,
    });
  }, [
    conversationId,
    conversation?.latestCollaborationMode,
    eligibility.isEligible,
    eligibility.reason,
    heartbeatAutomationsEnabled,
  ]);

  return null;
}
