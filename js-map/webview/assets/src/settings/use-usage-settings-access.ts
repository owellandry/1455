import { useAuth } from "@/auth/use-auth";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { AccountPlanType } from "@/utils/skus";
import { useFetchFromVSCode } from "@/vscode-api";

type UsageSettingsAccess = {
  isUsageSettingsVisible: boolean;
  isUsageSettingsAccessLoading: boolean;
};

export function useUsageSettingsAccess(): UsageSettingsAccess {
  const { authMethod, isLoading: isAuthLoading } = useAuth();
  const isChatGptAuth = authMethod === "chatgpt";
  const { data: accountInfo, isLoading: isAccountInfoLoading } =
    useFetchFromVSCode("account-info", {
      queryConfig: {
        enabled: isChatGptAuth,
        staleTime: QUERY_STALE_TIME.ONE_MINUTE,
      },
    });
  const isUsageSettingsAccessLoading =
    isAuthLoading || (isChatGptAuth && isAccountInfoLoading);

  return {
    isUsageSettingsVisible:
      isChatGptAuth &&
      (accountInfo?.plan === AccountPlanType.PLUS ||
        accountInfo?.plan === AccountPlanType.PRO ||
        accountInfo?.plan === AccountPlanType.PROLITE),
    isUsageSettingsAccessLoading,
  };
}
