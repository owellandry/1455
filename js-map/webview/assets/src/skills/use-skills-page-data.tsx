import path from "path";

import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import type { RecommendedSkillMetadata } from "protocol";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { AppScope } from "@/scopes/app-scope";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

import { createInstalledSkillMatchKeySet } from "./plugins-page-selectors";
import { dedupeSkills } from "./plugins-page-utils";
import { useRecommendedSkills } from "./use-recommended-skills";
import { useSkills } from "./use-skills";

export function useSkillsPagePaths(): {
  canInstallRecommendedSkills: boolean;
  defaultRecommendedRepoRoot: string | null;
  skillCreatorPath: string | null;
} {
  const codexHome = useCodexHome();

  return {
    canInstallRecommendedSkills: codexHome != null,
    defaultRecommendedRepoRoot:
      codexHome == null
        ? null
        : path.join(codexHome, "vendor_imports", "skills"),
    skillCreatorPath:
      codexHome == null
        ? null
        : `${codexHome}/skills/.system/skill-creator/SKILL.md`,
  };
}

export function useInstalledSkillsData(): {
  forceReloadSkills: () => Promise<void>;
  installedSkillMatchKeys: Set<string>;
  isFetching: boolean;
  isLoading: boolean;
  markSkillsUpdated: () => void;
  skills: Array<{ skill: AppServer.v2.SkillMetadata }>;
  workspaceRoots: Array<string>;
} {
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const [, setSkillsRefreshNonce] = useSharedObject("skills_refresh_nonce");
  const { data: workspaceRootsData } = useFetchFromVSCode(
    "workspace-root-options",
  );
  const workspaceRoots = workspaceRootsData?.roots ?? [];
  const { skills, isFetching, isLoading, forceReload } = useSkills(
    workspaceRoots.length > 0 ? workspaceRoots : undefined,
  );
  const dedupedSkills = dedupeSkills(skills);

  return {
    forceReloadSkills: forceReload,
    installedSkillMatchKeys: createInstalledSkillMatchKeySet(dedupedSkills),
    isFetching,
    isLoading,
    markSkillsUpdated: (): void => {
      applySkillsRefresh({
        forceReload,
        invalidateQueriesAndBroadcast,
        setSkillsRefreshNonce,
      });
    },
    skills: dedupedSkills,
    workspaceRoots,
  };
}

export function useRecommendedSkillsData(
  defaultRecommendedRepoRoot: string | null,
): {
  errorMessage: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  repoRoot: string | null;
  skills: Array<RecommendedSkillMetadata>;
} {
  const { data, errorMessage, isLoading, refresh } = useRecommendedSkills({
    enabled: true,
  });

  return {
    errorMessage,
    isLoading,
    refresh,
    repoRoot: data?.repoRoot ?? defaultRecommendedRepoRoot,
    skills: data?.skills ?? [],
  };
}

export function useInstallRecommendedSkill({
  forceReloadSkills,
  onInstalled,
}: {
  forceReloadSkills: () => Promise<void>;
  onInstalled?: () => void;
}): {
  installRecommendedSkill: (
    skill: RecommendedSkillMetadata,
    installRoot: string | null,
  ) => void;
  installingSkillId: string | null;
} {
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const scope = useScope(AppScope);
  const [, setSkillsRefreshNonce] = useSharedObject("skills_refresh_nonce");
  const canInstallRecommendedSkills = useCodexHome() != null;
  const [installingSkillId, setInstallingSkillId] = useState<string | null>(
    null,
  );
  const [installingSkillName, setInstallingSkillName] = useState<string | null>(
    null,
  );
  const installSkillMutation = useMutationFromVSCode(
    "install-recommended-skill",
    {
      onSuccess: (response): void => {
        if (!response.success) {
          return;
        }

        void invalidateQueriesAndBroadcast(
          getQueryKey("recommended-skills", { refresh: false }),
        );
        applySkillsRefresh({
          forceReload: forceReloadSkills,
          invalidateQueriesAndBroadcast,
          setSkillsRefreshNonce,
        });
        onInstalled?.();

        scope.get(toast$).success(
          <FormattedMessage
            id="skills.recommended.installSuccess"
            defaultMessage="{skillName} skill installed"
            description="Toast shown after successfully installing a recommended skill"
            values={{
              skillName: (
                <span className="font-medium">{installingSkillName}</span>
              ),
            }}
          />,
        );
      },
      onSettled: (): void => {
        setInstallingSkillId(null);
        setInstallingSkillName(null);
      },
    },
  );

  return {
    installRecommendedSkill: (
      skill: RecommendedSkillMetadata,
      installRoot: string | null,
    ): void => {
      if (!canInstallRecommendedSkills) {
        return;
      }

      setInstallingSkillId(skill.id);
      setInstallingSkillName(skill.name);
      installSkillMutation.mutate({
        skillId: skill.id,
        repoPath: skill.repoPath,
        installRoot,
      });
    },
    installingSkillId,
  };
}

function useCodexHome(): string | null {
  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  return codexHomeData?.codexHome ?? null;
}

function applySkillsRefresh({
  forceReload,
  invalidateQueriesAndBroadcast,
  setSkillsRefreshNonce,
}: {
  forceReload: () => Promise<void>;
  invalidateQueriesAndBroadcast: (queryKey: Array<unknown>) => Promise<void>;
  setSkillsRefreshNonce: (value: (previous?: number) => number) => void;
}): void {
  void invalidateQueriesAndBroadcast(["skills"]);
  void forceReload();
  setSkillsRefreshNonce((previous) => (previous ?? 0) + 1);
}
