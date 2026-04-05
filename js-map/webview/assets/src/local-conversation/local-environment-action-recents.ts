import { persistedAtom } from "@/utils/persisted-atom";

export const aLocalEnvironmentRecentActionsByKey = persistedAtom<
  Record<string, Array<string>>
>("local-env-recent-actions-by-key", {});

export function getRecentActionNamesForKey(
  recentActionsByKey: Record<string, Array<string>>,
  key: string | null,
): Array<string> {
  if (!key) {
    return [];
  }
  return recentActionsByKey[key] ?? [];
}

export function updateRecentActionNamesForKey(
  recentActionsByKey: Record<string, Array<string>>,
  key: string | null,
  actionName: string,
): Record<string, Array<string>> {
  if (!key) {
    return recentActionsByKey;
  }
  const trimmedName = actionName.trim();
  if (!trimmedName) {
    return recentActionsByKey;
  }
  const existing = recentActionsByKey[key] ?? [];
  const next = [
    trimmedName,
    ...existing.filter((name) => name !== trimmedName),
  ];
  return { ...recentActionsByKey, [key]: next };
}
