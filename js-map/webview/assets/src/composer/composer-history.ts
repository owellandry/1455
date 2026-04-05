import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";

import { aPromptHistory } from "./composer-atoms";
import type { ProseMirrorComposerController } from "./prosemirror/composer-controller";
import { setCustomKeymapHandlers } from "./prosemirror/custom-keymap-plugin";
import { useComposerControllerState } from "./prosemirror/use-composer-controller";

const PROMPT_HISTORY_LIMIT = 20;

export function useComposerPromptHistory(
  composerController: ProseMirrorComposerController,
): {
  appendPromptToHistory: (prompt: string) => void;
  resetHistorySelection: () => void;
} {
  const [promptHistory, setPromptHistory] = useAtom(aPromptHistory);
  const historySelectionIndexRef = useRef<number | null>(null);
  const promptText = useComposerControllerState(
    composerController,
    (controller) => controller.getText(),
  );

  // Reset the selection when the user types anything.
  useEffect(() => {
    if (historySelectionIndexRef.current == null) {
      return;
    }

    const activeHistoryEntry =
      promptHistory[historySelectionIndexRef.current] ?? null;
    if (activeHistoryEntry !== promptText) {
      historySelectionIndexRef.current = null;
    }
  }, [promptHistory, promptText]);

  // Apply the history entry when the user presses up or down.
  useEffect(() => {
    const applyHistoryEntry = (index: number): void => {
      const historyEntry = promptHistory[index];
      if (historyEntry == null) {
        return;
      }
      historySelectionIndexRef.current = index;
      composerController.setText(historyEntry);
      composerController.focus();
    };

    const cycleHistory = (direction: "up" | "down"): boolean => {
      if (promptHistory.length === 0) {
        return false;
      }

      if (!composerController.isCursorAtEnd()) {
        return false;
      }

      const activeIndex = historySelectionIndexRef.current;
      if (activeIndex == null) {
        const currentPrompt = composerController.getText();
        if (currentPrompt.trim().length > 0) {
          return false;
        }
        if (direction === "down") {
          return false;
        }
        applyHistoryEntry(promptHistory.length - 1);
        return true;
      }

      if (direction === "down" && activeIndex === promptHistory.length - 1) {
        historySelectionIndexRef.current = null;
        composerController.setText("");
        composerController.focus();
        return true;
      }

      const nextIndex =
        (activeIndex + (direction === "up" ? -1 : 1) + promptHistory.length) %
        promptHistory.length;
      applyHistoryEntry(nextIndex);
      return true;
    };

    const unsubscribe = setCustomKeymapHandlers(composerController.view, {
      ArrowUp: (event) => {
        const handled = cycleHistory("up");
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
        return handled;
      },
      ArrowDown: (event) => {
        const handled = cycleHistory("down");
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
        return handled;
      },
    });

    return (): void => {
      unsubscribe();
    };
  }, [composerController, promptHistory]);

  const appendPromptToHistory = useCallback(
    (prompt: string): void => {
      if (prompt.trim().length === 0) {
        return;
      }
      const nextHistory = [...promptHistory, prompt];
      const trimmedHistory =
        nextHistory.length <= PROMPT_HISTORY_LIMIT
          ? nextHistory
          : nextHistory.slice(nextHistory.length - PROMPT_HISTORY_LIMIT);
      setPromptHistory(trimmedHistory);
    },
    [promptHistory, setPromptHistory],
  );

  const resetHistorySelection = useCallback(() => {
    historySelectionIndexRef.current = null;
  }, []);

  return {
    appendPromptToHistory,
    resetHistorySelection,
  };
}
