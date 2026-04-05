import { persistedAtom } from "@/utils/persisted-atom";

import type { WorkspaceOnboardingExperimentAssignment } from "./workspace-onboarding-experiment";

export type OnboardingTarget = "login" | "welcome" | "workspace" | "app";
export type OnboardingOverride = OnboardingTarget | "auto";

export const aOnboardingOverride = persistedAtom<OnboardingOverride>(
  "electron:onboarding-override",
  "auto",
);

export const aPostLoginWelcomePending = persistedAtom<boolean>(
  "electron:onboarding-welcome-pending",
  false,
);

export const aWorkspaceOnboardingExperimentAssignment =
  persistedAtom<WorkspaceOnboardingExperimentAssignment | null>(
    "electron:onboarding-workspace-experiment-assignment",
    null,
  );

export const aWorkspaceOnboardingAutoLaunchApplied = persistedAtom<boolean>(
  "electron:onboarding-workspace-autolaunch-applied",
  false,
);
