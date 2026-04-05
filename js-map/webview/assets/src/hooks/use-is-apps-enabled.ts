import { useExperimentalFeatures } from "@/queries/experimental-features-queries";

export function useIsAppsEnabled(): boolean {
  const { data: experimentalFeatures = [] } = useExperimentalFeatures();

  return experimentalFeatures.some((feature) => {
    return feature.name === "apps" && feature.enabled;
  });
}
