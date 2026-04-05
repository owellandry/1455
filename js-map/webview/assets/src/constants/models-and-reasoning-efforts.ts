import type { ReasoningEffortKey } from "@/types/models";

// CAUTIOUS: DEFUALT_MODEL should always be the model available to all auth methods. Only bump this
// when we have GA the model to all access!
// This is the ultimate fallback if we do not get a default model from model/list and
// the default model from dynamic config is not available.
export const DEFAULT_MODEL = "gpt-5.3-codex";
export const DEFAULT_EFFORT: ReasoningEffortKey = "medium";

export const ALL_REASONING_EFFORTS: ReadonlyArray<ReasoningEffortKey> = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;
