import type * as AppServer from "app-server-types";
import { useAtom } from "jotai";
import {
  type BuiltInNonFullAccessAgentMode,
  type ConversationId,
  isAgentModeAllowedByRequirements,
  readGuardianApprovalFlag,
} from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import {
  useAppServerManagerForConversationIdOrDefault,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import {
  useConfigRequirements,
  useEffectiveConfig,
} from "@/queries/config-queries";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { useGate } from "@/statsig/statsig";
import { useFetchFromVSCode } from "@/vscode-api";

import { aPreferredNonFullAccessMode } from "./composer-atoms";

export type PermissionsModeConfigData = {
  isConfigDataPending: boolean;
  isGuardianApprovalEnabledByStatsig: boolean;
  requirements: AppServer.v2.ConfigRequirements | null;
  resolvedConfig: AppServer.v2.Config | null;
};

export type PermissionsModeSelectionData = {
  preferredNonFullAccessMode: BuiltInNonFullAccessAgentMode | null;
  setPreferredNonFullAccessMode: (
    mode: BuiltInNonFullAccessAgentMode | null,
  ) => void;
};

type PermissionsModeScopeOptions = {
  conversationId: ConversationId | null;
  appServerManagerOverride?: AppServerManager | null;
  cwdOverride?: string | null;
};

function usePermissionsModeScope({
  conversationId,
  appServerManagerOverride,
  cwdOverride,
}: PermissionsModeScopeOptions): {
  appServerManager: AppServerManager;
  cwd: string | null;
  hasExplicitScopeOverride: boolean;
} {
  const conversationCwd = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.cwd,
  );
  const defaultAppServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const appServerManager = appServerManagerOverride ?? defaultAppServerManager;
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const hasExplicitScopeOverride =
    appServerManagerOverride != null || cwdOverride !== undefined;
  const cwd = hasExplicitScopeOverride
    ? (cwdOverride ?? null)
    : (cwdOverride ?? conversationCwd ?? workspaceRoots?.roots?.[0] ?? null);

  return { appServerManager, cwd, hasExplicitScopeOverride };
}

export function useIsScopedPermissionModesEnabled(): boolean {
  return useGate(__statsigName("codex_rollout_scoped_permission_modes"));
}

export function usePermissionsModeConfigData({
  conversationId,
  appServerManagerOverride,
  cwdOverride,
}: PermissionsModeScopeOptions): PermissionsModeConfigData {
  const { appServerManager, cwd, hasExplicitScopeOverride } =
    usePermissionsModeScope({
      conversationId,
      appServerManagerOverride,
      cwdOverride,
    });
  const isExplicitScopeCwdPending = hasExplicitScopeOverride && cwd == null;
  const [defaultFeatureOverrides] = useSharedObject(
    "statsig_default_enable_features",
  );
  const { data: effectiveConfigData, isPending: isEffectiveConfigPending } =
    useEffectiveConfig(cwd, {
      appServerManager,
      cwdMode: hasExplicitScopeOverride
        ? "preserve-null"
        : "fallback-to-workspace",
      enabled: !isExplicitScopeCwdPending,
    });
  const {
    data: configRequirementsResponse,
    isPending: isConfigRequirementsPending,
  } = useConfigRequirements({ appServerManager });
  const requirements = configRequirementsResponse?.requirements ?? null;
  const resolvedConfig = effectiveConfigData?.config ?? null;
  const isGuardianApprovalPotentiallyRelevant =
    isConfigRequirementsPending ||
    isAgentModeAllowedByRequirements("auto", requirements);
  const isGuardianApprovalRolloutPending =
    isGuardianApprovalPotentiallyRelevant &&
    readGuardianApprovalFlag(resolvedConfig ?? undefined) === undefined &&
    defaultFeatureOverrides === undefined;

  return {
    isConfigDataPending:
      isExplicitScopeCwdPending ||
      isConfigRequirementsPending ||
      isEffectiveConfigPending ||
      isGuardianApprovalRolloutPending,
    isGuardianApprovalEnabledByStatsig:
      defaultFeatureOverrides?.guardian_approval === true,
    requirements,
    resolvedConfig,
  };
}

export function usePermissionsModeSelectionData(): PermissionsModeSelectionData {
  const [preferredNonFullAccessMode, setPreferredNonFullAccessMode] = useAtom(
    aPreferredNonFullAccessMode,
  );

  return {
    preferredNonFullAccessMode,
    setPreferredNonFullAccessMode,
  };
}
