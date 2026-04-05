import type * as AppServer from "app-server-types";
import {
  APPROVALS_REVIEWER_GUARDIAN_SUBAGENT,
  type AgentMode,
  type BuiltInNonFullAccessAgentMode,
  getBuiltInAgentModeForConfig,
  getApprovalsReviewerFromUserConfig,
  type NonCustomAgentMode,
  readGuardianApprovalFlag,
  resolveAvailableAgentModes,
  resolveAvailableNonFullAccessAgentMode,
} from "protocol";

type PermissionsModeConfigState = {
  availableAgentModes: Array<AgentMode>;
  canShowCustom: boolean;
  canUnlock: boolean;
  customEquivalentMode: NonCustomAgentMode | null;
  isGuardianModeAvailable: boolean;
  isConfigDataPending: boolean;
  baseNonFullAccessMode: BuiltInNonFullAccessAgentMode;
  configNonFullAccessMode: BuiltInNonFullAccessAgentMode;
  showGuardianOption: boolean;
};

type PermissionsModeSelectionState = {
  canSelectGuardianMode: boolean;
  resolvedNonFullAccessMode: BuiltInNonFullAccessAgentMode;
};

type PermissionsModeSelectionResolution = PermissionsModeSelectionState & {
  validPreferredNonFullAccessMode: BuiltInNonFullAccessAgentMode | null;
  shouldClearPreferredNonFullAccessMode: boolean;
};

function resolveBaseNonFullAccessMode(
  availableAgentModes: Array<NonCustomAgentMode>,
): BuiltInNonFullAccessAgentMode {
  const mode = resolveAvailableNonFullAccessAgentMode(availableAgentModes);
  return mode === "custom" ? "read-only" : mode;
}

function isPreferredNonFullAccessModeValid(
  mode: BuiltInNonFullAccessAgentMode,
  availableAgentModes: Array<AgentMode>,
  isGuardianModeAvailable: boolean,
): boolean {
  if (!availableAgentModes.includes(mode)) {
    return false;
  }

  if (mode === "guardian-approvals") {
    return isGuardianModeAvailable;
  }

  return true;
}

export function getValidPreferredNonFullAccessMode(
  preferredNonFullAccessMode: BuiltInNonFullAccessAgentMode | null,
  availableAgentModes: Array<AgentMode>,
  isGuardianModeAvailable: boolean,
): BuiltInNonFullAccessAgentMode | null {
  return preferredNonFullAccessMode != null &&
    !isPreferredNonFullAccessModeValid(
      preferredNonFullAccessMode,
      availableAgentModes,
      isGuardianModeAvailable,
    )
    ? null
    : preferredNonFullAccessMode;
}

export function resolvePermissionsModeConfigState({
  isConfigDataPending,
  requirements,
  resolvedConfig,
  isGuardianApprovalEnabledByStatsig,
}: {
  isConfigDataPending: boolean;
  requirements: AppServer.v2.ConfigRequirements | null;
  resolvedConfig: AppServer.v2.Config | null;
  isGuardianApprovalEnabledByStatsig: boolean;
}): PermissionsModeConfigState {
  const baseAvailableAgentModes: Array<AgentMode> = isConfigDataPending
    ? ["read-only", "auto", "full-access", "custom"]
    : resolveAvailableAgentModes(requirements, resolvedConfig);
  const showGuardianOption =
    readGuardianApprovalFlag(resolvedConfig ?? undefined) ??
    isGuardianApprovalEnabledByStatsig;
  const isGuardianModeAvailable =
    showGuardianOption && baseAvailableAgentModes.includes("auto");
  const baseAvailableAgentModesWithoutGuardian = baseAvailableAgentModes.filter(
    (mode): mode is AgentMode => mode !== "guardian-approvals",
  );
  const availableAgentModes: Array<AgentMode> = isGuardianModeAvailable
    ? baseAvailableAgentModesWithoutGuardian.flatMap((mode) =>
        mode === "auto"
          ? (["auto", "guardian-approvals"] satisfies Array<AgentMode>)
          : [mode],
      )
    : baseAvailableAgentModesWithoutGuardian;
  const availableBuiltInModes = availableAgentModes.filter(
    (option): option is NonCustomAgentMode => option !== "custom",
  );
  const customEquivalentModeWithoutGuardianPreference =
    getBuiltInAgentModeForConfig(resolvedConfig ?? undefined);
  const shouldPreferGuardianApprovalMode =
    isGuardianModeAvailable &&
    customEquivalentModeWithoutGuardianPreference === "auto" &&
    getApprovalsReviewerFromUserConfig(resolvedConfig ?? undefined) ===
      APPROVALS_REVIEWER_GUARDIAN_SUBAGENT;
  const baseNonFullAccessMode = resolveBaseNonFullAccessMode(
    availableBuiltInModes,
  );
  const configNonFullAccessMode = shouldPreferGuardianApprovalMode
    ? "guardian-approvals"
    : baseNonFullAccessMode;

  return {
    availableAgentModes,
    canShowCustom: availableAgentModes.includes("custom"),
    canUnlock: availableAgentModes.includes("full-access"),
    customEquivalentMode: getBuiltInAgentModeForConfig(
      resolvedConfig ?? undefined,
      shouldPreferGuardianApprovalMode ? "guardian-approvals" : "auto",
    ),
    isGuardianModeAvailable,
    isConfigDataPending,
    baseNonFullAccessMode,
    configNonFullAccessMode,
    showGuardianOption,
  };
}

