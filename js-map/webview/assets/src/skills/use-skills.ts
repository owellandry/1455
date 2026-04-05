import { useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useEffect, useMemo } from "react";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useRegisterCommand } from "@/commands/use-register-command";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

type SkillsAppServerManager = Pick<
  AppServerManager,
  "getHostId" | "listSkills"
>;

export function useSkills(
  rootsOverrideCwd?: string | Array<string>,
  appServerManager?: SkillsAppServerManager,
): {
  skills: Array<AppServer.v2.SkillMetadata>;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
  forceReload: () => Promise<void>;
  findSkillByName: (skillName: string) => AppServer.v2.SkillMetadata | null;
} {
  const defaultAppServerManager = useDefaultAppServerManager();
  const activeAppServerManager = appServerManager ?? defaultAppServerManager;
  const hostId = activeAppServerManager.getHostId();
  const queryClient = useQueryClient();
  const [skillsRefreshNonce] = useSharedObject("skills_refresh_nonce");
  const activeRootsQuery = useFetchFromVSCode("workspace-root-options");
  const roots = useMemo<Array<string>>(() => {
    if (Array.isArray(rootsOverrideCwd)) {
      return rootsOverrideCwd;
    }
    if (typeof rootsOverrideCwd === "string") {
      return [rootsOverrideCwd];
    }
    return activeRootsQuery.data?.roots ?? [];
  }, [activeRootsQuery.data?.roots, rootsOverrideCwd]);
  const shouldFetchSkills =
    rootsOverrideCwd !== undefined || activeRootsQuery.isFetched;

  const skillsQueryKey: Array<unknown> = ["skills", hostId, roots];
  const skillsQuery = useQuery({
    queryKey: skillsQueryKey,
    queryFn: () => activeAppServerManager.listSkills(roots),
    enabled: shouldFetchSkills,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    gcTime: Infinity,
  });

  const skills = useMemo<Array<AppServer.v2.SkillMetadata>>(() => {
    const entries = skillsQuery.data?.data ?? [];
    return entries.flatMap((entry) => entry.skills);
  }, [skillsQuery.data?.data]);

  useEffect(() => {
    if (skillsRefreshNonce == null) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["skills"] });
  }, [skillsRefreshNonce, queryClient]);

  async function forceReloadSkills(): Promise<void> {
    const response = await activeAppServerManager.listSkills(roots, {
      forceReload: true,
    });
    queryClient.setQueryData(skillsQueryKey, response);
  }

  useRegisterCommand("forceReloadSkills", () => {
    void forceReloadSkills();
  });

  const findSkillByName = (
    skillName: string,
  ): AppServer.v2.SkillMetadata | null => {
    const normalized = skillName.toLowerCase();
    return (
      skills.find((skill) => {
        return skill.name.toLowerCase() === normalized;
      }) ?? null
    );
  };

  return {
    skills,
    isLoading: activeRootsQuery.isLoading || skillsQuery.isLoading,
    isFetching: activeRootsQuery.isFetching || skillsQuery.isFetching,
    refetch: (): Promise<unknown> => skillsQuery.refetch(),
    forceReload: forceReloadSkills,
    findSkillByName,
  };
}
