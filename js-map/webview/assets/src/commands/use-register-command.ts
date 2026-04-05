import type { CodexCommandId } from "protocol";
import { useEffect, useEffectEvent } from "react";

import { registerCommand } from "./run-command";

export function useRegisterCommand(
  id: CodexCommandId,
  handler: () => void,
): void {
  const handlerEvent = useEffectEvent(handler);

  useEffect(() => {
    return registerCommand(id, handlerEvent);
  }, [id]);
}
