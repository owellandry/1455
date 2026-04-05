import type { ZodSafeParseResult, ZodSchema } from "zod";

/**
 * Attempts to extract a JSON object from an assistant message. Handles cases
 * where the object is wrapped in code fences or surrounded by extra text.
 */
export function extractJsonObjectFromAssistantMessage(
  message: string,
): string | null {
  const trimmed = message.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*\r?\n?([\s\S]*?)```/i);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      return candidate;
    }
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace === -1) {
    return null;
  }

  let lastBrace = trimmed.lastIndexOf("}");
  while (lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1).trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // ignore and try the next candidate
      }
    }
    lastBrace = trimmed.lastIndexOf("}", lastBrace - 1);
  }

  return null;
}

/**
 * Extracts JSON from an assistant message and validates it against the given
 * schema. Returns null if no JSON object can be extracted or parsed.
 */
export function parseAssistantMessageJson<T>(
  message: string,
  schema: ZodSchema<T>,
): ZodSafeParseResult<T> | null {
  const candidate = extractJsonObjectFromAssistantMessage(message);
  if (!candidate) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    return schema.safeParse(parsed);
  } catch {
    return null;
  }
}
