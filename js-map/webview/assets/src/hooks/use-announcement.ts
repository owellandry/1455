import type { ReasoningEffort } from "app-server-types";
import type {
  Model,
  ModelAvailabilityNux,
  ModelUpgradeInfo,
} from "app-server-types/v2";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { matchPath, useLocation } from "react-router";

import { useListModels } from "@/queries/model-queries";
import { getModelFromModelsByType } from "@/utils/normalize-model-settings";
import { persistedAtom } from "@/utils/persisted-atom";

import { useIsFastModeEnabled } from "./use-is-fast-mode-enabled";
import { useModelSettings } from "./use-model-settings";

type UseAnnouncement<T> = {
  announcementContent: T;
  showAnnouncement: boolean;
  dismissAnnouncement: () => void;
};

export type ModelUpgradeAnnouncement = ModelUpgradeInfo & {
  reasoningEffort: ReasoningEffort | null;
};

export type NewModelAnnouncement = ModelAvailabilityNux & {
  model: string;
};

export type FastModeAnnouncement = {
  model: string;
};

type ModelWithAvailabilityNux = Model & {
  availabilityNux: ModelAvailabilityNux;
};

const ANNOUNCEMENT_ROUTE_PATTERNS = ["/", "/local/:conversationId"] as const;
const FAST_MODE_ANNOUNCEMENT_MODEL = "gpt-5.4";
const dismissFastModeAnnouncement = (): void => {};

export const aHasSeenModelUpgradeList = persistedAtom<Array<string>>(
  "seen-model-upgrade-list",
  [],
);

const aLatestModelSeen = persistedAtom<string | null>(
  "latest-model-seen",
  null,
);

// Exported for testing purpose only
export const useAnnouncement = <T>(
  shouldShowAnnouncement: boolean,
  hasSeenAnnouncement: boolean,
  announcementContent: T,
  onAnnouncementDismissed: () => void,
): UseAnnouncement<T> => {
  return {
    announcementContent,
    showAnnouncement: shouldShowAnnouncement && !hasSeenAnnouncement,
    dismissAnnouncement: onAnnouncementDismissed,
  };
};

export function useIsAnnouncementRouteEligible(): boolean {
  const location = useLocation();
  return ANNOUNCEMENT_ROUTE_PATTERNS.some((routePattern) => {
    return (
      matchPath(
        {
          path: routePattern,
          end: true,
        },
        location.pathname,
      ) != null
    );
  });
}

export const useNewModelAnnouncement =
  (): UseAnnouncement<NewModelAnnouncement | null> => {
    const isAnnouncementRouteEligible = useIsAnnouncementRouteEligible();
    const { data: modelList, isLoading: isListModelsLoading } = useListModels();
    const [hasSeenModelUpgradeList, setHasSeenModelUpgradeList] = useAtom(
      aHasSeenModelUpgradeList,
    );
    const firstUnseenModelWithAvailabilityNux =
      modelList?.modelsByType.models.find(
        (model): model is ModelWithAvailabilityNux =>
          model.availabilityNux != null &&
          !hasSeenModelUpgradeList.includes(model.model),
      ) ?? null;
    const announcementContent =
      firstUnseenModelWithAvailabilityNux == null
        ? null
        : {
            ...firstUnseenModelWithAvailabilityNux.availabilityNux,
            model: firstUnseenModelWithAvailabilityNux.model,
          };

    const dismissAnnouncement = (): void => {
      if (firstUnseenModelWithAvailabilityNux == null) {
        return;
      }

      setHasSeenModelUpgradeList(
        addModelUpgradeToSeenList(
          hasSeenModelUpgradeList,
          firstUnseenModelWithAvailabilityNux.model,
        ),
      );
    };

    return useAnnouncement(
      firstUnseenModelWithAvailabilityNux != null &&
        !isListModelsLoading &&
        isAnnouncementRouteEligible,
      false,
      announcementContent,
      dismissAnnouncement,
    );
  };

