import { persistedAtom } from "@/utils/persisted-atom";

/**
 * Persisted environment filter for cloud tasks in the Recent Tasks menu.
 * Value is environment id (string) or null for no filter.
 */
export const aCloudTasksEnvFilterIdAtom = persistedAtom<string | null>(
  "cloudTasksEnvironmentFilterId",
  null,
);
