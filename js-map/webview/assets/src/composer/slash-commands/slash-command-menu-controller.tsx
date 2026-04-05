import clsx from "clsx";
import { Command } from "cmdk";
import { useAtomValue, useSetAtom } from "jotai";
import { useScope } from "maitai";
import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation } from "react-router";

import { AutocompleteOverlay } from "@/composer/autocomplete-overlay";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { useGate } from "@/statsig/statsig";

import {
  useComposerController,
  useComposerControllerState,
} from "../prosemirror/use-composer-controller";
import { useAboveComposerPortalContainer } from "../use-above-composer-portal-container";
import {
  aSlashCommandMenuOpen,
  aSlashCommands,
  filterCommands,
  getAvailableCommandsForComposer,
  hasDraftTextOutsideSlashCommand,
  type SlashCommand,
} from "./slash-command";
import { SlashCommandAutocompleteOverlay } from "./slash-command-autocomplete-overlay";
import { SlashCommandList } from "./slash-command-list";
import { useSlashCommandAutocomplete } from "./use-slash-command-autocomplete";

import "./cmdk.css";
import hotkeyWindowStyles from "@/hotkey-window/hotkey-window.module.css";

export function SlashCommandMenuController({
  requestedSlashCommandId = null,
}: {
  requestedSlashCommandId?: string | null;
}): React.ReactElement | null {
  const location = useLocation();
  const isHotkeyWindowHome = location.pathname === "/hotkey-window";
  const slashCommandsEnabled = useGate(
    __statsigName("codex-extension-slash-commands"),
  );
  const composerController = useComposerController();
  const composerText = useComposerControllerState(composerController, (state) =>
    state.getText(),
  );
  const intl = useIntl();
  const [slashCommand, setSlashCommand] = useState<SlashCommand | null>(null);
  const [inlineCommandId, setInlineCommandId] = useState<string | null>(null);
  const slashCommands = useAtomValue(aSlashCommands);
  const availableSlashCommands = getAvailableCommandsForComposer(
    slashCommands,
    hasDraftTextOutsideSlashCommand(composerText),
  );
  const setSlashCommandMenuOpen = useSetAtom(aSlashCommandMenuOpen);
  const inlineCommand = inlineCommandId
    ? (slashCommands.find((entry) => entry.id === inlineCommandId) ?? null)
    : null;
  const [search, setSearch] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [open, setOpen] = useState(false);
  const container = useAboveComposerPortalContainer();
  const scope = useScope(AppScope);

  const hotkeyWindowHomeMenuShellClass = isHotkeyWindowHome
    ? clsx(hotkeyWindowStyles.homeInlineMenuShell, "z-40")
    : "left-0 right-0 z-30";
  const hotkeyWindowHomeMenuPanelClass = isHotkeyWindowHome
    ? clsx(hotkeyWindowStyles.homeInlineMenuPanel, "origin-bottom")
    : "mb-1.5 origin-bottom";

  const focusComposer = (): void => {
    requestAnimationFrame(() => {
      composerController.focus();
    });
  };

  const closeInlineCommand = (): void => {
    setInlineCommandId(null);
    focusComposer();
  };

  useEffect(() => {
    return (): void => {
      setSlashCommandMenuOpen(false);
    };
  }, [setSlashCommandMenuOpen]);

  const resetDialogState = (): void => {
    setSearch("");
    setSelectedValue("");
    setSlashCommand(null);
  };

  const openDialog = (): void => {
    if (!open) {
      scope.get(productEventLogger$).log({
        eventName: "codex_slash_commands_menu_opened",
      });
    }

    setOpen(true);
  };

  const closeDialog = (): void => {
    resetDialogState();
    setOpen(false);
    focusComposer();
  };

  const openCommandContent = (command: SlashCommand): void => {
    resetDialogState();
    if (command.presentation === "bare") {
      setInlineCommandId(command.id);
      setOpen(false);
      focusComposer();
      return;
    }

    setInlineCommandId(null);
    setSlashCommand(command);
    openDialog();
  };

  const openRequestedCommandContentEvent = useEffectEvent(
    (commandId: string) => {
      const command =
        slashCommands.find((entry) => entry.id === commandId) ?? null;
      if (command == null || command.Content == null) {
        return;
      }

      openCommandContent(command);
    },
  );

  const slashCommandAutocomplete = useSlashCommandAutocomplete({
    composerController,
    slashCommands,
    onOpenCommandContent: openCommandContent,
  });
  const isAnySlashUiOpen =
    open ||
    inlineCommandId != null ||
    slashCommandAutocomplete.ui?.active === true;
  const handleSlashCommandUiEvent = useEffectEvent(
    (event: "submit" | "close") => {
      slashCommandAutocomplete.handleSlashCommandEvent(event);
    },
  );

  useEffect(() => {
    const submitHandler = (): void => {
      handleSlashCommandUiEvent("submit");
    };
    const closeHandler = (): void => {
      handleSlashCommandUiEvent("close");
    };

    composerController.eventEmitter.addListener(
      "slash-command-ui-submit",
      submitHandler,
    );
    composerController.eventEmitter.addListener(
      "slash-command-ui-close",
      closeHandler,
    );

    return (): void => {
      composerController.eventEmitter.removeListener(
        "slash-command-ui-submit",
        submitHandler,
      );
      composerController.eventEmitter.removeListener(
        "slash-command-ui-close",
        closeHandler,
      );
    };
  }, [composerController]);

  useEffect(() => {
    setSlashCommandMenuOpen(isAnySlashUiOpen);
  }, [isAnySlashUiOpen, setSlashCommandMenuOpen]);

  useEffect(() => {
    if (requestedSlashCommandId == null) {
      return;
    }

    openRequestedCommandContentEvent(requestedSlashCommandId);
  }, [requestedSlashCommandId, slashCommands]);

  if (!slashCommandsEnabled || container == null) {
    return null;
  }

  return (
    <>
      <AutocompleteOverlay
        isActive={slashCommandAutocomplete.ui?.active === true}
      >
        <SlashCommandAutocompleteOverlay
          autocomplete={slashCommandAutocomplete}
        />
      </AutocompleteOverlay>
      <Command.Dialog
        title={intl.formatMessage({
          id: "composer.slashCommands.dialogTitle",
          defaultMessage: "Slash commands",
          description: "Title for the slash command dialog",
        })}
        container={container}
        open={open}
        shouldFilter={slashCommand?.Content != null}
        label={intl.formatMessage({
          id: "composer.slashCommands.dialogLabel",
          defaultMessage: "Slash command menu",
          description: "Accessibility label for the slash command dialog",
        })}
        overlayClassName="hidden"
        className={hotkeyWindowHomeMenuPanelClass}
        contentClassName={clsx(
          "absolute bottom-0 bg-transparent p-0 shadow-none outline-none focus-visible:outline-none",
          hotkeyWindowHomeMenuShellClass,
        )}
        value={selectedValue}
        onValueChange={(value) => {
          setSelectedValue(value ?? "");
        }}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openDialog();
            return;
          }
          closeDialog();
        }}
      >
        <Command.Input
          placeholder={intl.formatMessage({
            id: "composer.slashCommands.inputPlaceholder",
            defaultMessage: "Search",
            description: "Placeholder for the slash command input",
          })}
          value={search}
          onValueChange={setSearch}
        />
        <Command.List>
          {slashCommand?.Content ? (
            <slashCommand.Content
              onItemsChanged={() => {
                setSelectedValue("");
              }}
              onClose={closeDialog}
            />
          ) : (
            <SlashCommandList
              commands={filterCommands(availableSlashCommands, search)}
              onCommandSelect={async (command) => {
                scope.get(productEventLogger$).log({
                  eventName: "codex_slash_command_selected",
                  metadata: {
                    command_id: command.id,
                    ...(command.group
                      ? {
                          command_group: command.group,
                        }
                      : {}),
                  },
                });
                if (command.Content) {
                  openCommandContent(command);
                  return;
                }
                await command.onSelect?.();
                closeDialog();
              }}
            />
          )}
          <Command.Empty>
            <FormattedMessage
              id="composer.slashCommands.noResults"
              defaultMessage="No commands"
              description="Shown when no slash commands match"
            />
          </Command.Empty>
        </Command.List>
      </Command.Dialog>
      {inlineCommand?.Content
        ? createPortal(
            <div
              className={clsx(
                "absolute bottom-0 bg-transparent p-0 shadow-none outline-none focus-visible:outline-none",
                hotkeyWindowHomeMenuShellClass,
              )}
            >
              <div className={hotkeyWindowHomeMenuPanelClass}>
                <inlineCommand.Content
                  onItemsChanged={() => {
                    setSelectedValue("");
                  }}
                  onClose={closeInlineCommand}
                />
              </div>
            </div>,
            container,
          )
        : null}
    </>
  );
}
