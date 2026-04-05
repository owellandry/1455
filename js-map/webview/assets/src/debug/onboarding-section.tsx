import clsx from "clsx";
import { useAtom } from "jotai";
import { useScope, useSignal } from "maitai";
import type React from "react";
import { useState } from "react";

import { useAuth } from "@/auth/use-auth";
import { useWindowType } from "@/hooks/use-window-type";
import {
  aOnboardingOverride,
  aWorkspaceOnboardingExperimentAssignment,
  type OnboardingOverride,
} from "@/onboarding/onboarding-state";
import {
  WORKSPACE_ONBOARDING_EXPERIMENT_NAME,
  type WorkspaceOnboardingExperimentArm,
} from "@/onboarding/workspace-onboarding-experiment";
import { hasSeenRemoteConnectionsHomeAnnouncement$ } from "@/remote-connections/onboarding/remote-connections-onboarding-signals";
import { AppScope } from "@/scopes/app-scope";
import { useFetchFromVSCode } from "@/vscode-api";

import { DebugSection } from "./debug-section";

type OverrideOption = {
  value: OnboardingOverride;
  label: string;
};

type ExperimentOverrideOption = {
  value: WorkspaceOnboardingExperimentArm | "auto";
  label: string;
};

export function OnboardingSection(): React.ReactElement | null {
  const windowType = useWindowType();
  const auth = useAuth();
  const scope = useScope(AppScope);
  const [override, setOverride] = useAtom(aOnboardingOverride);
  const [
    workspaceOnboardingExperimentAssignment,
    setWorkspaceOnboardingExperimentAssignment,
  ] = useAtom(aWorkspaceOnboardingExperimentAssignment);
  const hasSeenRemoteConnectionsHomeAnnouncement =
    useSignal(hasSeenRemoteConnectionsHomeAnnouncement$) ?? false;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const rootsQuery = useFetchFromVSCode("workspace-root-options", {
    queryConfig: { enabled: isOpen && windowType === "electron" },
  });
  const rootsCount = rootsQuery.data?.roots.length ?? 0;

  const options: Array<OverrideOption> = [
    {
      value: "auto",
      label: "Auto",
    },
    {
      value: "login",
      label: "Login",
    },
    {
      value: "welcome",
      label: "Welcome",
    },
    {
      value: "workspace",
      label: "Project",
    },
    {
      value: "app",
      label: "App",
    },
  ];
  const experimentOptions: Array<ExperimentOverrideOption> = [
    { value: "auto", label: "Auto" },
    { value: "control", label: "Control" },
    { value: "t2_direct_folder_picker", label: "T2 Picker" },
    { value: "t3_auto_playground", label: "T3 Playground" },
    { value: "t4_modal_copy_cta_playground", label: "T4 Copy+CTA" },
  ];
  const activeExperimentOverride =
    workspaceOnboardingExperimentAssignment?.arm ?? "auto";

  if (windowType !== "electron") {
    return null;
  }

  return (
    <DebugSection
      storageKey="debug-onboarding"
      title="Onboarding"
      onToggle={setIsOpen}
      variant="global"
    >
      {!isOpen ? null : (
        <div className="flex flex-col gap-3 pb-4">
          <div className="text-xs text-token-description-foreground">
            {`Auth: ${auth.authMethod ?? "none"} · Projects: ${rootsCount}`}
          </div>

          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={clsx(
                  "rounded border px-3 py-1 text-xs",
                  option.value === override
                    ? "border-token-focus-border text-token-foreground"
                    : "border-token-border text-token-description-foreground hover:bg-token-foreground/5",
                )}
                onClick={() => setOverride(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs text-token-description-foreground">
              {`Workspace onboarding experiment: ${activeExperimentOverride}`}
            </div>
            <div className="flex flex-wrap gap-2">
              {experimentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={clsx(
                    "rounded border px-3 py-1 text-xs",
                    option.value === activeExperimentOverride
                      ? "border-token-focus-border text-token-foreground"
                      : "border-token-border text-token-description-foreground hover:bg-token-foreground/5",
                  )}
                  onClick={() => {
                    if (option.value === "auto") {
                      setWorkspaceOnboardingExperimentAssignment(null);
                      return;
                    }
                    setWorkspaceOnboardingExperimentAssignment({
                      arm: option.value,
                      assignedAtMs: Date.now(),
                      experimentName: WORKSPACE_ONBOARDING_EXPERIMENT_NAME,
                    });
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="text-token-description-foreground">
              {`Remote Connections home announcement: ${
                hasSeenRemoteConnectionsHomeAnnouncement ? "seen" : "unseen"
              }`}
            </div>
            <button
              type="button"
              className="rounded border border-token-border px-3 py-1 text-token-description-foreground hover:bg-token-foreground/5"
              onClick={() => {
                scope.set(hasSeenRemoteConnectionsHomeAnnouncement$, false);
              }}
            >
              Reset announcement
            </button>
          </div>
        </div>
      )}
    </DebugSection>
  );
}
