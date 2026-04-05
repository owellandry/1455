import type * as AppServer from "app-server-types";

type FeatureOverrides = Record<string, boolean> | null | undefined;

const FEATURE_CONFIG_PREFIX = "features.";

export function normalizeFeatureOverrideKey(key: string): string {
  return key.startsWith(FEATURE_CONFIG_PREFIX)
    ? key
    : `${FEATURE_CONFIG_PREFIX}${key}`;
}

export function stripFeatureOverrideKeyPrefix(key: string): string {
  return key.startsWith(FEATURE_CONFIG_PREFIX)
    ? key.slice(FEATURE_CONFIG_PREFIX.length)
    : key;
}

export function applyFeatureOverridesToThreadStartParams(
  params: AppServer.v2.ThreadStartParams,
  overrides: FeatureOverrides,
): AppServer.v2.ThreadStartParams {
  if (!overrides || Object.keys(overrides).length === 0) {
    return params;
  }
  return {
    ...params,
    config: {
      ...buildFeatureOverrideConfig(overrides),
      ...params.config,
    },
  };
}

/**
 * Filters desktop-app feature overrides before they are attached to thread start.
 * On Windows, the Codex App must not opt threads into unified_exec because the
 * CLI/app-server does not yet support sandbox + unified_exec.
 */
export function filterFeatureOverridesForDesktopThreadStart(
  overrides: FeatureOverrides,
  platform: string,
): Record<string, boolean> | null | undefined {
  if (!overrides || typeof overrides !== "object") {
    return undefined;
  }

  if (platform !== "win32") {
    return overrides;
  }

  const filteredEntries = Object.entries(overrides).filter(([key, value]) => {
    return (
      typeof value === "boolean" &&
      key !== "unified_exec" &&
      key !== "features.unified_exec"
    );
  });

  return Object.fromEntries(filteredEntries);
}

export function buildFeatureOverrideConfig(
  overrides: Record<string, boolean>,
): Record<string, boolean> {
  const config: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const featureKey = normalizeFeatureOverrideKey(key);
    config[featureKey] = value;
  }
  return config;
}
