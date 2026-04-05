import type { AutoTopUpSettings } from "@/queries/usage-settings-types";

export const AUTO_TOP_UP_MIN_THRESHOLD = 125;
export const AUTO_TOP_UP_MIN_TARGET_DIFFERENCE = 125;

export type AutoTopUpDraftState = {
  isEnabled: boolean;
  rechargeThreshold: string;
  rechargeTarget: string;
};

export type AutoTopUpFieldError =
  | "missing"
  | "not-whole-number"
  | "below-threshold-minimum"
  | "target-difference-too-small"
  | null;

export type AutoTopUpValidationResult = {
  rechargeThresholdError: AutoTopUpFieldError;
  rechargeTargetError: AutoTopUpFieldError;
  isValid: boolean;
};

export type AutoTopUpSaveIntent = "none" | "enable" | "update" | "disable";

export type AutoTopUpDraftSaveState = {
  validation: AutoTopUpValidationResult;
  hasChanges: boolean;
  saveIntent: AutoTopUpSaveIntent;
  isSaveEnabled: boolean;
};

export function trimAutoTopUpAmountValue(value: string | null): string {
  if (value == null) {
    return "";
  }

  return value.trim();
}

export function getAutoTopUpDraftStateValidation({
  rechargeThreshold,
  rechargeTarget,
}: {
  rechargeThreshold: string;
  rechargeTarget: string;
}): AutoTopUpValidationResult {
  const parsedThreshold = parseWholeNumberField(rechargeThreshold);
  const parsedTarget = parseWholeNumberField(rechargeTarget);
  const thresholdError = getThresholdFieldError(parsedThreshold);
  const targetError = getTargetFieldError({
    parsedThreshold,
    parsedTarget,
  });

  return {
    rechargeThresholdError: thresholdError,
    rechargeTargetError: targetError,
    isValid: thresholdError == null && targetError == null,
  };
}

export function getAutoTopUpDraftSaveState({
  draftState,
  serverState,
  isSaving,
}: {
  draftState: AutoTopUpDraftState;
  serverState: AutoTopUpSettings;
  isSaving: boolean;
}): AutoTopUpDraftSaveState {
  const validation = getAutoTopUpDraftStateValidation({
    rechargeThreshold: draftState.rechargeThreshold,
    rechargeTarget: draftState.rechargeTarget,
  });
  const hasChanges = hasAutoTopUpDraftChanged({
    draftState,
    serverState,
  });
  const saveIntent = getAutoTopUpSaveIntent({
    draftState,
    serverState,
    validation,
  });

  return {
    validation,
    hasChanges,
    saveIntent,
    isSaveEnabled: hasChanges && saveIntent !== "none" && !isSaving,
  };
}

export function getAutoTopUpSaveIntent({
  draftState,
  serverState,
  validation,
}: {
  draftState: AutoTopUpDraftState;
  serverState: AutoTopUpSettings;
  validation: AutoTopUpValidationResult;
}): AutoTopUpSaveIntent {
  if (!draftState.isEnabled) {
    return serverState.isEnabled ? "disable" : "none";
  }

  if (!validation.isValid) {
    return "none";
  }

  // The first successful save after a user turns the toggle on must call
  // `enable`. Once the server snapshot says enabled, later saves switch to
  // `update` so we do not accidentally re-run the enable path.
  if (!serverState.isEnabled) {
    return "enable";
  }

  if (
    trimAutoTopUpAmountValue(draftState.rechargeThreshold) ===
      trimAutoTopUpAmountValue(serverState.rechargeThreshold) &&
    trimAutoTopUpAmountValue(draftState.rechargeTarget) ===
      trimAutoTopUpAmountValue(serverState.rechargeTarget)
  ) {
    return "none";
  }

  return "update";
}

function hasAutoTopUpDraftChanged({
  draftState,
  serverState,
}: {
  draftState: AutoTopUpDraftState;
  serverState: AutoTopUpSettings;
}): boolean {
  if (draftState.isEnabled !== serverState.isEnabled) {
    return true;
  }

  // Hidden rows should not require a save when auto top up remains disabled.
  if (!draftState.isEnabled && !serverState.isEnabled) {
    return false;
  }

  return (
    trimAutoTopUpAmountValue(draftState.rechargeThreshold) !==
      trimAutoTopUpAmountValue(serverState.rechargeThreshold) ||
    trimAutoTopUpAmountValue(draftState.rechargeTarget) !==
      trimAutoTopUpAmountValue(serverState.rechargeTarget)
  );
}

export function getAutoTopUpTargetDifference({
  rechargeThreshold,
  rechargeTarget,
}: {
  rechargeThreshold: string | null;
  rechargeTarget: string | null;
}): number | null {
  const trimmedThreshold = trimAutoTopUpAmountValue(rechargeThreshold);
  const trimmedTarget = trimAutoTopUpAmountValue(rechargeTarget);
  if (!/^\d+$/.test(trimmedThreshold) || !/^\d+$/.test(trimmedTarget)) {
    return null;
  }

  const threshold = Number.parseInt(trimmedThreshold, 10);
  const target = Number.parseInt(trimmedTarget, 10);
  if (target < threshold) {
    return null;
  }

  return target - threshold;
}

type ParsedWholeNumberFieldResult =
  | {
      kind: "missing";
    }
  | {
      kind: "invalid";
    }
  | {
      kind: "valid";
      value: number;
    };

function parseWholeNumberField(value: string): ParsedWholeNumberFieldResult {
  const trimmedValue = trimAutoTopUpAmountValue(value);
  if (trimmedValue.length === 0) {
    return {
      kind: "missing",
    };
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return {
      kind: "invalid",
    };
  }

  return {
    kind: "valid",
    value: Number.parseInt(trimmedValue, 10),
  };
}

function getThresholdFieldError(
  parsedThreshold: ParsedWholeNumberFieldResult,
): AutoTopUpFieldError {
  switch (parsedThreshold.kind) {
    case "missing":
      return "missing";
    case "invalid":
      return "not-whole-number";
    case "valid":
      if (parsedThreshold.value < AUTO_TOP_UP_MIN_THRESHOLD) {
        return "below-threshold-minimum";
      }
      return null;
  }
}

function getTargetFieldError({
  parsedThreshold,
  parsedTarget,
}: {
  parsedThreshold: ParsedWholeNumberFieldResult;
  parsedTarget: ParsedWholeNumberFieldResult;
}): AutoTopUpFieldError {
  switch (parsedTarget.kind) {
    case "missing":
      return "missing";
    case "invalid":
      return "not-whole-number";
    case "valid":
      if (
        parsedThreshold.kind === "valid" &&
        parsedTarget.value - parsedThreshold.value <
          AUTO_TOP_UP_MIN_TARGET_DIFFERENCE
      ) {
        return "target-difference-too-small";
      }
      return null;
  }
}
