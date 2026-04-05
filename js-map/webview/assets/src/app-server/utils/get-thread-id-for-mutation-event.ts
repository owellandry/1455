function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getStringField(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const candidate = value[key];
  if (typeof candidate !== "string" || candidate.length === 0) {
    return null;
  }
  return candidate;
}

export function getThreadIdForMutationEvent(params: {
  [key: string]: unknown;
}): string | null {
  if (typeof params.threadId === "string" && params.threadId.length > 0) {
    return params.threadId;
  }

  const thread = asRecord(params.thread);
  if (thread != null) {
    const threadId = getStringField(thread, "id");
    if (threadId != null) {
      return threadId;
    }
  }

  return null;
}
