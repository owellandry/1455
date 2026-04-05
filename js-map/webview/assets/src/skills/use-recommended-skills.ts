import { useQueryClient } from "@tanstack/react-query";
import type {
  RecommendedSkillMetadata,
  RecommendedSkillsResponse,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import {
  fetchFromVSCode,
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

export function useRecommendedSkills({
  enabled = true,
}: {
  enabled?: boolean;
} = {}): {
  data: RecommendedSkillsResponse | undefined;
  errorMessage: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  ensureSkillByName: (
    skillName: string,
  ) => Promise<RecommendedSkillMetadata | null>;
  installSkill: (args: {
    skill: RecommendedSkillMetadata;
    installRoot?: string | null;
  }) => Promise<{
    success: boolean;
    destination: string | null;
    error: string | null;
  }>;
} {
  const queryClient = useQueryClient();
  const queryKey = getQueryKey("recommended-skills", { refresh: false });
  const query = useFetchFromVSCode("recommended-skills", {
    params: { refresh: false },
    queryConfig: {
      enabled,
      staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    },
  });
  const errorMessage =
    query.data?.error ??
    (query.error ? String(query.error.message ?? query.error) : null);
  const installSkillMutation = useMutationFromVSCode(
    "install-recommended-skill",
  );

  const refresh = async (): Promise<void> => {
    const data = await fetchFromVSCode("recommended-skills", {
      params: { refresh: true },
    });
    queryClient.setQueryData(queryKey, data);
  };

  const findSkillByName = (
    skills: Array<RecommendedSkillMetadata>,
    skillName: string,
  ): RecommendedSkillMetadata | null => {
    const normalized = skillName.toLowerCase();
    return (
      skills.find((skill) => {
        const name = skill.name.toLowerCase();
        const id = skill.id.toLowerCase();
        return name === normalized || id === normalized;
      }) ?? null
    );
  };

  const ensureSkillByName = async (
    skillName: string,
  ): Promise<RecommendedSkillMetadata | null> => {
    const cached = findSkillByName(query.data?.skills ?? [], skillName);
    if (cached) {
      return cached;
    }
    const data = await fetchFromVSCode("recommended-skills", {
      params: { refresh: false },
    });
    queryClient.setQueryData(queryKey, data);
    return findSkillByName(data.skills, skillName);
  };

  const installSkill = async ({
    skill,
    installRoot = null,
  }: {
    skill: RecommendedSkillMetadata;
    installRoot?: string | null;
  }): Promise<{
    success: boolean;
    destination: string | null;
    error: string | null;
  }> => {
    return installSkillMutation.mutateAsync({
      skillId: skill.id,
      repoPath: skill.repoPath,
      installRoot,
    });
  };

  return {
    data: query.data,
    errorMessage,
    isLoading: query.isLoading,
    refresh,
    ensureSkillByName,
    installSkill,
  };
}
