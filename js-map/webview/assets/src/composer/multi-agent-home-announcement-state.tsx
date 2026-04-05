import { useAtom } from "jotai";

import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useExperimentalFeatures } from "@/queries/experimental-features-queries";
import { persistedAtom } from "@/utils/persisted-atom";

const MULTI_AGENT_FEATURE_NAME = "multi_agent";
export const aHasSeenMultiAgentComposerBanner = persistedAtom<boolean>(
  "has-seen-multi-agent-composer-banner",
  false,
);

export function useMultiAgentHomeAnnouncementState(): {
  isEligible: boolean;
  isLoading: boolean;
} {
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const [hasSeenMultiAgentComposerBanner] = useAtom(
    aHasSeenMultiAgentComposerBanner,
  );
  const {
    data: experimentalFeatures,
    isLoading: isExperimentalFeaturesLoading,
  } = useExperimentalFeatures();
  const isMultiAgentEnabled =
    experimentalFeatures?.some((feature) => {
      return feature.name === MULTI_AGENT_FEATURE_NAME && feature.enabled;
    }) ?? false;
  const isLoading =
    isBackgroundSubagentsEnabled &&
    !hasSeenMultiAgentComposerBanner &&
    isExperimentalFeaturesLoading;

  return {
    isEligible:
      isBackgroundSubagentsEnabled &&
      !hasSeenMultiAgentComposerBanner &&
      !isMultiAgentEnabled,
    isLoading,
  };
}
