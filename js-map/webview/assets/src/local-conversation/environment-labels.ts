import type { LocalEnvironmentResultWithPath } from "protocol";

import { normalizePath } from "@/utils/path";

export function getEnvironmentDisplayName(
  configPath: string,
  name: string | null | undefined,
): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return trimmedName;
  }
  return getEnvironmentFileName(configPath);
}

export function getEnvironmentLabel(
  environment: LocalEnvironmentResultWithPath,
): string {
  return getEnvironmentDisplayName(
    environment.configPath,
    environment.type === "success" ? environment.environment.name : null,
  );
}

function getEnvironmentFileName(configPath: string): string {
  const normalized = normalizePath(configPath);
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}
