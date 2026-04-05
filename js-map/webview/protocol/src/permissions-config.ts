import type * as AppServer from "app-server-types";

const GUARDIAN_APPROVAL_FEATURE_NAME = "guardian_approval";
const APPROVALS_REVIEWER_CONFIG_KEY = "approvals_reviewer";
export const APPROVALS_REVIEWER_USER: Extract<
  AppServer.v2.ApprovalsReviewer,
  "user"
> = "user";
export const APPROVALS_REVIEWER_GUARDIAN_SUBAGENT: Extract<
  AppServer.v2.ApprovalsReviewer,
  "guardian_subagent"
> = "guardian_subagent";

export type AgentMode =
  | "read-only"
  // "auto" is the long-standing default workspace-write mode. It routes
  // elevated requests to the user.
  | "auto"
  // "guardian-approvals" uses the same workspace-write sandbox and on-request
  // approval policy as "auto", but routes elevated requests to Guardian.
  | "guardian-approvals"
  | "full-access"
  | "custom";
export type NonCustomAgentMode = Exclude<AgentMode, "custom">;
export type BuiltInNonFullAccessAgentMode = Exclude<
  NonCustomAgentMode,
  "full-access"
>;
export type NonFullAccessDropdownMode = Exclude<AgentMode, "full-access">;
export type WorkspaceWriteAgentMode = Extract<
  BuiltInNonFullAccessAgentMode,
  "auto" | "guardian-approvals"
>;
const DEFAULT_NON_FULL_ACCESS_AGENT_MODE: BuiltInNonFullAccessAgentMode =
  "read-only";
export const AGENT_MODE_LIST: Array<AgentMode> = [
  "read-only",
  "auto",
  "guardian-approvals",
  "full-access",
  "custom",
];
const BUILT_IN_AGENT_MODE_LIST: Array<NonCustomAgentMode> = [
  "read-only",
  "auto",
  "guardian-approvals",
  "full-access",
];
export const AGENT_MODE_PRIORITY_LIST: Array<NonFullAccessDropdownMode> = [
  "custom",
  "auto",
  "guardian-approvals",
  "read-only",
];
const FULL_READ_ONLY_ACCESS: AppServer.v2.ReadOnlyAccess = {
  type: "fullAccess",
};
const READ_ONLY_SANDBOX_POLICY: AppServer.v2.SandboxPolicy = {
  type: "readOnly",
  access: FULL_READ_ONLY_ACCESS,
  networkAccess: false,
};

export interface PermissionsConfig {
  sandboxPolicy: AppServer.v2.SandboxPolicy;
  approvalPolicy: AppServer.v2.AskForApproval;
  approvalsReviewer: AppServer.v2.ApprovalsReviewer;
}

function readBooleanFeatureFlag(
  config: AppServer.v2.Config | null | undefined,
  key: string,
): boolean | undefined {
  const flatValue = config?.[`features.${key}`];
  if (typeof flatValue === "boolean") {
    return flatValue;
  }

  const features = config?.features;
  if (
    features == null ||
    typeof features !== "object" ||
    Array.isArray(features)
  ) {
    return undefined;
  }

  const nestedValue = Object.getOwnPropertyDescriptor(features, key)?.value;
  return typeof nestedValue === "boolean" ? nestedValue : undefined;
}

const AGENT_MODE_REQUIREMENTS: Record<
  NonCustomAgentMode,
  {
    sandboxMode: AppServer.v2.SandboxMode;
    approvalPolicy: AppServer.v2.AskForApproval;
  }
> = {
  "read-only": {
    sandboxMode: "read-only",
    approvalPolicy: "on-request",
  },
  auto: {
    sandboxMode: "workspace-write",
    approvalPolicy: "on-request",
  },
  "guardian-approvals": {
    sandboxMode: "workspace-write",
    approvalPolicy: "on-request",
  },
  "full-access": {
    sandboxMode: "danger-full-access",
    approvalPolicy: "never",
  },
};

export function getSandboxModeForPolicy(
  sandboxPolicy: AppServer.v2.SandboxPolicy,
): AppServer.v2.SandboxMode | null {
  switch (sandboxPolicy.type) {
    case "dangerFullAccess":
      return "danger-full-access";
    case "readOnly":
      return "read-only";
    case "workspaceWrite":
      return "workspace-write";
    case "externalSandbox":
      return null;
  }
}

