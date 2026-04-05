import type { AuthContextValue } from "@/auth/auth-context";

import type { OnboardingTarget } from "./onboarding-state";

const LOGIN_PATH = "/login";
const WELCOME_PATH = "/welcome";

export function getOnboardingTarget({
  windowType,
  auth,
  workspaceRootsData,
  workspaceRootsIsLoading,
  forcedOverride,
  postLoginWelcomePending,
  pathname,
}: {
  windowType: string;
  auth: AuthContextValue;
  workspaceRootsData: { roots: Array<unknown> } | undefined;
  workspaceRootsIsLoading: boolean;
  forcedOverride: OnboardingTarget | null;
  postLoginWelcomePending: boolean;
  pathname: string;
}): OnboardingTarget | null {
  if (windowType !== "electron") {
    return "app";
  }
  if (forcedOverride) {
    return forcedOverride;
  }
  if (auth.isLoading) {
    return null;
  }
  if (!auth.authMethod && auth.requiresAuth) {
    return "login";
  }
  const shouldShowWelcome =
    postLoginWelcomePending &&
    (pathname === LOGIN_PATH || pathname === WELCOME_PATH);
  if (shouldShowWelcome) {
    return "welcome";
  }
  if (workspaceRootsIsLoading) {
    return null;
  }
  if ((workspaceRootsData?.roots ?? []).length === 0) {
    return "workspace";
  }
  return "app";
}
