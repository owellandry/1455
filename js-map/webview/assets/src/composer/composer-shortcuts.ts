export const PLAN_MODE_TOGGLE_ACCELERATOR = "CmdOrCtrl+Shift+P";
export const MODEL_PICKER_ACCELERATOR = "CmdOrCtrl+Shift+M";
export const REASONING_PICKER_ACCELERATOR = "CmdOrCtrl+T";

export const PLAN_MODE_TOGGLE_SHORTCUT_LABEL =
  PLAN_MODE_TOGGLE_ACCELERATOR.replace("CmdOrCtrl", "Cmd").replaceAll(
    "+",
    " + ",
  );

type ModeKind = "default" | "plan";

export function getInProgressFollowUpAction({
  invertInProgressFollowUpMode = false,
  isQueueingEnabled,
}: {
  invertInProgressFollowUpMode?: boolean;
  isQueueingEnabled: boolean;
}): "queue" | "steer" {
  return invertInProgressFollowUpMode
    ? isQueueingEnabled
      ? "steer"
      : "queue"
    : isQueueingEnabled
      ? "queue"
      : "steer";
}

export function togglePlanMode({
  hasPlanMode,
  hasDefaultMode,
  isPlanMode,
  setSelectedMode,
}: {
  hasPlanMode: boolean;
  hasDefaultMode: boolean;
  isPlanMode: boolean;
  setSelectedMode: (mode: ModeKind | null) => void;
}): boolean {
  if (!hasPlanMode) {
    return false;
  }

  if (isPlanMode) {
    if (hasDefaultMode) {
      setSelectedMode("default");
      return true;
    }
    setSelectedMode(null);
    return true;
  }

  setSelectedMode("plan");
  return true;
}

export function handleComposerFocusedShortcut({
  event,
  isComposerFocused,
  hasActiveMentionMenu,
  hasPlanMode,
  hasDefaultMode,
  isPlanMode,
  setSelectedMode,
  blurComposer,
}: {
  event: KeyboardEvent;
  isComposerFocused: boolean;
  hasActiveMentionMenu: boolean;
  hasPlanMode: boolean;
  hasDefaultMode: boolean;
  isPlanMode: boolean;
  setSelectedMode: (mode: ModeKind | null) => void;
  blurComposer: () => void;
}): boolean {
  if (!isComposerFocused) {
    return false;
  }

  if (
    event.key === "Escape" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  ) {
    if (hasActiveMentionMenu) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    blurComposer();
    return true;
  }

  if (
    event.key === "Tab" &&
    event.shiftKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  ) {
    const didToggle = togglePlanMode({
      hasPlanMode,
      hasDefaultMode,
      isPlanMode,
      setSelectedMode,
    });
    if (!didToggle) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  return false;
}

export function handleGlobalPlanModeShortcut({
  event,
  hasPlanMode,
  hasDefaultMode,
  isPlanMode,
  setSelectedMode,
}: {
  event: KeyboardEvent;
  hasPlanMode: boolean;
  hasDefaultMode: boolean;
  isPlanMode: boolean;
  setSelectedMode: (mode: ModeKind | null) => void;
}): boolean {
  const didToggle = togglePlanMode({
    hasPlanMode,
    hasDefaultMode,
    isPlanMode,
    setSelectedMode,
  });
  if (!didToggle) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
}
