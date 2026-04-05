import type { ServiceTier } from "app-server-types";
import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import { useCallback } from "react";

import { productEventLogger$ } from "@/product-event-signal";
import type {
  ServiceTierAnalyticsValue,
  ServiceTierChangeSource,
} from "@/product-events";
import { AppScope } from "@/scopes/app-scope";
import {
  useDefaultServiceTier,
  useSetDefaultServiceTier,
} from "@/utils/local-service-tier";
import { logger } from "@/utils/logger";
import { coerceServiceTier } from "@/utils/service-tier";

export type ServiceTierSettings = {
  serviceTier: ServiceTier | null;
  isLoading: boolean;
};

export type ServiceTierSettingsChangeHandler = {
  serviceTierSettings: ServiceTierSettings;
  setServiceTier: (
    serviceTier: ServiceTier | null,
    source: ServiceTierChangeSource,
  ) => Promise<void>;
};

export function useServiceTierSettings(
  _conversationId: ConversationId | null = null,
): ServiceTierSettingsChangeHandler {
  const defaultServiceTier = useDefaultServiceTier();
  const setDefaultServiceTier = useSetDefaultServiceTier();
  const scope = useScope(AppScope);
  const currentServiceTier = coerceServiceTier(defaultServiceTier.serviceTier);

  const setServiceTier = useCallback(
    async (
      serviceTier: ServiceTier | null,
      source: ServiceTierChangeSource,
    ) => {
      const nextServiceTier = coerceServiceTier(serviceTier);
      const previousServiceTier: ServiceTierAnalyticsValue =
        currentServiceTier ?? "standard";
      const serviceTierForEvent: ServiceTierAnalyticsValue =
        nextServiceTier ?? "standard";

      try {
        setDefaultServiceTier(nextServiceTier);
      } catch (err) {
        logger.error(`Failed to set default service tier`, {
          safe: {},
          sensitive: {
            error: err,
          },
        });
        return;
      }

      scope.get(productEventLogger$).log({
        eventName: "codex_service_tier_changed",
        metadata: {
          previous_service_tier: previousServiceTier,
          service_tier: serviceTierForEvent,
          source,
        },
      });
    },
    [scope, currentServiceTier, setDefaultServiceTier],
  );

  return {
    serviceTierSettings: defaultServiceTier,
    setServiceTier,
  };
}
