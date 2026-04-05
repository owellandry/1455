import { useWindowType } from "@/hooks/use-window-type";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

type Platform = "windows" | "macOS" | "linux";

export function usePlatform(): {
  platform: Platform;
  modifierSymbol: string;
  isLoading: boolean;
} {
  const windowType = useWindowType();
  const shouldFetch = windowType !== "browser";
  const { data, isLoading } = useFetchFromVSCode("os-info", {
    queryConfig: {
      enabled: shouldFetch,
      staleTime: QUERY_STALE_TIME.INFINITE,
    },
  });
  const platform =
    data?.platform != null
      ? normalizeNodePlatform(data.platform)
      : getNavigatorPlatform();

  return {
    platform,
    modifierSymbol: getModifierSymbol(platform),
    isLoading: shouldFetch ? isLoading : false,
  };
}

function getModifierSymbol(platform: Platform): string {
  if (platform === "macOS") {
    return "⌘";
  }
  return "^";
}

function getNavigatorPlatform(): Platform {
  const navigatorPlatform =
    typeof navigator === "undefined" ? "" : (navigator.platform ?? "");
  if (navigatorPlatform.startsWith("Mac")) {
    return "macOS";
  }
  if (navigatorPlatform.startsWith("Win")) {
    return "windows";
  }
  return "linux";
}

function normalizeNodePlatform(platform: string): Platform {
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "macOS";
  }
  return "linux";
}
