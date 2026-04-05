import type { UseQueryResult } from "@tanstack/react-query";
import type {
  CodeTaskDetailsResponse,
  PRItemOutput,
  TaskAssistantTurn,
} from "protocol";
import { useMemo } from "react";

export function useUnifiedDiff(
  taskDetailsQuery: UseQueryResult<CodeTaskDetailsResponse, Error>,
  selectedTurn: TaskAssistantTurn | null,
): string | null {
  const taskDetails = taskDetailsQuery.data;
  const diffTaskTurn = taskDetails?.current_diff_task_turn;
  const pr = useMemo(
    () =>
      selectedTurn?.output_items?.find(
        (item): item is PRItemOutput => item.type === "pr",
      ) ??
      diffTaskTurn?.output_items?.find(
        (item): item is PRItemOutput => item.type === "pr",
      ),
    [selectedTurn, diffTaskTurn],
  );

  return pr?.output_diff?.diff ?? null;
}
