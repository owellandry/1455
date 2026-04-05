import { atom } from "jotai";
import {
  createGitCwd,
  getAutomationModelSettings,
  isHeartbeatAutomation,
  resolveAutomationExecutionEnvironment,
  type Automation,
  type AutomationExecutionEnvironment,
  type AutomationKind,
  type AutomationStatus,
  type GitCwd,
} from "protocol";

import {
  buildScheduleRruleString,
  createDefaultHeartbeatScheduleConfig,
  createDefaultScheduleConfig,
  isScheduleConfigValid,
  parseHeartbeatScheduleConfig,
  parseScheduleConfig,
  type ScheduleConfig,
} from "@/automations/automation-schedule";
import type { ModelSettings, ModelsByType } from "@/types/models";

export type AutomationDraft = {
  kind: AutomationKind;
  name: Automation["name"];
  prompt: Automation["prompt"];
  status: Automation["status"];
  cwds: Array<GitCwd>;
  model: Automation["model"];
  reasoningEffort: Automation["reasoningEffort"];
  executionEnvironment: AutomationExecutionEnvironment | null;
  targetThreadId: string | null;
  id: string | null;
  rawRrule: string | null;
  scheduleConfig: ScheduleConfig;
  scheduleDirty: boolean;
};

export type AutomationTemplateSelection = {
  name: string;
  prompt: string;
  scheduleConfig: ScheduleConfig;
};

export type AutomationDraftSaveRequirement =
  | "name"
  | "prompt"
  | "cwd"
  | "thread"
  | "executionEnvironment"
  | "model"
  | "schedule";

export const EMPTY_AUTOMATION_DRAFT: AutomationDraft = {
  id: null,
  kind: "cron",
  name: "",
  prompt: "",
  status: "ACTIVE",
  cwds: [],
  executionEnvironment: "worktree",
  targetThreadId: null,
  model: null,
  reasoningEffort: null,
  rawRrule: null,
  scheduleConfig: createDefaultScheduleConfig(),
  scheduleDirty: false,
};

export function getAutomationDraftSaveState(draft: AutomationDraft): {
  trimmedName: string;
  trimmedPrompt: string;
  missingRequirements: Array<AutomationDraftSaveRequirement>;
  canSave: boolean;
} {
  const trimmedName = draft.name.trim();
  const trimmedPrompt = draft.prompt.trim();
  const missingRequirements: Array<AutomationDraftSaveRequirement> = [];

  if (trimmedName.length === 0) {
    missingRequirements.push("name");
  }
  if (trimmedPrompt.length === 0) {
    missingRequirements.push("prompt");
  }
  if (draft.kind === "heartbeat") {
    if (draft.targetThreadId == null) {
      missingRequirements.push("thread");
    }
  } else {
    if (draft.cwds.length === 0) {
      missingRequirements.push("cwd");
    }
    if (draft.executionEnvironment == null) {
      missingRequirements.push("executionEnvironment");
    }
    if (draft.model == null) {
      missingRequirements.push("model");
    }
  }
  if (!isScheduleConfigValid(draft.scheduleConfig)) {
    missingRequirements.push("schedule");
  }

  return {
    trimmedName,
    trimmedPrompt,
    missingRequirements,
    canSave: missingRequirements.length === 0,
  };
}

export function resolveAutomationDraftRrule(draft: AutomationDraft): string {
  if (!draft.scheduleDirty && draft.rawRrule) {
    return draft.rawRrule;
  }
  return buildScheduleRruleString(draft.scheduleConfig);
}

export function applyAutomationTemplateToDraft(
  draft: AutomationDraft,
  template: AutomationTemplateSelection,
): AutomationDraft {
  return {
    ...draft,
    name: template.name,
    prompt: template.prompt,
    kind: "cron",
    rawRrule: null,
    scheduleConfig: template.scheduleConfig,
    scheduleDirty: true,
  };
}

