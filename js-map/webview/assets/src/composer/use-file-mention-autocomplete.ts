import { useRef } from "react";

import type { AtMentionMenuItem } from "./at-mention-source-types";
import { mentionUiKey } from "./prosemirror/at-mentions-plugin";
import type { ProseMirrorComposerController } from "./prosemirror/composer-controller";
import type { MentionUiState } from "./prosemirror/mentions-shared";
import { useComposerControllerState } from "./prosemirror/use-composer-controller";

/** Handles @-mention selection and submission lifecycle for the composer. */
export function useAtMentionAutocomplete(
  composerController: ProseMirrorComposerController,
): {
  ui: MentionUiState | undefined;
  addMention: (item: AtMentionMenuItem) => void;
  setSelectedMention: (item: AtMentionMenuItem | null) => void;
  handleMentionEvent: (event: "submit" | "close") => void;
} {
  const ui = useComposerControllerState(composerController, (controller) =>
    mentionUiKey.getState(controller.view.state),
  );
  const selectedMentionRef = useRef<AtMentionMenuItem | null>(null);

  const setSelectedMention = (item: AtMentionMenuItem | null): void => {
    selectedMentionRef.current = item;
  };

  const closeUi = (): void => {
    selectedMentionRef.current = null;
  };

  const addMention = (item: AtMentionMenuItem): void => {
    if (!ui) {
      return;
    }

    item.insertMention({
      composerController,
      mentionState: ui,
    });
  };

  const handleMentionEvent = (event: "submit" | "close"): void => {
    switch (event) {
      case "submit": {
        if (ui && selectedMentionRef.current) {
          selectedMentionRef.current.insertMention({
            composerController,
            mentionState: ui,
          });
        }
        closeUi();
        break;
      }
      case "close": {
        closeUi();
        break;
      }
    }
  };

  return { ui, addMention, setSelectedMention, handleMentionEvent };
}
