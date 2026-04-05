import type * as AppServer from "app-server-types";
import { z } from "zod";

import type { GitCwd } from ".";

export type AutomationStatus = "ACTIVE" | "PAUSED" | "DELETED";
export type AutomationKind = "cron" | "heartbeat";
export type AutomationExecutionEnvironment = "worktree" | "local";

export type AutomationBase = {
  id: string;
  kind: AutomationKind;
  name: string;
  prompt: string;
  status: AutomationStatus;
  model: string | null;
  reasoningEffort: AppServer.ReasoningEffort | null;
  /** RFC5545 RRULE payload. */
  rrule: string;
  /** Next scheduled run timestamp (ms). */
  nextRunAt: number | null;
  lastRunAt: number | null;
  createdAt: number;
  updatedAt: number;
};

/** Serialized cron automation stored in local persistence. */
export type CronAutomation = AutomationBase & {
  kind: "cron";
  cwds: Array<GitCwd>;
  executionEnvironment: AutomationExecutionEnvironment;
};

/** Serialized heartbeat automation stored in local persistence. */
export type HeartbeatAutomation = AutomationBase & {
  kind: "heartbeat";
  targetThreadId: string;
};

/** Serialized automation stored in local persistence. */
export type Automation = CronAutomation | HeartbeatAutomation;

export type CronAutomationCreateInput = Pick<
  CronAutomation,
  | "kind"
  | "name"
  | "prompt"
  | "cwds"
  | "executionEnvironment"
  | "model"
  | "reasoningEffort"
  | "rrule"
>;

export type HeartbeatAutomationCreateInput = Pick<
  HeartbeatAutomation,
  | "kind"
  | "name"
  | "prompt"
  | "targetThreadId"
  | "model"
  | "reasoningEffort"
  | "rrule"
>;

export type AutomationCreateInput =
  | CronAutomationCreateInput
  | HeartbeatAutomationCreateInput;

export type CronAutomationUpdateInput = Pick<
  CronAutomation,
  | "id"
  | "kind"
  | "name"
  | "prompt"
  | "status"
  | "cwds"
  | "executionEnvironment"
  | "model"
  | "reasoningEffort"
  | "rrule"
>;

export type HeartbeatAutomationUpdateInput = Pick<
  HeartbeatAutomation,
  | "id"
  | "kind"
  | "name"
  | "prompt"
  | "status"
  | "targetThreadId"
  | "model"
  | "reasoningEffort"
  | "rrule"
>;

export type AutomationUpdateInput =
  | CronAutomationUpdateInput
  | HeartbeatAutomationUpdateInput;

