import { useExperimentalFeatures } from "@/queries/experimental-features-queries";
import { useGate } from "@/statsig/statsig";

export const THREAD_REALTIME_EXPERIMENTAL_FEATURE_NAME =
  "realtime_conversation";
export const THREAD_REALTIME_GATE = __statsigName(
  "codex-app-realtime-conversation",
);
const EXPERIMENTAL_SETTINGS_GATE = __statsigName(
  "codex_app_experimental_settings",
);

export function useIsThreadRealtimeEnabled(): boolean {
  const isExperimentalSettingsEnabled = useGate(EXPERIMENTAL_SETTINGS_GATE);
  const isThreadRealtimeGateEnabled = useGate(THREAD_REALTIME_GATE);
  const { data: experimentalFeatures = [] } = useExperimentalFeatures();

  return (
    isExperimentalSettingsEnabled &&
    isThreadRealtimeGateEnabled &&
    experimentalFeatures.some((feature) => {
      return (
        feature.name === THREAD_REALTIME_EXPERIMENTAL_FEATURE_NAME &&
        feature.enabled
      );
    })
  );
}
