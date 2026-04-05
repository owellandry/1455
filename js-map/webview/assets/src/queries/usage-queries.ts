import type { components } from "@oai/sa-server-client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { RateLimitStatusPayload } from "protocol";

import { fetchRateLimitStatus, useCurrentAccount } from "@/codex-api";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { CodexRequest } from "@/utils/request";
import { FetchError } from "@/web-fetch-wrapper";

import { isImmediateTopUpFailureStatus } from "./auto-top-up-settings-utils";
import type { AutoTopUpSettings } from "./usage-settings-types";

export type AutoTopUpSettingsMutationResponse =
  components["schemas"]["AutoTopUpSettingsResponse"];
type AutoTopUpEnableApiRequest =
  components["schemas"]["EnableAutoTopUpRequest"];
type AutoTopUpUpdateApiRequest =
  components["schemas"]["UpdateAutoTopUpRequest"];
export type AutoTopUpSaveRequest = AutoTopUpEnableApiRequest;
export type AutoTopUpPricingInfo = {
  amountPerCredit: number;
  currencyCode: string;
  minorUnitExponent: number | null;
};

type CheckoutPricingCountryConfigApiResponse = {
  currency_config?: {
    amount_per_credit?: number;
    minor_unit_exponent?: number | null;
    symbol_code?: string;
  };
};

const AUTO_TOP_UP_SETTINGS_QUERY_KEY = ["usage-settings", "auto-top-up"];
const AUTO_TOP_UP_BILLING_CURRENCY_QUERY_KEY = [
  "usage-settings",
  "auto-top-up-billing-currency",
];
const AUTO_TOP_UP_PRICING_QUERY_KEY = ["usage-settings", "auto-top-up-pricing"];
const RATE_LIMIT_STATUS_QUERY_KEY = ["rate-limit-status"];
const ACCOUNTS_CHECK_V4_VERSION = "v4-2023-04-27";

