import type { ReactElement } from "react";

import { useWindowType } from "@/hooks/use-window-type";
import { SignInPage } from "@/sign-in/sign-in";

import { OnboardingLoginPage } from "./onboarding-login-page";

export function LoginRoute(): ReactElement {
  const windowType = useWindowType();
  if (windowType === "electron") {
    return <OnboardingLoginPage />;
  }
  return <SignInPage />;
}
