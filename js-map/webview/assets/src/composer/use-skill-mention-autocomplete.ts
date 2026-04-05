import { useRef } from "react";

import type { ComposerMentionInsertItem } from "./mention-item";
import type { ProseMirrorComposerController } from "./prosemirror/composer-controller";
import type { MentionUiState } from "./prosemirror/mentions-shared";
import { skillMentionUiKey } from "./prosemirror/skill-mentions-plugin";
import { useComposerControllerState } from "./prosemirror/use-composer-controller";

/** Handles skill mention selection and submission lifecycle for the composer. */
export function useSkillMentionAutocomplete(
  composerController: ProseMirrorComposerController,
): {
  ui: MentionUiState | undefined;
  addMention: (item: ComposerMentionInsertItem) => void;
  setSelectedMention: (item: ComposerMentionInsertItem | null) => void;
  handleMentionEvent: (event: "submit" | "close") => void;
} {
  const ui = useComposerControllerState(composerController, (controller) =>
    skillMentionUiKey.getState(controller.view.state),
  );
  const selectedMentionRef = useRef<ComposerMentionInsertItem | null>(null);

  const setSelectedMention = (item: ComposerMentionInsertItem | null): void => {
    selectedMentionRef.current = item;
  };

  const addMention = (item: ComposerMentionInsertItem): void => {
    if (!ui) {
      return;
    }

    composerController.insertMention(item, ui);
  };

  const handleMentionEvent = (event: "submit" | "close"): void => {
    if (event === "submit") {
      const selectedMention = selectedMentionRef.current;
      if (ui && selectedMention != null) {
        composerController.insertMention(selectedMention, ui);
      }
    }

    selectedMentionRef.current = null;
  };

  return { ui, addMention, setSelectedMention, handleMentionEvent };
}
