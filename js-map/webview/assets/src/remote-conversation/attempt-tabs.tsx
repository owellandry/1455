import type { TaskAssistantTurn } from "protocol";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";

export function AttemptTabs({
  turns,
  selectedTurnId,
  onSelect,
  loading,
  expectedCount,
}: {
  turns: Array<TaskAssistantTurn>;
  selectedTurnId: string;
  onSelect: (turnId: string) => void;
  loading: boolean;
  expectedCount: number;
}): React.ReactElement {
  const displayItems = useMemo(() => {
    const items = Array.from({ length: Math.max(expectedCount, turns.length) });
    const sortedTurns = [...turns].sort((a, b) => {
      const aPlacement = a.attempt_placement ?? a.created_at;
      const bPlacement = b.attempt_placement ?? b.created_at;
      return aPlacement - bPlacement;
    });
    return items.map((_, index) => {
      const turn = sortedTurns[index];
      if (turn) {
        return { type: "turn" as const, turn, attemptNumber: index + 1 };
      }
      return { type: "placeholder" as const, attemptNumber: index + 1 };
    });
  }, [expectedCount, turns]);

  return (
    <div className="hide-scrollbar mb-2 flex flex-none shrink-0 gap-2 overflow-x-auto overflow-y-visible whitespace-nowrap">
      {displayItems.map((item) =>
        item.type === "turn" ? (
          <Button
            key={item.turn.id}
            color={item.turn.id === selectedTurnId ? "primary" : "outline"}
            loading={loading}
            onClick={() => onSelect(item.turn.id)}
            disabled={loading}
          >
            <FormattedMessage
              id="codex.remoteConversation.turnTab.title"
              defaultMessage="Attempt {number}"
              description="Tab title for a sibling turn"
              values={{ number: item.attemptNumber }}
            />
          </Button>
        ) : (
          <Button
            key={`placeholder-${item.attemptNumber}`}
            color="outline"
            loading={loading}
            disabled
          >
            <FormattedMessage
              id="codex.remoteConversation.turnTab.loading"
              defaultMessage="Attempt {number}"
              description="Placeholder tab title while sibling turns load"
              values={{ number: item.attemptNumber }}
            />
          </Button>
        ),
      )}
    </div>
  );
}
