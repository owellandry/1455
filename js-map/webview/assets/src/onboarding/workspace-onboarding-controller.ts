import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";

import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { useStatsigClient } from "@/statsig/statsig";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  aWorkspaceOnboardingAutoLaunchApplied,
  aWorkspaceOnboardingExperimentAssignment,
  type OnboardingTarget,
} from "./onboarding-state";
import {
  getWorkspaceOnboardingExperimentArm,
  isCurrentWorkspaceOnboardingExperimentAssignment,
  isWorkspaceOnboardingAutoPlaygroundTreatment,
  isWorkspaceOnboardingDirectPickerTreatment,
  shouldUsePlaygroundOnSkip,
  WORKSPACE_ONBOARDING_DEFAULT_PROJECT_NAME,
  WORKSPACE_ONBOARDING_EXPERIMENT_NAME,
  type WorkspaceOnboardingExperimentArm,
  type WorkspaceOnboardingExperimentAssignment,
} from "./workspace-onboarding-experiment";

export type WorkspaceOnboardingAutoLaunchAction =
  | "none"
  | "home_open_picker_or_create_default"
  | "select_workspace_skip_to_playground";

type WorkspaceRootOptionsData = {
  roots: Array<string>;
  labels?: Record<string, string>;
};

export function getWorkspaceOnboardingArmForTarget({
  windowType,
  onboardingTarget,
  assignment,
  evaluateExperimentArm,
}: {
  windowType: string;
  onboardingTarget: OnboardingTarget | null;
  assignment: WorkspaceOnboardingExperimentAssignment | null;
  evaluateExperimentArm: () => WorkspaceOnboardingExperimentArm;
}): WorkspaceOnboardingExperimentArm {
  if (assignment != null) {
    return assignment.arm;
  }
  if (windowType !== "electron" || onboardingTarget !== "workspace") {
    return "control";
  }
  return evaluateExperimentArm();
}

export function useWorkspaceOnboardingExperimentController(): {
  workspaceOnboardingExperimentAssignment: WorkspaceOnboardingExperimentAssignment | null;
  workspaceOnboardingExperimentArm: WorkspaceOnboardingExperimentArm;
} {
  const storedAssignment = useAtomValue(
    aWorkspaceOnboardingExperimentAssignment,
  );
  const workspaceOnboardingExperimentAssignment =
    isCurrentWorkspaceOnboardingExperimentAssignment(storedAssignment)
      ? storedAssignment
      : null;
  const workspaceOnboardingExperimentArm =
    workspaceOnboardingExperimentAssignment?.arm ?? "control";
  return {
    workspaceOnboardingExperimentAssignment,
    workspaceOnboardingExperimentArm,
  };
}

export function useWorkspaceOnboardingGateExperimentController({
  windowType,
  onboardingTarget,
}: {
  windowType: string;
  onboardingTarget: OnboardingTarget | null;
}): {
  workspaceOnboardingExperimentAssignment: WorkspaceOnboardingExperimentAssignment | null;
  workspaceOnboardingExperimentArm: WorkspaceOnboardingExperimentArm;
} {
  const [storedAssignment, setAssignment] = useAtom(
    aWorkspaceOnboardingExperimentAssignment,
  );
  const workspaceOnboardingExperimentAssignment =
    isCurrentWorkspaceOnboardingExperimentAssignment(storedAssignment)
      ? storedAssignment
      : null;
  const { client: statsigClient } = useStatsigClient();
  const workspaceOnboardingExperimentArm = getWorkspaceOnboardingArmForTarget({
    windowType,
    onboardingTarget,
    assignment: workspaceOnboardingExperimentAssignment,
    evaluateExperimentArm: () =>
      getWorkspaceOnboardingExperimentArm(statsigClient),
  });

  useEffect(() => {
    if (windowType !== "electron") {
      return;
    }
    if (onboardingTarget !== "workspace") {
      return;
    }
    if (workspaceOnboardingExperimentAssignment != null) {
      return;
    }
    setAssignment({
      arm: getWorkspaceOnboardingExperimentArm(statsigClient),
      assignedAtMs: Date.now(),
      experimentName: WORKSPACE_ONBOARDING_EXPERIMENT_NAME,
    });
  }, [
    onboardingTarget,
    setAssignment,
    statsigClient,
    windowType,
    workspaceOnboardingExperimentAssignment,
  ]);

  return {
    workspaceOnboardingExperimentAssignment,
    workspaceOnboardingExperimentArm,
  };
}

