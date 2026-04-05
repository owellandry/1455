import {
  getStatsigExperiment,
  type useStatsigClient as UseStatsigClientHook,
} from "@/statsig/statsig";

export const WORKSPACE_ONBOARDING_DEFAULT_PROJECT_NAME = "Playground";
export const WORKSPACE_ONBOARDING_EXPERIMENT_NAME =
  "codex_app_workspace_onboarding_flow_v3";

export type WorkspaceOnboardingExperimentArm =
  | "control"
  | "t2_direct_folder_picker"
  | "t3_auto_playground"
  | "t4_modal_copy_cta_playground";

export type WorkspaceOnboardingExperimentAssignment = {
  arm: WorkspaceOnboardingExperimentArm;
  assignedAtMs: number;
  experimentName: string;
};

const ARM_PARAM = "arm";

function parseWorkspaceOnboardingExperimentArm(
  value: unknown,
): WorkspaceOnboardingExperimentArm {
  switch (value) {
    case "control":
    case "t2_direct_folder_picker":
    case "t3_auto_playground":
    case "t4_modal_copy_cta_playground":
      return value;
    default:
      return "control";
  }
}

export function getWorkspaceOnboardingExperimentArm(
  client: ReturnType<typeof UseStatsigClientHook>["client"],
): WorkspaceOnboardingExperimentArm {
  const experiment = getStatsigExperiment(
    client,
    __statsigName("codex_app_workspace_onboarding_flow_v3"),
  );
  const armFromParam = parseWorkspaceOnboardingExperimentArm(
    experiment.get(ARM_PARAM, null),
  );
  if (armFromParam !== "control") {
    return armFromParam;
  }

  if (
    "getGroupName" in experiment &&
    typeof experiment.getGroupName === "function"
  ) {
    return parseWorkspaceOnboardingExperimentArm(experiment.getGroupName());
  }

  return "control";
}

export function isCurrentWorkspaceOnboardingExperimentAssignment(
  assignment: WorkspaceOnboardingExperimentAssignment | null,
): assignment is WorkspaceOnboardingExperimentAssignment {
  return assignment?.experimentName === WORKSPACE_ONBOARDING_EXPERIMENT_NAME;
}

export function isWorkspaceOnboardingDirectPickerTreatment(
  arm: WorkspaceOnboardingExperimentArm,
): boolean {
  return arm === "t2_direct_folder_picker";
}

export function isWorkspaceOnboardingAutoPlaygroundTreatment(
  arm: WorkspaceOnboardingExperimentArm,
): boolean {
  return arm === "t3_auto_playground";
}

export function isWorkspaceOnboardingPlaygroundCtaTreatment(
  arm: WorkspaceOnboardingExperimentArm,
): boolean {
  return arm === "t4_modal_copy_cta_playground";
}

export function shouldUsePlaygroundOnSkip(
  arm: WorkspaceOnboardingExperimentArm,
): boolean {
  return (
    isWorkspaceOnboardingDirectPickerTreatment(arm) ||
    isWorkspaceOnboardingAutoPlaygroundTreatment(arm) ||
    isWorkspaceOnboardingPlaygroundCtaTreatment(arm)
  );
}
