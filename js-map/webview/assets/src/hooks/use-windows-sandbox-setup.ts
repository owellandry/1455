import type * as AppServer from "app-server-types";
import { atom, useAtom, useStore } from "jotai";
import { ConfigurationKeys } from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { aAgentMode } from "@/composer/composer-atoms";
import { useConfiguration } from "@/hooks/use-configuration";
import { messageBus } from "@/message-bus";
import { useSetWindowsSandboxMode } from "@/queries/windows-sandbox-queries";

export type WindowsSandboxSetupPhase =
  | "idle"
  | "startingElevated"
  | "waitingElevated"
  | "retryUnelevated"
  | "startingUnelevated"
  | "waitingUnelevated"
  | "failed";

type WindowsSandboxSetupState = {
  phase: WindowsSandboxSetupPhase;
  error: string | null;
};

const WINDOWS_SANDBOX_SETUP_START_FAILED_MESSAGE =
  "Windows sandbox setup did not start.";
const WINDOWS_SANDBOX_SETUP_DELAY_MS = 500;

const aWindowsSandboxSetupState = atom<WindowsSandboxSetupState>({
  phase: "idle",
  error: null,
});

export function isWindowsSandboxSetupPending(
  phase: WindowsSandboxSetupPhase,
): boolean {
  return (
    phase === "startingElevated" ||
    phase === "waitingElevated" ||
    phase === "startingUnelevated" ||
    phase === "waitingUnelevated"
  );
}

function getSetupErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Windows sandbox setup failed.";
  }
  if (error.message.trim().length === 0) {
    return "Windows sandbox setup failed.";
  }
  return error.message;
}

export function getFailedWindowsSandboxSetupPhase(
  mode: AppServer.v2.WindowsSandboxSetupMode,
): WindowsSandboxSetupPhase {
  return mode === "elevated" ? "retryUnelevated" : "failed";
}

export function getNextWindowsSandboxSetupMode(
  phase: WindowsSandboxSetupPhase,
): AppServer.v2.WindowsSandboxSetupMode {
  return phase === "retryUnelevated" || phase === "failed"
    ? "unelevated"
    : "elevated";
}

export function useWindowsSandboxSetup(
  appServerManager?: AppServerManager,
  cwd?: string | null,
): {
  phase: WindowsSandboxSetupPhase;
  error: string | null;
  isPending: boolean;
  startNext: () => Promise<AppServer.v2.WindowsSandboxSetupMode | null>;
  resetError: () => void;
  finalizeEnable: (params: {
    sandboxMode: AppServer.v2.WindowsSandboxSetupMode;
    postEnableDelayMs?: number;
    setAgentModeAuto?: boolean;
  }) => Promise<void>;
} {
  const defaultAppServerManager = useDefaultAppServerManager();
  const activeAppServerManager = appServerManager ?? defaultAppServerManager;
  const [setupState, setSetupState] = useAtom(aWindowsSandboxSetupState);
  const store = useStore();
  const writeWindowsSandboxMode = useSetWindowsSandboxMode(
    activeAppServerManager,
  );
  const { data: runInWslEnabled, setData: setRunInWsl } = useConfiguration(
    ConfigurationKeys.RUN_CODEX_IN_WSL,
  );
  const [, setAgentMode] = useAtom(aAgentMode);

  const startSetup = async (
    mode: AppServer.v2.WindowsSandboxSetupMode,
  ): Promise<AppServer.v2.WindowsSandboxSetupMode | null> => {
    const currentSetupState = store.get(aWindowsSandboxSetupState);
    if (isWindowsSandboxSetupPending(currentSetupState.phase)) {
      return null;
    }

    const isUnelevated = mode === "unelevated";
    setSetupState({
      phase: isUnelevated ? "startingUnelevated" : "startingElevated",
      error: null,
    });

    try {
      const response = await activeAppServerManager.startWindowsSandboxSetup(
        mode,
        cwd,
      );
      if (!response.started || !response.completion) {
        setSetupState({
          phase: getFailedWindowsSandboxSetupPhase(mode),
          error: WINDOWS_SANDBOX_SETUP_START_FAILED_MESSAGE,
        });
        return null;
      }

      setSetupState({
        phase: isUnelevated ? "waitingUnelevated" : "waitingElevated",
        error: null,
      });

      const completion = await response.completion;
      if (completion.success) {
        return mode;
      }

      setSetupState({
        phase: getFailedWindowsSandboxSetupPhase(mode),
        error: completion.error ?? "Windows sandbox setup failed.",
      });
      return null;
    } catch (error) {
      setSetupState({
        phase: getFailedWindowsSandboxSetupPhase(mode),
        error: getSetupErrorMessage(error),
      });
      return null;
    }
  };

  const resetError = (): void => {
    if (isWindowsSandboxSetupPending(setupState.phase)) {
      return;
    }
    setSetupState({ phase: "idle", error: null });
  };

  const finalizeEnable = async ({
    sandboxMode,
    postEnableDelayMs = WINDOWS_SANDBOX_SETUP_DELAY_MS,
    setAgentModeAuto = false,
  }: {
    sandboxMode: AppServer.v2.WindowsSandboxSetupMode;
    postEnableDelayMs?: number;
    setAgentModeAuto?: boolean;
  }): Promise<void> => {
    try {
      await writeWindowsSandboxMode.mutateAsync(sandboxMode);
      if (setAgentModeAuto) {
        setAgentMode("auto");
      }
      setSetupState({ phase: "idle", error: null });
      if (runInWslEnabled === true) {
        await setRunInWsl(false);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, postEnableDelayMs);
        });
        return;
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, postEnableDelayMs);
      });
      messageBus.dispatchMessage("codex-app-server-restart", {
        hostId: activeAppServerManager.getHostId(),
      });
    } catch (error) {
      setSetupState({
        phase: "failed",
        error: getSetupErrorMessage(error),
      });
      throw error;
    }
  };

  return {
    phase: setupState.phase,
    error: setupState.error,
    isPending: isWindowsSandboxSetupPending(setupState.phase),
    startNext: () =>
      startSetup(
        getNextWindowsSandboxSetupMode(
          store.get(aWindowsSandboxSetupState).phase,
        ),
      ),
    resetError,
    finalizeEnable,
  };
}