export function shouldSkipSelectWorkspacePageForOnboarding({
  onboardingTarget,
  arm,
  isRemoteHost,
}: {
  onboardingTarget: OnboardingTarget | null;
  arm: WorkspaceOnboardingExperimentArm;
  isRemoteHost: boolean;
}): boolean {
  return (
    onboardingTarget === "workspace" &&
    !isRemoteHost &&
    isWorkspaceOnboardingDirectPickerTreatment(arm)
  );
}

export function getWorkspaceOnboardingAutoLaunchAction({
  arm,
  isRemoteHost,
  isLoadingRoots,
  hasPersistedRoots,
  autoLaunchApplied,
}: {
  arm: WorkspaceOnboardingExperimentArm;
  isRemoteHost: boolean;
  isLoadingRoots: boolean;
  hasPersistedRoots: boolean;
  autoLaunchApplied: boolean;
}): WorkspaceOnboardingAutoLaunchAction {
  if (
    isRemoteHost ||
    isLoadingRoots ||
    hasPersistedRoots ||
    autoLaunchApplied
  ) {
    return "none";
  }
  if (isWorkspaceOnboardingDirectPickerTreatment(arm)) {
    return "home_open_picker_or_create_default";
  }
  if (isWorkspaceOnboardingAutoPlaygroundTreatment(arm)) {
    return "select_workspace_skip_to_playground";
  }
  return "none";
}

export function useWorkspaceOnboardingAutoLaunchController(): {
  workspaceOnboardingExperimentArm: WorkspaceOnboardingExperimentArm;
  isRemoteHost: boolean;
  workspaceOnboardingAutoLaunchApplied: boolean;
  setWorkspaceOnboardingAutoLaunchApplied: (value: boolean) => void;
  workspaceRootOptions: WorkspaceRootOptionsData | undefined;
  isLoadingWorkspaceRootOptions: boolean;
  hasPersistedRoots: boolean;
  autoLaunchAction: WorkspaceOnboardingAutoLaunchAction;
} {
  const { workspaceOnboardingExperimentArm } =
    useWorkspaceOnboardingExperimentController();
  const isRemoteHost = useIsRemoteHost();
  const [
    workspaceOnboardingAutoLaunchApplied,
    setWorkspaceOnboardingAutoLaunchApplied,
  ] = useAtom(aWorkspaceOnboardingAutoLaunchApplied);
  const {
    data: workspaceRootOptions,
    isLoading: isLoadingWorkspaceRootOptions,
  } = useFetchFromVSCode("workspace-root-options", {
    placeholderData: { roots: [], labels: {} },
  });
  const hasPersistedRoots = (workspaceRootOptions?.roots?.length ?? 0) > 0;
  const autoLaunchAction = getWorkspaceOnboardingAutoLaunchAction({
    arm: workspaceOnboardingExperimentArm,
    isRemoteHost,
    isLoadingRoots: isLoadingWorkspaceRootOptions,
    hasPersistedRoots,
    autoLaunchApplied: workspaceOnboardingAutoLaunchApplied,
  });

  return {
    workspaceOnboardingExperimentArm,
    isRemoteHost,
    workspaceOnboardingAutoLaunchApplied,
    setWorkspaceOnboardingAutoLaunchApplied,
    workspaceRootOptions,
    isLoadingWorkspaceRootOptions,
    hasPersistedRoots,
    autoLaunchAction,
  };
}

export function getWorkspaceOnboardingSkipProjectName(
  arm: WorkspaceOnboardingExperimentArm,
): string | undefined {
  if (!shouldUsePlaygroundOnSkip(arm)) {
    return undefined;
  }
  return WORKSPACE_ONBOARDING_DEFAULT_PROJECT_NAME;
}
