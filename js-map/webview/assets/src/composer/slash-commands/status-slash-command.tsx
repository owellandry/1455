import type { ConversationId, RateLimitStatusPayload } from "protocol";
import { useState } from "react";
import { useIntl } from "react-intl";

import SpeedometerIcon from "@/icons/speedometer.svg";
import { getUsageLimitRowsForRateLimitEntries } from "@/utils/rate-limit-rows";
import {
  filterRateLimitEntries,
  getActiveRateLimitAlertData,
  getRateLimitEntries,
  getRateLimitName,
} from "@/utils/use-rate-limit";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";

import { getContextUsageStats } from "../context-usage-stats";
import { useCollaborationMode } from "../use-collaboration-mode";
import { useProvideSlashCommand } from "./slash-command";
import { StatusMenu } from "./status-menu";

export function StatusSlashCommand({
  conversationId,
  threadId,
  rateLimit,
  onOpenChange,
}: {
  conversationId: ConversationId | null;
  threadId: string | null;
  rateLimit: RateLimitStatusPayload | null;
  onOpenChange?: (isOpen: boolean) => void;
}): React.ReactElement | null {
  const intl = useIntl();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { activeMode: activeCollaborationMode } =
    useCollaborationMode(conversationId);
  const selectedModel = activeCollaborationMode?.settings.model ?? null;

  const tokenUsageInfo = useTokenUsageInfo(conversationId);
  const contextUsage = getContextUsageStats(tokenUsageInfo);
  const rateLimitEntries = getRateLimitEntries(rateLimit);
  const rateLimitName = getRateLimitName(rateLimit);
  const filteredRateLimitEntries = filterRateLimitEntries(rateLimitEntries, {
    activeLimitName: rateLimitName,
    selectedModel,
  });
  const rateLimitRows = getUsageLimitRowsForRateLimitEntries(
    filteredRateLimitEntries,
  );
  const alertData = getActiveRateLimitAlertData(filteredRateLimitEntries, {
    activeLimitName: rateLimitName,
    selectedModel,
  });

  useProvideSlashCommand({
    id: "status",
    title: intl.formatMessage({
      id: "composer.statusSlashCommand.title",
      defaultMessage: "Status",
      description: "Title for the status slash command",
    }),
    description: intl.formatMessage({
      id: "composer.statusSlashCommand.description",
      defaultMessage: "Show thread id, context usage, and rate limits",
      description: "Description for the status slash command",
    }),
    requiresEmptyComposer: false,
    Icon: SpeedometerIcon,
    onSelect: async () => {
      setIsMenuOpen(true);
      onOpenChange?.(true);
    },
    dependencies: [conversationId, rateLimit, threadId],
  });

  if (!isMenuOpen) {
    return null;
  }

  return (
    <StatusMenu
      threadId={threadId}
      contextUsage={contextUsage}
      rateLimitRows={rateLimitRows}
      alertData={alertData}
      onClose={() => {
        setIsMenuOpen(false);
        onOpenChange?.(false);
      }}
    />
  );
}
