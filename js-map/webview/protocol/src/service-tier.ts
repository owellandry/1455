import type { ServiceTier } from "app-server-types";

export const DEFAULT_SERVICE_TIER_PERSISTED_ATOM_KEY = "default-service-tier";

export function coerceServiceTier(serviceTier: unknown): ServiceTier | null {
  switch (serviceTier) {
    case "fast":
    case "flex":
      return serviceTier;
    default:
      return null;
  }
}

export function parsePersistedServiceTier(
  persistedState: unknown,
): ServiceTier | null {
  if (!persistedState || typeof persistedState !== "object") {
    return null;
  }
  return coerceServiceTier(
    (persistedState as Record<string, unknown>)[
      DEFAULT_SERVICE_TIER_PERSISTED_ATOM_KEY
    ],
  );
}
