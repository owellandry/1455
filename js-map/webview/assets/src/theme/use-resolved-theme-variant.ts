import {
  ConfigurationKeys,
  type ThemeAppearanceMode,
  type ThemeVariant,
} from "protocol";
import { useSyncExternalStore } from "react";

import { useConfiguration } from "@/hooks/use-configuration";

/**
 * Reads the persisted appearance mode and falls back to system when unset.
 */
export function useResolvedAppearanceMode(): ThemeAppearanceMode {
  const { data: appearanceModeValue } = useConfiguration(
    ConfigurationKeys.APPEARANCE_THEME,
  );
  return appearanceModeValue ?? "system";
}

/**
 * Resolves the active light/dark variant for the current appearance mode.
 * Components use this to pick the live theme without duplicating system-theme logic.
 */
export function useResolvedThemeVariant(
  appearanceMode: ThemeAppearanceMode,
): ThemeVariant {
  const systemVariant = useSyncExternalStore(
    appearanceMode === "system"
      ? subscribeToSystemThemeVariant
      : subscribeToNoop,
    appearanceMode === "system"
      ? getSystemThemeVariant
      : (): ThemeVariant => appearanceMode,
    appearanceMode === "system"
      ? getSystemThemeVariant
      : (): ThemeVariant => appearanceMode,
  );
  return systemVariant;
}

/**
 * Returns the theme cards that should be visible in settings for the current appearance mode.
 */
export function getVisibleThemeVariants(
  appearanceMode: ThemeAppearanceMode,
): Array<ThemeVariant> {
  if (appearanceMode === "system") {
    return ["light", "dark"];
  }

  return [appearanceMode];
}

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: () => void) => void;
  removeListener?: (listener: () => void) => void;
};

/**
 * Keeps useSyncExternalStore stable when we already know the variant and do not need subscriptions.
 */
function subscribeToNoop(): () => void {
  return () => {};
}

/**
 * Subscribes to system theme changes through Electron when available, otherwise matchMedia in the browser.
 */
function subscribeToSystemThemeVariant(listener: () => void): () => void {
  const bridgeSubscribe = window.electronBridge?.subscribeToSystemThemeVariant;
  if (bridgeSubscribe != null) {
    return bridgeSubscribe(listener);
  }

  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ) as LegacyMediaQueryList;
  const handleChange = (): void => {
    listener();
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleChange);
    return (): void => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }

  if (
    typeof mediaQuery.addListener === "function" &&
    typeof mediaQuery.removeListener === "function"
  ) {
    mediaQuery.addListener(handleChange);
    return (): void => {
      mediaQuery.removeListener(handleChange);
    };
  }

  return () => {};
}

/**
 * Reads the current system light/dark preference from the Electron bridge or browser fallback.
 */
function getSystemThemeVariant(): ThemeVariant {
  const bridgeVariant = window.electronBridge?.getSystemThemeVariant?.();
  if (bridgeVariant != null) {
    return bridgeVariant;
  }

  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