const automationStatusSchema = z.enum(["ACTIVE", "PAUSED", "DELETED"]);
export const automationKindSchema = z.enum(["cron", "heartbeat"]);
const automationExecutionEnvironmentSchema = z.enum(["worktree", "local"]);
export const automationReasoningEffortSchema = z.enum([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

export const automationTomlSchema = z.object({
  version: z.number().optional(),
  id: z.string(),
  kind: automationKindSchema.optional(),
  name: z.string(),
  prompt: z.string(),
  status: automationStatusSchema,
  rrule: z.string().optional(),
  execution_environment: automationExecutionEnvironmentSchema.optional(),
  model: z.string().optional(),
  reasoning_effort: automationReasoningEffortSchema.optional(),
  cwds: z.array(z.string()).optional(),
  target_thread_id: z.string().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const DEFAULT_AUTOMATION_RRULE = "FREQ=HOURLY;INTERVAL=24;BYMINUTE=0";
export const DEFAULT_AUTOMATION_EXECUTION_ENVIRONMENT = "worktree";
export const DEFAULT_AUTOMATION_MODEL = "gpt-5.4";
export const DEFAULT_AUTOMATION_REASONING_EFFORT: AppServer.ReasoningEffort =
  "medium";
export const LEGACY_AUTOMATION_MODEL = "gpt-5.3-codex";
export const LEGACY_AUTOMATION_REASONING_EFFORT: AppServer.ReasoningEffort =
  "medium";

export function isCronAutomation(
  automation: Automation,
): automation is CronAutomation {
  return automation.kind === "cron";
}

export function isHeartbeatAutomation(
  automation: Automation,
): automation is HeartbeatAutomation {
  return automation.kind === "heartbeat";
}

export type AutomationModelSettings = {
  model: string;
  reasoningEffort: AppServer.ReasoningEffort | null;
};

export function resolveAutomationRrule(
  rrule: string | null | undefined,
): string {
  const trimmed = rrule?.trim();
  if (!trimmed) {
    return DEFAULT_AUTOMATION_RRULE;
  }
  return trimmed;
}

export function resolveAutomationExecutionEnvironment(
  executionEnvironment: string | null | undefined,
): AutomationExecutionEnvironment {
  if (executionEnvironment === "worktree" || executionEnvironment === "local") {
    return executionEnvironment;
  }
  return DEFAULT_AUTOMATION_EXECUTION_ENVIRONMENT;
}

export function resolveAutomationReasoningEffort(
  reasoningEffort: string | null | undefined,
): AppServer.ReasoningEffort | null {
  const result = automationReasoningEffortSchema.safeParse(reasoningEffort);
  if (result.success) {
    return result.data;
  }
  return null;
}

export function getAutomationModelDetails(
  models: Array<AppServer.v2.Model>,
  model: string | null,
): AppServer.v2.Model | null {
  if (model == null) {
    return null;
  }
  return models.find((item): boolean => item.model === model) ?? null;
}

export function getAutomationReasoningOptions(
  models: Array<AppServer.v2.Model>,
  model: string | null,
): Array<AppServer.v2.ReasoningEffortOption> {
  return (
    getAutomationModelDetails(models, model)?.supportedReasoningEfforts ?? []
  );
}

export function getAutomationReasoningEffort({
  model,
  reasoningEffort,
}: {
  model: AppServer.v2.Model | null;
  reasoningEffort: AppServer.ReasoningEffort | null;
}): AppServer.ReasoningEffort | null {
  const reasoningOptions = model?.supportedReasoningEfforts ?? [];
  if (
    reasoningEffort != null &&
    reasoningOptions.some(
      (option): boolean => option.reasoningEffort === reasoningEffort,
    )
  ) {
    return reasoningEffort;
  }
  return (
    model?.defaultReasoningEffort ??
    reasoningOptions[0]?.reasoningEffort ??
    null
  );
}

export function getAutomationFallbackModel(
  models: Array<AppServer.v2.Model>,
): AppServer.v2.Model | null {
  return (
    models.find((model): boolean => model.model === DEFAULT_AUTOMATION_MODEL) ??
    models.find((model): boolean => model.isDefault) ??
    models[0] ??
    null
  );
}

export function getAutomationModelSettings({
  automation,
  models,
}: {
  automation: Automation;
  models: Array<AppServer.v2.Model>;
}): AutomationModelSettings {
  const selectedModel = getAutomationModelDetails(models, automation.model);
  if (selectedModel != null) {
    return {
      model: selectedModel.model,
      reasoningEffort: getAutomationReasoningEffort({
        model: selectedModel,
        reasoningEffort: automation.reasoningEffort,
      }),
    };
  }

  if (automation.model == null) {
    const legacyModel = getAutomationModelDetails(
      models,
      LEGACY_AUTOMATION_MODEL,
    );
    if (legacyModel != null) {
      return {
        model: legacyModel.model,
        reasoningEffort: getAutomationReasoningEffort({
          model: legacyModel,
          reasoningEffort:
            automation.reasoningEffort ?? LEGACY_AUTOMATION_REASONING_EFFORT,
        }),
      };
    }
  }

  const fallbackModel = getAutomationFallbackModel(models);
  if (fallbackModel != null) {
    return {
      model: fallbackModel.model,
      reasoningEffort: getAutomationReasoningEffort({
        model: fallbackModel,
        reasoningEffort: null,
      }),
    };
  }

  return {
    model: automation.model ?? LEGACY_AUTOMATION_MODEL,
    reasoningEffort:
      automation.reasoningEffort ?? LEGACY_AUTOMATION_REASONING_EFFORT,
  };
}
