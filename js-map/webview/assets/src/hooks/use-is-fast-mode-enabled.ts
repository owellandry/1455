import { useAuth } from "@/auth/use-auth";
import { useSharedObject } from "@/shared-objects/use-shared-object";

export function useIsFastModeEnabled(): boolean {
  const { authMethod } = useAuth();
  const [featureOverrides] = useSharedObject("statsig_default_enable_features");
  return (
    featureOverrides?.fast_mode === true &&
    isFastModeAllowedForAuthMethod(authMethod)
  );
}

export function isFastModeAllowedForAuthMethod(
  authMethod: string | null | undefined,
): boolean {
  return authMethod === "chatgpt";
}

export function useCanUseFastMode(): boolean {
  return useIsFastModeEnabled();
}
