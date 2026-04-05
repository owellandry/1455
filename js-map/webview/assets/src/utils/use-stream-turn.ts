import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";

import { WebFetchWrapper } from "../web-fetch-wrapper";
import { useDebouncedValue } from "./use-debounced-value";

function isTurnComplete(status: string | null | undefined): boolean {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
}

export function useStreamLastTurnEvent(
  taskId: string,
  turnStatus: string | null | undefined,
  assistantTurnId: string | null | undefined,
): string {
  const intl = useIntl();
  const initialText = useMemo(() => {
    return assistantTurnId
      ? intl.formatMessage({
          id: "wham.streamTurnStatus.workingOnYourTask",
          defaultMessage: "Working on your task",
          description:
            "Initial text shown in the sidebar when the assistant is working on a task",
        })
      : "";
  }, [assistantTurnId, intl]);

  const [latestEvent, setLatestEvent] = useState(initialText);
  const debouncedEvent = useDebouncedValue(latestEvent, 200);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!assistantTurnId || isTurnComplete(turnStatus)) {
      return;
    }

    const params = new URLSearchParams();
    params.append("item_type", "task_turn_event");
    const url = `/wham/tasks/${taskId}/turns/${assistantTurnId}/stream?${params.toString()}`;

    const requestId = WebFetchWrapper.getInstance().stream("GET", url, {
      onEvent: (evt) => {
        const data = evt.data as {
          item_type?: string;
          task_turn_event?: { text: string };
        };
        if (data?.item_type === "task_turn_event") {
          setLatestEvent(data.task_turn_event?.text ?? "");
        }
      },
      onComplete: () => {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        void queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      },
    });

    return (): void => {
      WebFetchWrapper.getInstance().cancelStream(requestId);
    };
  }, [taskId, assistantTurnId, turnStatus, queryClient]);

  return debouncedEvent;
}
