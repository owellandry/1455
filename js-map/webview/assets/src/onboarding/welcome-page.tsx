import { useAtomValue, useSetAtom } from "jotai";
import { useScope } from "maitai";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { AnimatedIcon } from "@/components/animated-icon";
import { Button } from "@/components/button";
import {
  aOnboardingOverride,
  aWorkspaceOnboardingExperimentAssignment,
} from "@/onboarding/onboarding-state";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { AccountPlanType, isDoubleRateLimitPlan } from "@/utils/skus";
import { useFetchFromVSCode } from "@/vscode-api";

import { OnboardingContentFrame, OnboardingShell } from "./onboarding-shell";
import { aPostLoginWelcomePending } from "./onboarding-state";

export function WelcomePage(): ReactElement | null {
  const { data: workspaceRootOptions } = useFetchFromVSCode(
    "workspace-root-options",
    {
      placeholderData: { roots: [], labels: {} },
    },
  );
  const scope = useScope(AppScope);
  const navigate = useNavigate();
  const setPostLoginWelcomePending = useSetAtom(aPostLoginWelcomePending);
  const onboardingOverride = useAtomValue(aOnboardingOverride);
  const workspaceOnboardingExperimentAssignment = useAtomValue(
    aWorkspaceOnboardingExperimentAssignment,
  );
  const { planAtLogin } = useAuth();
  const shouldForceWelcome = onboardingOverride === "welcome";

  const rootsCount = workspaceRootOptions?.roots.length ?? 0;

  const handleContinue = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_welcome_continue_clicked",
      metadata: {
        workspaces_count: rootsCount,
        experiment_arm: workspaceOnboardingExperimentAssignment?.arm,
      },
    });
    setPostLoginWelcomePending(false);
    void navigate("/select-workspace", { replace: true });
  };

  let shouldRedirectToWorkspace = rootsCount > 0 && !shouldForceWelcome;
  let welcomeMessage: ReactElement | null = null;
  if (!shouldRedirectToWorkspace) {
    if (
      !shouldForceWelcome &&
      (planAtLogin === AccountPlanType.FREE.valueOf() ||
        planAtLogin === AccountPlanType.GO.valueOf())
    ) {
      shouldRedirectToWorkspace = true;
    } else if (isDoubleRateLimitPlan(planAtLogin)) {
      welcomeMessage = (
        <FormattedMessage
          id="electron.onboarding.welcome.doubleLimits.description"
          defaultMessage="In celebration of the Codex app launch, you have 2× rate limits through April 2."
          description="Description shown after login for users with double rate limits"
        />
      );
    } else if (shouldForceWelcome) {
      welcomeMessage = (
        <FormattedMessage
          id="electron.onboarding.welcome.debugFallback.description"
          defaultMessage="Debug override is forcing the welcome screen. Continue to test the onboarding flow."
          description="Fallback welcome copy shown when the debug welcome override is enabled and no campaign copy applies"
        />
      );
    } else {
      shouldRedirectToWorkspace = true;
    }
  }

  useEffect((): void => {
    if (!shouldRedirectToWorkspace) {
      return;
    }
    setPostLoginWelcomePending(false);
    void navigate("/select-workspace", { replace: true });
  }, [navigate, setPostLoginWelcomePending, shouldRedirectToWorkspace]);

  if (shouldRedirectToWorkspace) {
    return null;
  }

  return (
    <OnboardingShell>
      <OnboardingContentFrame
        className="max-w-[360px]"
        icon={<AnimatedIcon animation="hello" size={52} />}
        textClassName="gap-3 px-6 pt-2"
        title={
          <FormattedMessage
            id="electron.onboarding.welcome.new.title.anon"
            defaultMessage="Welcome!"
            description="Title shown after login for new users"
          />
        }
        subtitle={welcomeMessage}
        subtitleClassName="max-w-[290px]"
      >
        <Button
          className="w-[168px] justify-center px-[16px] py-[8px] text-[13px] leading-6 font-medium"
          color="primary"
          size="default"
          onClick={handleContinue}
        >
          <FormattedMessage
            id="electron.onboarding.welcome.continue"
            defaultMessage="Continue"
            description="Button label to continue from the post-login welcome screen"
          />
        </Button>
      </OnboardingContentFrame>
    </OnboardingShell>
  );
}