export type AutomationDirectiveSeed = {
  directiveKey: string;
  mode: "view" | "suggested-update" | "suggested-create" | null;
  id: string | null;
  name: string;
  prompt: string;
  rrule: string;
  cwds: Array<string>;
  status: AutomationStatus | null;
};

export type AutomationDirectiveResult = {
  directiveKey: string;
  automationId: string;
};

export const automationDirectiveSeedAtom = atom<AutomationDirectiveSeed | null>(
  null,
);
export const automationDirectiveResultAtom =
  atom<AutomationDirectiveResult | null>(null);
export const automationDirectiveDialogOpenAtom = atom(false);

export function buildAutomationDraft(
  item: Automation,
  modelsByType?: ModelsByType,
): AutomationDraft {
  const modelSettings = getAutomationModelSettings({
    automation: item,
    models: modelsByType?.models ?? [],
  });
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    prompt: item.prompt,
    status: item.status,
    cwds: isHeartbeatAutomation(item) ? [] : item.cwds,
    executionEnvironment: isHeartbeatAutomation(item)
      ? null
      : resolveAutomationExecutionEnvironment(item.executionEnvironment),
    targetThreadId: isHeartbeatAutomation(item) ? item.targetThreadId : null,
    model: isHeartbeatAutomation(item) ? null : modelSettings.model,
    reasoningEffort: isHeartbeatAutomation(item)
      ? null
      : modelSettings.reasoningEffort,
    rawRrule: item.rrule,
    scheduleConfig: isHeartbeatAutomation(item)
      ? parseHeartbeatScheduleConfig(item.rrule)
      : parseScheduleConfig(item.rrule),
    scheduleDirty: false,
  };
}

export function buildAutomationDraftFromDirectiveSeed({
  seed,
  targetAutomation,
  modelsByType,
}: {
  seed: AutomationDirectiveSeed;
  targetAutomation: Automation | null;
  modelsByType?: ModelsByType;
}): AutomationDraft {
  const targetAutomationModelSettings =
    targetAutomation != null
      ? getAutomationModelSettings({
          automation: targetAutomation,
          models: modelsByType?.models ?? [],
        })
      : null;
  const executionEnvironment =
    seed.id != null && targetAutomation == null
      ? null
      : targetAutomation != null && !isHeartbeatAutomation(targetAutomation)
        ? resolveAutomationExecutionEnvironment(
            targetAutomation.executionEnvironment,
          )
        : EMPTY_AUTOMATION_DRAFT.executionEnvironment;
  const kind =
    targetAutomation?.kind ??
    (seed.id != null && targetAutomation == null
      ? EMPTY_AUTOMATION_DRAFT.kind
      : "cron");
  return {
    id: seed.id ?? targetAutomation?.id ?? null,
    kind,
    name: seed.name,
    prompt: seed.prompt,
    status: seed.status ?? targetAutomation?.status ?? "ACTIVE",
    cwds:
      targetAutomation != null && !isHeartbeatAutomation(targetAutomation)
        ? targetAutomation.cwds
        : seed.cwds.map(createGitCwd),
    executionEnvironment,
    targetThreadId:
      targetAutomation != null && isHeartbeatAutomation(targetAutomation)
        ? targetAutomation.targetThreadId
        : null,
    model:
      kind === "heartbeat"
        ? null
        : (targetAutomationModelSettings?.model ??
          EMPTY_AUTOMATION_DRAFT.model),
    reasoningEffort:
      kind === "heartbeat"
        ? null
        : (targetAutomationModelSettings?.reasoningEffort ??
          EMPTY_AUTOMATION_DRAFT.reasoningEffort),
    rawRrule: seed.rrule,
    scheduleConfig: parseScheduleConfig(seed.rrule),
    scheduleDirty: false,
  };
}

export function isAutomationDraftUninitialized(
  draft: AutomationDraft,
): boolean {
  return (
    draft.id == null &&
    draft.kind === "cron" &&
    draft.name === "" &&
    draft.prompt === "" &&
    draft.cwds.length === 0 &&
    draft.executionEnvironment === "worktree" &&
    draft.targetThreadId == null &&
    draft.model == null &&
    draft.reasoningEffort == null &&
    draft.rawRrule == null &&
    draft.scheduleDirty === false
  );
}

