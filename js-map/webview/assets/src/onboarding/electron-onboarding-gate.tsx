import { useAtomValue } from "jotai";
import { useScope } from "maitai";
import { useEffect, useRef, type ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { useWindowType } from "@/hooks/use-window-type";
import { messageBus } from "@/message-bus";
import {
  shouldSkipSelectWorkspacePageForOnboarding,
  useWorkspaceOnboardingGateExperimentController,
} from "@/onboarding/workspace-onboarding-controller";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { useFetchFromVSCode } from "@/vscode-api";

import { getOnboardingTarget } from "./get-onboarding-target";
import {
  aOnboardingOverride,
  aPostLoginWelcomePending,
} from "./onboarding-state";

const LOGIN_PATH = "/login";
const WELCOME_PATH = "/welcome";
const WORKSPACE_PATH = "/select-workspace";

export function ElectronOnboardingGate(): ReactElement {
  const windowType = useWindowType();
  const location = useLocation();
  const auth = useAuth();
  const scope = useScope(AppScope);
  const override = useAtomValue(aOnboardingOverride);
  const postLoginWelcomePending = useAtomValue(aPostLoginWelcomePending);
  const lastTrackedStepRef = useRef<ReturnType<typeof getStepFromPath>>(null);

  const shouldLoadWorkspaceRoots =
    windowType === "electron" &&
    (override !== "auto" ||
      auth.authMethod != null ||
      auth.requiresAuth === false);

  const workspaceRootOptionsQuery = useFetchFromVSCode(
    "workspace-root-options",
    {
      queryConfig: { enabled: shouldLoadWorkspaceRoots },
    },
  );

  const forcedOverride = override === "auto" ? null : override;
  const baseTarget = getOnboardingTarget({
    windowType,
    auth,
    workspaceRootsData: workspaceRootOptionsQuery.data,
    workspaceRootsIsLoading: workspaceRootOptionsQuery.isLoading,
    forcedOverride,
    postLoginWelcomePending,
    pathname: location.pathname,
  });
  const {
    workspaceOnboardingExperimentAssignment,
    workspaceOnboardingExperimentArm,
  } = useWorkspaceOnboardingGateExperimentController({
    windowType,
    onboardingTarget: baseTarget,
  });
  const target = shouldSkipSelectWorkspacePageForOnboarding({
    onboardingTarget: baseTarget,
    arm: workspaceOnboardingExperimentArm,
    isRemoteHost: false,
  })
    ? "app"
    : baseTarget;

  useEffect((): void => {
    if (windowType !== "electron") {
      return;
    }
    if (!target) {
      return;
    }
    const mode = target === "app" ? "app" : "onboarding";
    messageBus.dispatchMessage("electron-set-window-mode", { mode });
  }, [target, windowType]);

  useEffect((): void => {
    if (windowType !== "electron") {
      return;
    }
    const step = getStepFromPath(location.pathname);
    if (!step) {
      lastTrackedStepRef.current = null;
      return;
    }
    if (lastTrackedStepRef.current === step) {
      return;
    }
    lastTrackedStepRef.current = step;
    const experimentArm =
      step === "workspace" ? workspaceOnboardingExperimentArm : undefined;
    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_step_viewed",
      metadata:
        experimentArm == null
          ? { step }
          : {
              step,
              experiment_arm: experimentArm,
            },
    });
  }, [
    location.pathname,
    scope,
    windowType,
    workspaceOnboardingExperimentArm,
    workspaceOnboardingExperimentAssignment?.arm,
  ]);

  if (!target) {
    return <></>;
  }

  const path = location.pathname;
  const isOnboardingPath =
    path === LOGIN_PATH || path === WELCOME_PATH || path === WORKSPACE_PATH;

  if (windowType === "electron") {
    if (target === "login" && path !== LOGIN_PATH) {
      return <Navigate to={LOGIN_PATH} replace />;
    }
    if (target === "welcome" && path !== WELCOME_PATH) {
      return <Navigate to={WELCOME_PATH} replace />;
    }
    if (target === "workspace" && path !== WORKSPACE_PATH) {
      return <Navigate to={WORKSPACE_PATH} replace />;
    }
    if (target === "app" && isOnboardingPath) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

function getStepFromPath(
  pathname: string,
): "login" | "welcome" | "workspace" | null {
  if (pathname === LOGIN_PATH) {
    return "login";
  }
  if (pathname === WELCOME_PATH) {
    return "welcome";
  }
  if (pathname === WORKSPACE_PATH) {
    return "workspace";
  }
  return null;
}
