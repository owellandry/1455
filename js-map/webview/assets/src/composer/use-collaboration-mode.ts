import type * as AppServer from "app-server-types";
import { useAtom } from "jotai";
import type { ConversationId } from "protocol";
import { useEffect, useEffectEvent } from "react";

import { DEFAULT_MODE } from "@/app-server/app-server-manager-constants";
import {
  useDefaultAppServerManager,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { dismissAllTooltips } from "@/components/tooltip";
import { aCurrentCollaborationMode } from "@/composer/composer-atoms";
import { useModelSettings } from "@/hooks/use-model-settings";
import { useCollaborationModeMasks } from "@/queries/collaboration-mode-queries";
import { logger } from "@/utils/logger";

type CollaborationModeSelection = AppServer.ModeKind | null;

export type CollaborationModeState = {
  modes: Array<AppServer.CollaborationMode>;
  activeMode: AppServer.CollaborationMode;
  selectedMode: CollaborationModeSelection;
  setSelectedMode: (mode: CollaborationModeSelection) => void;
  isLoading: boolean;
};

export function useCollaborationMode(
  conversationId: ConversationId | null = null,
): CollaborationModeState {
  const appServerManager = useDefaultAppServerManager();
  const latestCollaborationMode = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.latestCollaborationMode ?? null,
  );
  const { modelSettings } = useModelSettings(conversationId);
  const [draftMode, setDraftMode] = useAtom(aCurrentCollaborationMode);
  const {
    data: collaborationModeMasks,
    isFetching: isCollaborationModeMasksFetching,
  } = useCollaborationModeMasks();

  const defaultModeForState: AppServer.CollaborationMode = {
    mode: DEFAULT_MODE,
    settings: {
      model: modelSettings.model,
      reasoning_effort: modelSettings.reasoningEffort,
      developer_instructions: null,
    },
  };
  const isCollaborationModesReady =
    !isCollaborationModeMasksFetching && !modelSettings.isLoading;
  const threadMode = latestCollaborationMode;
  // selectedMode tracks the chosen mode id used by UI controls.
  const selectedModeForState = threadMode?.mode ?? draftMode ?? DEFAULT_MODE;

  const modes: Array<AppServer.CollaborationMode> = (
    collaborationModeMasks ?? []
  ).flatMap((mask) => {
    if (mask.mode == null) {
      return [];
    }

    const baseMode = {
      mode: mask.mode,
      settings: {
        model: mask.model,
        reasoning_effort: mask.reasoning_effort,
        developer_instructions: null,
      },
    };
    return [
      {
        ...baseMode,
        settings: {
          ...baseMode.settings,
          model: modelSettings.model,
          reasoning_effort: modelSettings.reasoningEffort,
        },
      },
    ];
  });
  // activeMode is the effective mode object used for payloads/behavior and may
  // differ from selectedMode due to defaults, mask resolution, or experiments.
  const activeMode =
    threadMode ??
    modes.find((mode) => mode.mode === selectedModeForState) ??
    defaultModeForState;

  const getModeForSelection = (
    mode: CollaborationModeSelection,
  ): AppServer.CollaborationMode =>
    (mode ? modes.find((candidate) => candidate.mode === mode) : null) ??
    defaultModeForState;

  const setSelectedModeForState = (mode: CollaborationModeSelection): void => {
    dismissAllTooltips();
    if (conversationId) {
      try {
        const result =
          appServerManager.setLatestCollaborationModeForConversation(
            conversationId,
            getModeForSelection(mode),
          );
        if (result && typeof result.catch === "function") {
          void result.catch((error) => {
            logger.error("Failed to set collaboration mode", {
              safe: { conversationId },
              sensitive: { error },
            });
          });
        }
      } catch (error) {
        logger.error("Failed to set collaboration mode", {
          safe: { conversationId },
          sensitive: { error },
        });
      }
      return;
    }
    setDraftMode(mode);
  };

  const setSelectedModeForStateEvent = useEffectEvent(() => {
    const currentMode =
      modes.find((mode) => mode.mode === selectedModeForState)?.mode ??
      DEFAULT_MODE;

    if (currentMode !== selectedModeForState) {
      setSelectedModeForState(currentMode);
    }
  });

  useEffect(() => {
    if (!isCollaborationModesReady) {
      return;
    }

    // If we did not get anthing from app server, we will just assume current mode selection
    if (!(modes.length > 0)) {
      return;
    }

    // Make sure the selected mode (global or thread view) remains valid.
    setSelectedModeForStateEvent();
  }, [modes, isCollaborationModesReady]);

  return {
    modes,
    activeMode: {
      ...activeMode,
      settings: {
        ...activeMode.settings,
        model: modelSettings.model,
        reasoning_effort: modelSettings.reasoningEffort,
      },
    },
    selectedMode: selectedModeForState,
    setSelectedMode: setSelectedModeForState,
    isLoading: !isCollaborationModesReady,
  };
}
