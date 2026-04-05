import { useExperimentalFeatures } from "@/queries/experimental-features-queries";

export const PLUGINS_EXPERIMENTAL_FEATURE_NAME = "plugins";

export function useIsPluginsEnabled(): boolean {
  const { data: experimentalFeatures = [] } = useExperimentalFeatures();

  return experimentalFeatures.some((feature) => {
    return (
      feature.name === PLUGINS_EXPERIMENTAL_FEATURE_NAME && feature.enabled
    );
  });
}