export function getDraftForAutomationKind(
  draft: AutomationDraft,
  nextKind: AutomationKind,
): AutomationDraft {
  const nextScheduleConfig =
    nextKind === "heartbeat" && draft.kind !== "heartbeat"
      ? createDefaultHeartbeatScheduleConfig()
      : nextKind === "cron" && draft.kind === "heartbeat"
        ? {
            ...draft.scheduleConfig,
            intervalHours: Math.max(
              1,
              Math.round((draft.scheduleConfig.intervalMinutes ?? 60) / 60),
            ),
            intervalMinutes: null,
          }
        : draft.scheduleConfig;
  return {
    ...draft,
    kind: nextKind,
    executionEnvironment:
      nextKind === "cron" ? (draft.executionEnvironment ?? "worktree") : null,
    targetThreadId: nextKind === "heartbeat" ? draft.targetThreadId : null,
    rawRrule:
      nextKind === "heartbeat" && draft.kind !== "heartbeat"
        ? null
        : draft.rawRrule,
    scheduleConfig: nextScheduleConfig,
    scheduleDirty:
      nextKind === "heartbeat" && draft.kind !== "heartbeat"
        ? true
        : nextKind === "cron" && draft.kind === "heartbeat"
          ? true
          : draft.scheduleDirty,
  };
}

export function applyAutomationDraftModelDefaults({
  draft,
  modelSettings,
}: {
  draft: AutomationDraft;
  modelSettings: ModelSettings;
}): AutomationDraft {
  if (draft.kind === "heartbeat") {
    return {
      ...draft,
      model: null,
      reasoningEffort: null,
    };
  }
  if (modelSettings.isLoading || draft.model != null) {
    return draft;
  }
  return {
    ...draft,
    model: modelSettings.model,
    reasoningEffort: modelSettings.reasoningEffort,
  };
}

export function normalizeAutomationDirectiveText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseAutomationDirectiveCwds(
  value: unknown,
): Array<string> | null {
  if (Array.isArray(value)) {
    return value.filter((cwd): cwd is string => {
      return typeof cwd === "string" && cwd.trim().length > 0;
    });
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((cwd): cwd is string => {
          return typeof cwd === "string" && cwd.trim().length > 0;
        });
      }
    } catch {
      return null;
    }
  }
  return trimmed
    .split(",")
    .map((cwd) => cwd.trim())
    .filter((cwd) => cwd.length > 0);
}

export function parseAutomationDirectiveStatus(
  value: unknown,
): AutomationStatus | null {
  if (value === "ACTIVE" || value === "PAUSED" || value === "DELETED") {
    return value;
  }
  return null;
}

export function parseAutomationDirectiveMode(
  value: unknown,
): "view" | "suggested-update" | "suggested-create" | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (normalized === "view") {
    return "view";
  }
  if (normalized === "suggested update" || normalized === "update") {
    return "suggested-update";
  }
  if (normalized === "suggested create" || normalized === "create") {
    return "suggested-create";
  }
  return null;
}

export function resolveAutomationDirectiveAction({
  directiveMode,
  canCreate,
  canUpdate,
  isViewMode,
  forceOpen = false,
}: {
  directiveMode: "view" | "suggested-update" | "suggested-create" | null;
  canCreate: boolean;
  canUpdate: boolean;
  isViewMode: boolean;
  forceOpen?: boolean;
}): "create" | "update" | "open" | null {
  if (forceOpen) {
    return "open";
  }
  if (directiveMode === "suggested-create") {
    return canCreate ? "create" : null;
  }
  if (directiveMode === "suggested-update") {
    return canUpdate ? "update" : null;
  }
  if (directiveMode === "view") {
    return isViewMode ? "open" : null;
  }
  if (canUpdate) {
    return "update";
  }
  if (canCreate) {
    return "create";
  }
  return isViewMode ? "open" : null;
}
