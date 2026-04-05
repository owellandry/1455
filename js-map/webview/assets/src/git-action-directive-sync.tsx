import { useQueryClient } from "@tanstack/react-query";
import type { ConversationId } from "protocol";
import type React from "react";
import { useEffect, useEffectEvent } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import {
  applyGitActionDirectives,
  parseGitActionDirectivesFromMessages,
} from "@/git-action-directives";
import { useHasGitRpc } from "@/git-rpc/use-git-stable-metadata";
import { useHostConfig } from "@/shared-objects/use-host-config";

type TurnCompletedEvent = {
  conversationId: ConversationId;
  turnId: string | null;
  lastAgentMessage: string | null;
};

export function GitActionDirectiveSync(): React.ReactElement | null {
  const manager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(manager.getHostId());
  const hasGitRpc = useHasGitRpc();
  const queryClient = useQueryClient();

  const handleTurnCompleted = useEffectEvent(
    (event: TurnCompletedEvent): void => {
      const conversation = manager.getConversation(event.conversationId);
      const turn =
        conversation?.turns.find((candidate) => {
          return candidate.turnId === event.turnId;
        }) ?? null;
      if (turn == null) {
        return;
      }

      const directives = parseGitActionDirectivesFromMessages(
        turn.items.flatMap((item) => {
          if (item.type !== "agentMessage" || item.text.trim().length === 0) {
            return [];
          }
          return [item.text];
        }),
      );
      if (directives.length === 0) {
        return;
      }

      void applyGitActionDirectives({
        conversationId: event.conversationId,
        directives,
        hasGitRpc,
        hostConfig,
        manager,
        queryClient,
      });
    },
  );

  useEffect((): (() => void) => {
    return manager.addTurnCompletedListener(handleTurnCompleted);
  }, [manager]);

  return null;
}
