import { useRef } from "react";

import type { ProseMirrorComposerController } from "@/composer/prosemirror/composer-controller";
import type { MentionUiState } from "@/composer/prosemirror/mentions-shared";
import { slashCommandUiKey } from "@/composer/prosemirror/slash-commands-plugin";
import { useComposerControllerState } from "@/composer/prosemirror/use-composer-controller";

import {
  filterCommands,
  getAvailableCommandsForComposer,
  hasDraftTextOutsideSlashCommand,
  type SlashCommand,
} from "./slash-command";

export function useSlashCommandAutocomplete({
  composerController,
  slashCommands,
  onOpenCommandContent,
}: {
  composerController: ProseMirrorComposerController;
  slashCommands: Array<SlashCommand>;
  onOpenCommandContent: (command: SlashCommand) => void;
}): {
  commands: Array<SlashCommand>;
  handleSlashCommandEvent: (event: "submit" | "close") => void;
  selectCommand: (command: SlashCommand) => Promise<void>;
  setSelectedCommand: (command: SlashCommand | null) => void;
  ui: MentionUiState | undefined;
} {
  const composerText = useComposerControllerState(composerController, (state) =>
    state.getText(),
  );
  const ui = useComposerControllerState(composerController, (controller) =>
    slashCommandUiKey.getState(controller.view.state),
  );
  const selectedCommandRef = useRef<SlashCommand | null>(null);

  const availableCommands = getAvailableCommandsForComposer(
    slashCommands,
    hasDraftTextOutsideSlashCommand(composerText),
  );
  const commands = ui?.active
    ? filterCommands(availableCommands, ui.query)
    : availableCommands;

  const setSelectedCommand = (command: SlashCommand | null): void => {
    selectedCommandRef.current = command;
  };

  const selectCommand = async (command: SlashCommand): Promise<void> => {
    if (!ui?.active) {
      return;
    }

    selectedCommandRef.current = null;

    if (command.Content) {
      composerController.clearSlashCommand(ui);
      onOpenCommandContent(command);
      return;
    }

    if (command.onSelectFromInlineSlash) {
      await command.onSelectFromInlineSlash(ui);
      return;
    }

    composerController.clearSlashCommand(ui);
    await command.onSelect();
  };

  const handleSlashCommandEvent = (event: "submit" | "close"): void => {
    if (event === "submit") {
      const command = selectedCommandRef.current;
      if (command != null) {
        void selectCommand(command);
        return;
      }
    }

    selectedCommandRef.current = null;
  };

  return {
    commands,
    handleSlashCommandEvent,
    selectCommand,
    setSelectedCommand,
    ui,
  };
}
