import type { ServiceTier } from "app-server-types";

/**
 * Shared source of truth for service tiers exposed in Codex product UI.
 * `flex` stays out of this list unless we intentionally decide to launch it
 * as part of the 1P experience.
 */
export const USER_VISIBLE_SERVICE_TIER_OPTIONS = [
  null,
  "fast",
] as const satisfies ReadonlyArray<ServiceTier | null>;

export type UserVisibleServiceTier =
  (typeof USER_VISIBLE_SERVICE_TIER_OPTIONS)[number];