export function shouldKeepCurrentAgentModeSelection(
  mode: AgentMode,
  availableAgentModes: Array<AgentMode>,
  customEquivalentMode: NonCustomAgentMode | null = null,
): boolean {
  if (mode === "custom" && customEquivalentMode != null) {
    return false;
  }

  if (!availableAgentModes.includes(mode)) {
    return false;
  }

  return (
    mode === "guardian-approvals" || mode === "full-access" || mode === "custom"
  );
}

export function getInitialAgentModeSelection(
  availableAgentModes: Array<AgentMode>,
  customEquivalentMode: NonCustomAgentMode | null,
  resolvedNonFullAccessMode: BuiltInNonFullAccessAgentMode,
  preferredNonFullAccessMode: BuiltInNonFullAccessAgentMode | null = null,
): AgentMode {
  if (
    preferredNonFullAccessMode != null &&
    availableAgentModes.includes(preferredNonFullAccessMode)
  ) {
    return preferredNonFullAccessMode;
  }

  if (availableAgentModes.includes("custom")) {
    return "custom";
  }

  if (
    customEquivalentMode != null &&
    availableAgentModes.includes(customEquivalentMode)
  ) {
    return customEquivalentMode;
  }

  return resolvedNonFullAccessMode;
}

export function getNextAgentModeSelection(
  mode: AgentMode,
  preferredNonFullAccessMode: BuiltInNonFullAccessAgentMode | null,
  resolvedNonFullAccessMode: BuiltInNonFullAccessAgentMode,
  availableAgentModes: Array<AgentMode>,
  customEquivalentMode: NonCustomAgentMode | null = null,
): AgentMode | null {
  if (preferredNonFullAccessMode != null) {
    return mode === preferredNonFullAccessMode
      ? null
      : preferredNonFullAccessMode;
  }

  if (
    shouldKeepCurrentAgentModeSelection(
      mode,
      availableAgentModes,
      customEquivalentMode,
    )
  ) {
    return null;
  }

  const shouldSelectCustomMode =
    customEquivalentMode == null && availableAgentModes.includes("custom");
  if (shouldSelectCustomMode) {
    return mode === "custom" ? null : "custom";
  }

  return mode === resolvedNonFullAccessMode ? null : resolvedNonFullAccessMode;
}

/**
 * Resolves the current built-in non-full-access mode selection state.
 *
 * `preferredNonFullAccessMode` is the user's persisted built-in override from
 * `aPreferredNonFullAccessMode`, set when they explicitly choose Default
 * permissions or Guardian approvals in the composer UI.
 *
 * Returns:
 * - `canSelectGuardianMode`: whether Guardian approvals should be offered as a
 *   selectable built-in mode in the current workspace.
 * - `resolvedNonFullAccessMode`: the effective built-in non-full-access mode
 *   after reconciling the user's preferred override with the config-derived
 *   fallback mode.
 * - `validPreferredNonFullAccessMode`: the preferred override after dropping
 *   values that are no longer valid for the current workspace.
 * - `shouldClearPreferredNonFullAccessMode`: whether the persisted preferred
 *   override has become redundant or invalid and should be cleared after
 *   config-derived availability has settled.
 */
export function resolvePermissionsModeSelectionState({
  availableAgentModes,
  preferredNonFullAccessMode,
  isGuardianModeAvailable,
  isConfigDataPending,
  configNonFullAccessMode,
}: {
  availableAgentModes: Array<AgentMode>;
  preferredNonFullAccessMode: BuiltInNonFullAccessAgentMode | null;
  isGuardianModeAvailable: boolean;
  isConfigDataPending: boolean;
  configNonFullAccessMode: BuiltInNonFullAccessAgentMode;
}): PermissionsModeSelectionResolution {
  const effectivePreferredNonFullAccessMode =
    getValidPreferredNonFullAccessMode(
      preferredNonFullAccessMode,
      availableAgentModes,
      isGuardianModeAvailable,
    );
  const hasInvalidPreferredNonFullAccessMode =
    preferredNonFullAccessMode != null &&
    effectivePreferredNonFullAccessMode == null;
  const resolvedNonFullAccessMode =
    effectivePreferredNonFullAccessMode ?? configNonFullAccessMode;

  return {
    canSelectGuardianMode: isGuardianModeAvailable,
    resolvedNonFullAccessMode,
    validPreferredNonFullAccessMode: effectivePreferredNonFullAccessMode,
    shouldClearPreferredNonFullAccessMode:
      !isConfigDataPending &&
      (hasInvalidPreferredNonFullAccessMode ||
        (effectivePreferredNonFullAccessMode != null &&
          effectivePreferredNonFullAccessMode === configNonFullAccessMode)),
  };
}