// Permission validation
export function resolveAvailableAgentModes(
  requirements: AppServer.v2.ConfigRequirements | null,
  userSavedConfig?: AppServer.v2.Config | null,
): Array<AgentMode> {
  const isCustomModeEnabled =
    !!userSavedConfig?.approval_policy || !!userSavedConfig?.sandbox_mode;
  const agentModes = resolveAgentModesFromRequirements(requirements);
  const customModeWithOnlySandboxAndApproval = isCustomModeEnabled
    ? buildCustomPermissionConfig([], userSavedConfig)
    : null;
  const canShowCustom =
    customModeWithOnlySandboxAndApproval &&
    isPolicyAllowedByRequirements(
      requirements,
      getSandboxModeForPolicy(
        customModeWithOnlySandboxAndApproval.sandboxPolicy,
      ),
      customModeWithOnlySandboxAndApproval.approvalPolicy,
    );
  if (canShowCustom) {
    return [...agentModes, "custom"];
  }
  return agentModes;
}

export function resolveAvailableNonFullAccessAgentMode(
  availableAgentModes: Array<AgentMode>,
): NonFullAccessDropdownMode {
  for (const mode of AGENT_MODE_PRIORITY_LIST) {
    if (availableAgentModes.includes(mode)) {
      return mode;
    }
  }
  return DEFAULT_NON_FULL_ACCESS_AGENT_MODE;
}

function isPolicyAllowedByRequirements(
  requirements: AppServer.v2.ConfigRequirements | null,
  sandboxMode: AppServer.v2.SandboxMode | null,
  approvalPolicy: AppServer.v2.AskForApproval | null,
): boolean {
  if (requirements == null) {
    return true;
  }
  const allowedSandboxModes = requirements.allowedSandboxModes;
  if (
    allowedSandboxModes != null &&
    sandboxMode &&
    !allowedSandboxModes.includes(sandboxMode)
  ) {
    return false;
  }
  const allowedApprovalPolicies = requirements.allowedApprovalPolicies;
  if (
    allowedApprovalPolicies != null &&
    approvalPolicy &&
    !allowedApprovalPolicies.includes(approvalPolicy)
  ) {
    return false;
  }
  return true;
}

export function resolveAgentModesFromRequirements(
  requirements: AppServer.v2.ConfigRequirements | null,
): Array<AgentMode> {
  return BUILT_IN_AGENT_MODE_LIST.filter((mode) =>
    isAgentModeAllowedByRequirements(mode, requirements),
  );
}

export function isAgentModeAllowedByRequirements(
  mode: Exclude<AgentMode, "custom">,
  requirements: AppServer.v2.ConfigRequirements | null,
): boolean {
  if (requirements == null) {
    return true;
  }

  const { sandboxMode, approvalPolicy } = AGENT_MODE_REQUIREMENTS[mode];
  return isPolicyAllowedByRequirements(
    requirements,
    sandboxMode,
    approvalPolicy,
  );
}

// Permission build
export function buildWorkspaceWritePermissionsConfig(
  writableRoots: Array<string>,
  sandboxWorkspaceWrite?: AppServer.v2.SandboxWorkspaceWrite | null,
  approvalPolicy?: AppServer.v2.AskForApproval | null,
  approvalsReviewer: AppServer.v2.ApprovalsReviewer = APPROVALS_REVIEWER_USER,
): PermissionsConfig {
  return {
    sandboxPolicy: {
      type: "workspaceWrite",
      writableRoots: [
        ...writableRoots,
        ...(sandboxWorkspaceWrite?.writable_roots || []),
      ],
      readOnlyAccess: FULL_READ_ONLY_ACCESS,
      excludeSlashTmp: sandboxWorkspaceWrite?.exclude_slash_tmp ?? false,
      excludeTmpdirEnvVar:
        sandboxWorkspaceWrite?.exclude_tmpdir_env_var ?? false,
      networkAccess: sandboxWorkspaceWrite?.network_access ?? false,
    },
    approvalPolicy: approvalPolicy ?? "on-request",
    approvalsReviewer,
  };
}

function buildReadOnlyPermissionsConfig(
  approvalPolicy?: AppServer.v2.AskForApproval | null,
  approvalsReviewer: AppServer.v2.ApprovalsReviewer = APPROVALS_REVIEWER_USER,
): PermissionsConfig {
  return {
    sandboxPolicy: READ_ONLY_SANDBOX_POLICY,
    approvalPolicy: approvalPolicy ?? "on-request",
    approvalsReviewer,
  };
}

function buildFullAccessPermissionsConfig(
  approvalPolicy?: AppServer.v2.AskForApproval | null,
  approvalsReviewer: AppServer.v2.ApprovalsReviewer = APPROVALS_REVIEWER_USER,
): PermissionsConfig {
  return {
    sandboxPolicy: { type: "dangerFullAccess" },
    approvalPolicy: approvalPolicy ?? "never",
    approvalsReviewer,
  };
}

