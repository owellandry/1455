import { useMutation } from "@tanstack/react-query";
import type { Personality } from "app-server-types";
import { useSetAtom } from "jotai";
import { parsePersonality } from "protocol";
import { useEffect, useEffectEvent, useRef } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { aPersonality } from "@/composer/composer-atoms";
import { USER_CONFIG_QUERY_KEY, useUserConfig } from "@/queries/config-queries";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import {
  getStatsigExperiment,
  useGate,
  useStatsigEvaluationClient,
} from "@/statsig/statsig";

type UsePersonalityHook = {
  isPersonalityEnabled: boolean;
  personality: Personality | null;
  setPersonality: (value: Personality | null) => void;
};

const PERSONALITY_KEY = "personality";
const LEGACY_PERSONALITY_KEY = "model_personality";
const DEFAULT_PERSONALITY_PARAM = "default_personality";

export function usePersonality(): UsePersonalityHook {
  const manager = useDefaultAppServerManager();
  const isPersonalityEnabled = useGate(
    __statsigName("codex_rollout_personality"),
  );
  const client = useStatsigEvaluationClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const setPersistedPersonality = useSetAtom(aPersonality);
  const { data: userConfigData, isLoading: isUserConfigLoading } =
    useUserConfig();
  const configPersonality = parsePersonality(
    userConfigData?.config?.[PERSONALITY_KEY],
  );
  const legacyConfigPersonality = parsePersonality(
    userConfigData?.config?.[LEGACY_PERSONALITY_KEY],
  );
  const hasLegacyPersonalityKey =
    userConfigData?.config != null &&
    Object.prototype.hasOwnProperty.call(
      userConfigData.config,
      LEGACY_PERSONALITY_KEY,
    );

  let shouldUseExperimentDefault = false;
  let personality = configPersonality ?? legacyConfigPersonality;
  if (!isPersonalityEnabled) {
    personality = null;
  } else {
    shouldUseExperimentDefault = !isUserConfigLoading && personality == null;
    if (shouldUseExperimentDefault) {
      const experimentPersonality = parsePersonality(
        getStatsigExperiment(
          client,
          __statsigName("codex_vscode_default_personality_assignment_2"),
        ).get(DEFAULT_PERSONALITY_PARAM, null),
      );
      personality = experimentPersonality ?? "friendly";
    }
  }

  const hasCleanedLegacyPersonality = useRef(false);

  const invalidateConfigQueries = async (): Promise<void> => {
    await Promise.all([
      invalidateQueriesAndBroadcast(USER_CONFIG_QUERY_KEY),
      invalidateQueriesAndBroadcast(["user-saved-config"]),
    ]);
  };

  const setPersonalityMutation = useMutation({
    mutationFn: async (value: Personality | null): Promise<void> => {
      await manager.batchWriteConfigValue({
        edits: [
          {
            keyPath: PERSONALITY_KEY,
            value,
            mergeStrategy: "upsert",
          },
        ],
        filePath: userConfigData?.configWriteTarget?.filePath ?? null,
        expectedVersion:
          userConfigData?.configWriteTarget?.expectedVersion ?? null,
      });
    },
    onSettled: invalidateConfigQueries,
  });

  const cleanupLegacyPersonalityMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!hasLegacyPersonalityKey) {
        return;
      }

      const edits: Parameters<
        typeof manager.batchWriteConfigValue
      >[0]["edits"] = [
        {
          keyPath: LEGACY_PERSONALITY_KEY,
          value: null,
          mergeStrategy: "replace" as const,
        },
      ];

      if (configPersonality == null && legacyConfigPersonality != null) {
        edits.unshift({
          keyPath: PERSONALITY_KEY,
          value: legacyConfigPersonality,
          mergeStrategy: "upsert" as const,
        });
      }

      await manager.batchWriteConfigValue({
        edits,
        filePath: userConfigData?.configWriteTarget?.filePath ?? null,
        expectedVersion:
          userConfigData?.configWriteTarget?.expectedVersion ?? null,
      });
    },
    onSettled: invalidateConfigQueries,
  });

  useEffect(() => {
    if (!hasLegacyPersonalityKey || hasCleanedLegacyPersonality.current) {
      return;
    }

    hasCleanedLegacyPersonality.current = true;
    cleanupLegacyPersonalityMutation.mutate();
  }, [cleanupLegacyPersonalityMutation, hasLegacyPersonalityKey]);

  const setPersonalityInAppServerManager = useEffectEvent(() => {
    if (isUserConfigLoading) {
      return;
    }
    manager.setPersonality(personality);
  });

  useEffect(() => {
    setPersonalityInAppServerManager();
  }, [shouldUseExperimentDefault, isUserConfigLoading, personality]);

  return {
    isPersonalityEnabled,
    personality,
    setPersonality: (value: Personality | null): void => {
      manager.setPersonality(value);
      setPersistedPersonality(value);
      setPersonalityMutation.mutate(value);
    },
  };
}