export function useRateLimit(
  isQueryEnabled = true,
): UseQueryResult<RateLimitStatusPayload | null, Error> {
  return useQuery({
    queryKey: RATE_LIMIT_STATUS_QUERY_KEY,
    enabled: isQueryEnabled,
    queryFn: async () => {
      try {
        return await fetchRateLimitStatus();
      } catch (error) {
        if (
          error instanceof FetchError &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          // Treat unauthorized/forbidden/not-found as no available rate limit snapshot.
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: isQueryEnabled,
    refetchOnReconnect: isQueryEnabled,
    refetchOnMount: isQueryEnabled ? "always" : false,
    refetchInterval: QUERY_STALE_TIME.ONE_MINUTE,
  });
}

export function useAutoTopUpSettingsQuery({
  enabled,
}: {
  enabled: boolean;
}): UseQueryResult<AutoTopUpSettings, Error> {
  return useQuery({
    queryKey: AUTO_TOP_UP_SETTINGS_QUERY_KEY,
    queryFn: fetchAutoTopUpSettings,
    enabled,
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    refetchOnWindowFocus: false,
    select: mapAutoTopUpSettingsFromApi,
  });
}

export function useAutoTopUpBillingCurrency({
  enabled,
}: {
  enabled: boolean;
}): UseQueryResult<string | null, Error> {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } =
    useCurrentAccount();

  return useQuery({
    queryKey: [
      ...AUTO_TOP_UP_BILLING_CURRENCY_QUERY_KEY,
      currentAccount?.id ?? null,
    ],
    enabled: enabled && !isCurrentAccountLoading && currentAccount != null,
    staleTime: QUERY_STALE_TIME.INFINITE,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: () =>
      CodexRequest.safeGet("/accounts/check/{version}", {
        parameters: {
          path: {
            version: ACCOUNTS_CHECK_V4_VERSION,
          },
        },
      }),
    select: (accountCheck) => {
      if (currentAccount) {
        return (
          accountCheck.accounts?.[currentAccount.id]?.entitlement
            ?.billing_currency ?? null
        );
      }
      return null;
    },
  });
}

export function useAutoTopUpPricingInfo({
  billingCurrency,
  enabled,
}: {
  billingCurrency: string | null | undefined;
  enabled: boolean;
}): UseQueryResult<AutoTopUpPricingInfo | null, Error> {
  return useQuery({
    queryKey: [...AUTO_TOP_UP_PRICING_QUERY_KEY, billingCurrency ?? null],
    enabled: enabled && billingCurrency != null,
    staleTime: QUERY_STALE_TIME.INFINITE,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      if (billingCurrency == null) {
        return null;
      }

      const pricingConfig: CheckoutPricingCountryConfigApiResponse =
        await CodexRequest.safeGet(
          "/checkout_pricing_config/configs/{country_code}",
          {
            parameters: {
              path: {
                country_code: billingCurrency,
              },
            },
          },
        );

      const amountPerCredit = pricingConfig.currency_config?.amount_per_credit;
      if (amountPerCredit == null || amountPerCredit <= 0) {
        return null;
      }

      return {
        amountPerCredit,
        currencyCode:
          pricingConfig.currency_config?.symbol_code ?? billingCurrency,
        minorUnitExponent:
          pricingConfig.currency_config?.minor_unit_exponent ?? null,
      };
    },
  });
}

export function useAutoTopUpSettingsMutations(): {
  enableAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    AutoTopUpSaveRequest
  >;
  updateAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    AutoTopUpSaveRequest
  >;
  disableAutoTopUpMutation: UseMutationResult<
    AutoTopUpSettingsMutationResponse,
    Error,
    void
  >;
} {
  const queryClient = useQueryClient();
  const enableAutoTopUpMutation = useMutation({
    mutationKey: [...AUTO_TOP_UP_SETTINGS_QUERY_KEY, "enable"],
    mutationFn: (payload: AutoTopUpSaveRequest) => {
      return enableAutoTopUpSettings(payload);
    },
    onSuccess: (response) => {
      if (isImmediateTopUpFailureStatus(response.immediate_top_up_status)) {
        return;
      }
      syncAutoTopUpSettingsResponse({
        queryClient,
        response,
      });
    },
  });
  const updateAutoTopUpMutation = useMutation({
    mutationKey: [...AUTO_TOP_UP_SETTINGS_QUERY_KEY, "update"],
    mutationFn: (payload: AutoTopUpSaveRequest) => {
      return updateAutoTopUpSettings(payload);
    },
    onSuccess: (response) => {
      if (isImmediateTopUpFailureStatus(response.immediate_top_up_status)) {
        return;
      }
      syncAutoTopUpSettingsResponse({
        queryClient,
        response,
      });
    },
  });
  const disableAutoTopUpMutation = useMutation({
    mutationKey: [...AUTO_TOP_UP_SETTINGS_QUERY_KEY, "disable"],
    mutationFn: () => {
      return disableAutoTopUpSettings();
    },
    onSuccess: (response) => {
      syncAutoTopUpSettingsResponse({
        queryClient,
        response,
      });
    },
  });

  return {
    enableAutoTopUpMutation,
    updateAutoTopUpMutation,
    disableAutoTopUpMutation,
  };
}

function syncAutoTopUpSettingsResponse({
  queryClient,
  response,
}: {
  queryClient: QueryClient;
  response: AutoTopUpSettingsMutationResponse;
}): void {
  queryClient.setQueryData<AutoTopUpSettingsMutationResponse>(
    AUTO_TOP_UP_SETTINGS_QUERY_KEY,
    response,
  );
  if (response.immediate_top_up_status === "succeeded") {
    void queryClient.invalidateQueries({
      queryKey: RATE_LIMIT_STATUS_QUERY_KEY,
    });
  }
}

async function fetchAutoTopUpSettings(): Promise<AutoTopUpSettingsMutationResponse> {
  return CodexRequest.safeGet("/subscriptions/auto_top_up/settings");
}

async function enableAutoTopUpSettings(
  payload: AutoTopUpSaveRequest,
): Promise<AutoTopUpSettingsMutationResponse> {
  return CodexRequest.safePost("/subscriptions/auto_top_up/enable", {
    requestBody: payload,
  });
}

async function updateAutoTopUpSettings(
  payload: AutoTopUpSaveRequest,
): Promise<AutoTopUpSettingsMutationResponse> {
  const requestBody: AutoTopUpUpdateApiRequest = {
    recharge_threshold: payload.recharge_threshold,
    recharge_target: payload.recharge_target,
  };
  return CodexRequest.safePost("/subscriptions/auto_top_up/update", {
    requestBody,
  });
}

async function disableAutoTopUpSettings(): Promise<AutoTopUpSettingsMutationResponse> {
  return CodexRequest.safePost("/subscriptions/auto_top_up/disable");
}

function mapAutoTopUpSettingsFromApi(
  response: AutoTopUpSettingsMutationResponse,
): AutoTopUpSettings {
  return {
    isEnabled: response.is_enabled,
    rechargeThreshold: response.recharge_threshold ?? null,
    rechargeTarget: response.recharge_target ?? null,
  };
}