function buildCustomPermissionConfig(
  writableRoots: Array<string>,
  config: AppServer.v2.Config,
): PermissionsConfig {
  const approvalsReviewer = getApprovalsReviewerFromUserConfig(config);
  switch (config.sandbox_mode) {
    case "danger-full-access":
      return buildFullAccessPermissionsConfig(
        config.approval_policy,
        approvalsReviewer,
      );
    case "read-only":
      return buildReadOnlyPermissionsConfig(
        config.approval_policy,
        approvalsReviewer,
      );
    case "workspace-write":
      return buildWorkspaceWritePermissionsConfig(
        writableRoots,
        config.sandbox_workspace_write,
        config.approval_policy,
        approvalsReviewer,
      );
    case null:
    case undefined:
      return buildReadOnlyPermissionsConfig(
        config.approval_policy,
        approvalsReviewer,
      );
  }
}

export function buildPermissionsConfigForMode(
  mode: AgentMode,
  writableRoots: Array<string>,
  config: AppServer.v2.Config,
): PermissionsConfig {
  switch (mode) {
    case "read-only":
      return buildReadOnlyPermissionsConfig();
    case "full-access":
      return buildFullAccessPermissionsConfig();
    case "auto":
      return buildWorkspaceWritePermissionsConfig(writableRoots);
    case "guardian-approvals":
      return buildWorkspaceWritePermissionsConfig(
        writableRoots,
        undefined,
        undefined,
        APPROVALS_REVIEWER_GUARDIAN_SUBAGENT,
      );
    case "custom":
      return buildCustomPermissionConfig(writableRoots, config);
  }
}

export function getApprovalsReviewerFromUserConfig(
  config?: AppServer.v2.Config,
): AppServer.v2.ApprovalsReviewer {
  const value = config?.[APPROVALS_REVIEWER_CONFIG_KEY];
  if (
    value !== APPROVALS_REVIEWER_USER &&
    value !== APPROVALS_REVIEWER_GUARDIAN_SUBAGENT
  ) {
    return APPROVALS_REVIEWER_USER;
  }

  if (
    value === APPROVALS_REVIEWER_GUARDIAN_SUBAGENT &&
    readGuardianApprovalFlag(config) === false
  ) {
    return APPROVALS_REVIEWER_USER;
  }

  return value;
}

function usesDefaultWorkspaceWriteSettings(
  sandboxWorkspaceWrite?: AppServer.v2.SandboxWorkspaceWrite | null,
): boolean {
  if (sandboxWorkspaceWrite == null) {
    return true;
  }

  return (
    (sandboxWorkspaceWrite.writable_roots?.length ?? 0) === 0 &&
    (sandboxWorkspaceWrite.network_access ?? false) === false &&
    (sandboxWorkspaceWrite.exclude_slash_tmp ?? false) === false &&
    (sandboxWorkspaceWrite.exclude_tmpdir_env_var ?? false) === false
  );
}

export function getBuiltInAgentModeForConfig(
  config?: AppServer.v2.Config,
  workspaceWriteMode: WorkspaceWriteAgentMode = "auto",
): NonCustomAgentMode | null {
  const sandboxMode = config?.sandbox_mode ?? null;
  const approvalPolicy = config?.approval_policy ?? null;
  const sandboxWorkspaceWrite = config?.sandbox_workspace_write;
  const isUnsetConfig =
    sandboxMode == null &&
    approvalPolicy == null &&
    sandboxWorkspaceWrite == null;
  const matchesOnRequestOrUnset =
    approvalPolicy === "on-request" || approvalPolicy == null;
  const matchesNeverOrUnset =
    approvalPolicy === "never" || approvalPolicy == null;
  const usesDefaultWorkspaceWriteDefaults = usesDefaultWorkspaceWriteSettings(
    sandboxWorkspaceWrite,
  );

  if (isUnsetConfig) {
    return workspaceWriteMode;
  }

  if (
    (sandboxMode === "read-only" || sandboxMode == null) &&
    matchesOnRequestOrUnset
  ) {
    return "read-only";
  }

  if (
    sandboxMode === "workspace-write" &&
    matchesOnRequestOrUnset &&
    usesDefaultWorkspaceWriteDefaults
  ) {
    return workspaceWriteMode;
  }

  if (sandboxMode === "danger-full-access" && matchesNeverOrUnset) {
    return "full-access";
  }

  return null;
}

export function readGuardianApprovalFlag(
  config?: AppServer.v2.Config,
): boolean | undefined {
  return readBooleanFeatureFlag(config, GUARDIAN_APPROVAL_FEATURE_NAME);
}
