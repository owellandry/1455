import type { HostAccentColors } from "protocol";
import { useEffect } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { useIsDark } from "@/utils/use-is-dark";

export function HostTitlebarTint(): null {
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const isRemoteHost = useIsRemoteHost();
  const isDark = useIsDark();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const accentColors = hostConfig?.accent_colors;
    const tint =
      isRemoteHost && accentColors ? resolveTint(accentColors, isDark) : null;

    if (tint) {
      root.style.setProperty("--codex-titlebar-tint", tint);
    } else {
      root.style.removeProperty("--codex-titlebar-tint");
    }
  }, [hostConfig, isRemoteHost, isDark]);

  return null;
}

function resolveTint(
  accentColors: HostAccentColors,
  isDark: boolean | null,
): string | null {
  if (isDark === true) {
    return (
      accentColors.dark?.background ?? accentColors.light?.background ?? null
    );
  }
  if (isDark === false) {
    return (
      accentColors.light?.background ?? accentColors.dark?.background ?? null
    );
  }
  return (
    accentColors.light?.background ?? accentColors.dark?.background ?? null
  );
}
