export type ParsedHeartbeatAssistantMessage = {
  decision: "NOTIFY" | "DONT_NOTIFY";
  visibleText: string;
  notificationMessage: string | null;
};

export function parseHeartbeatAssistantMessage(
  message: string,
): ParsedHeartbeatAssistantMessage | null {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const blockMatches = Array.from(
    trimmed.matchAll(/<heartbeat>[\s\S]*?<\/heartbeat>/gi),
  );
  const block = blockMatches.at(-1)?.[0];
  if (block == null) {
    return null;
  }

  const decisionMatch = block.match(
    /<decision>\s*(NOTIFY|DONT_NOTIFY)\s*<\/decision>/i,
  );
  if (decisionMatch == null) {
    return null;
  }

  const visibleText = trimmed
    .replace(/<heartbeat>[\s\S]*?<\/heartbeat>/gi, "")
    .trim();
  const messageMatch = block.match(/<message>\s*([\s\S]*?)\s*<\/message>/i);
  const notificationMessage = messageMatch?.[1]?.trim() ?? "";

  return {
    decision: decisionMatch[1].toUpperCase() as "NOTIFY" | "DONT_NOTIFY",
    visibleText,
    notificationMessage:
      notificationMessage.length > 0 ? notificationMessage : null,
  };
}
