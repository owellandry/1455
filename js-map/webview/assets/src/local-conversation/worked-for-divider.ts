import { formatWorkedDuration } from "./format-worked-duration";

export function getWorkedForTimeLabel({
  hasAssistant,
  hasAboveAssistantWork,
  turnStartedAtMs,
  finalAssistantStartedAtMs,
}: {
  hasAssistant: boolean;
  hasAboveAssistantWork: boolean;
  turnStartedAtMs: number | null;
  finalAssistantStartedAtMs: number | null;
}): string | null {
  if (!hasAssistant || !hasAboveAssistantWork) {
    return null;
  }
  if (turnStartedAtMs == null || finalAssistantStartedAtMs == null) {
    return null;
  }

  const durationMs = finalAssistantStartedAtMs - turnStartedAtMs;
  return formatWorkedDuration(durationMs);
}