export const useModelUpgradeAnnouncement =
  (): UseAnnouncement<ModelUpgradeAnnouncement | null> => {
    const isAnnouncementRouteEligible = useIsAnnouncementRouteEligible();
    const { modelSettings } = useModelSettings();
    const { data: modelList } = useListModels();
    const [hasSeenModelUpgradeList, setHasSeenModelUpgradeList] = useAtom(
      aHasSeenModelUpgradeList,
    );
    const [latestModelSeen, setLatestModelSeen] = useAtom(aLatestModelSeen);
    // Migrate the old single-model key into the list so we do not reshow an
    // upgrade modal the user already dismissed before this became multi-value.
    const migratedHasSeenModelUpgradeList =
      latestModelSeen == null
        ? hasSeenModelUpgradeList
        : addModelUpgradeToSeenList(hasSeenModelUpgradeList, latestModelSeen);
    const shouldPersistHasSeenModelUpgradeList =
      migratedHasSeenModelUpgradeList !== hasSeenModelUpgradeList;
    const shouldClearLatestModelSeen = latestModelSeen != null;

    const currentModelInfo = getModelFromModelsByType(
      modelSettings.model,
      modelList?.modelsByType,
    );
    const currentModelUpgrade = currentModelInfo?.upgrade;
    const isCurrentModelUpgradeModelAvailable =
      !!currentModelUpgrade &&
      getModelFromModelsByType(currentModelUpgrade, modelList?.modelsByType) !=
        null;

    let hasSeenModelUpgrade = false;
    let modelUpgradeKey: string | null = null;
    if (currentModelUpgrade) {
      modelUpgradeKey = currentModelUpgrade;

      hasSeenModelUpgrade =
        migratedHasSeenModelUpgradeList.includes(modelUpgradeKey);
    }

    useEffect(() => {
      if (shouldPersistHasSeenModelUpgradeList) {
        setHasSeenModelUpgradeList(migratedHasSeenModelUpgradeList);
      }
      if (shouldClearLatestModelSeen) {
        setLatestModelSeen(null);
      }
    }, [
      migratedHasSeenModelUpgradeList,
      setHasSeenModelUpgradeList,
      setLatestModelSeen,
      shouldClearLatestModelSeen,
      shouldPersistHasSeenModelUpgradeList,
    ]);

    const markCurrentModelUpgradeSeen = (): void => {
      if (!modelUpgradeKey) {
        return;
      }

      setHasSeenModelUpgradeList(
        addModelUpgradeToSeenList(
          migratedHasSeenModelUpgradeList,
          modelUpgradeKey,
        ),
      );
      setLatestModelSeen(null);
    };

    return useAnnouncement(
      !!currentModelUpgrade &&
        !modelSettings.isLoading &&
        isCurrentModelUpgradeModelAvailable &&
        isAnnouncementRouteEligible,
      hasSeenModelUpgrade,
      currentModelInfo?.upgradeInfo
        ? {
            ...currentModelInfo.upgradeInfo,
            reasoningEffort: modelSettings.reasoningEffort,
          }
        : null,
      markCurrentModelUpgradeSeen,
    );
  };

export const useFastModeAnnouncement =
  (): UseAnnouncement<FastModeAnnouncement | null> => {
    const isAnnouncementRouteEligible = useIsAnnouncementRouteEligible();
    const isFastModeEnabled = useIsFastModeEnabled();
    const { modelSettings } = useModelSettings();
    const hasSeenModelUpgradeList = useAtomValue(aHasSeenModelUpgradeList);
    const hasSeenGpt54ModelUpgrade = hasSeenModelUpgradeList.includes(
      FAST_MODE_ANNOUNCEMENT_MODEL,
    );
    const hasGpt54Selected =
      modelSettings.model === FAST_MODE_ANNOUNCEMENT_MODEL;

    return useAnnouncement(
      isFastModeEnabled &&
        !modelSettings.isLoading &&
        isAnnouncementRouteEligible &&
        (hasGpt54Selected || hasSeenGpt54ModelUpgrade),
      false,
      {
        model: FAST_MODE_ANNOUNCEMENT_MODEL,
      },
      dismissFastModeAnnouncement,
    );
  };

function addModelUpgradeToSeenList(
  hasSeenModelUpgradeList: Array<string>,
  modelUpgradeKey: string,
): Array<string> {
  if (hasSeenModelUpgradeList.includes(modelUpgradeKey)) {
    return hasSeenModelUpgradeList;
  }

  return [...hasSeenModelUpgradeList, modelUpgradeKey];
}
