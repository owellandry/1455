import clsx from "clsx";
import type { MouseEventHandler, ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import {
  MentionListContainer,
  MentionListPlaceholderRow,
  MentionListRow,
  MentionListSectionHeader,
} from "@/composer/mention-list";
import { useListNavigation } from "@/utils/list-navigation";

import { computeHighlightChunks, type TextChunk } from "./highlight-chunks";
import type { SlashCommand } from "./slash-command";
import type { useSlashCommandAutocomplete } from "./use-slash-command-autocomplete";

export function SlashCommandAutocompleteOverlay({
  autocomplete,
}: {
  autocomplete: ReturnType<typeof useSlashCommandAutocomplete>;
}): ReactElement | null {
  const commands = autocomplete.commands;
  const isActive = autocomplete.ui?.active === true;
  const query = autocomplete.ui?.query ?? "";

  const { highlightedIndex, listRef, getItemProps } =
    useListNavigation<SlashCommand>({
      items: commands,
      isActive,
      captureWindowKeydown: true,
      preserveHighlightOnItemsChange: true,
      onSelect: (command) => {
        void autocomplete.selectCommand(command);
      },
      onHighlight: (command) => {
        autocomplete.setSelectedCommand(command);
      },
    });

  if (!isActive) {
    return null;
  }

  return (
    <MentionListContainer className="max-h-[320px]">
      <div
        ref={listRef}
        className="vertical-scroll-fade-mask flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {commands.length === 0 ? (
          <MentionListPlaceholderRow>
            <FormattedMessage
              id="composer.slashCommands.noResults"
              defaultMessage="No commands"
              description="Shown when no slash commands match"
            />
          </MentionListPlaceholderRow>
        ) : (
          <SlashCommandGroups
            commands={commands}
            getItemProps={getItemProps}
            highlightedIndex={highlightedIndex}
            query={query}
          />
        )}
      </div>
    </MentionListContainer>
  );
}

function SlashCommandGroups({
  commands,
  getItemProps,
  highlightedIndex,
  query,
}: {
  commands: Array<SlashCommand>;
  getItemProps: (index: number) => {
    onClick: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    onMouseEnter: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    "aria-selected": boolean;
    "data-list-navigation-item": "true";
  };
  highlightedIndex: number;
  query: string;
}): ReactElement {
  const groupedCommands: Array<{
    commands: Array<{ command: SlashCommand; index: number }>;
    label: string | null;
  }> = [];
  let currentGroup: {
    commands: Array<{ command: SlashCommand; index: number }>;
    label: string | null;
  } | null = null;

  commands.forEach((command, index) => {
    const label = command.group ?? null;
    if (currentGroup?.label !== label) {
      currentGroup = { label, commands: [] };
      groupedCommands.push(currentGroup);
    }
    currentGroup.commands.push({ command, index });
  });

  const hasSectionHeaders = groupedCommands.length > 1;

  return (
    <>
      {groupedCommands.map((group) => (
        <div key={group.label ?? "__ungrouped__"}>
          {hasSectionHeaders && group.label ? (
            <MentionListSectionHeader>{group.label}</MentionListSectionHeader>
          ) : null}
          {group.commands.map(({ command, index }) => (
            <SlashCommandRow
              key={command.id}
              command={command}
              getItemProps={getItemProps}
              highlighted={index === highlightedIndex}
              index={index}
              query={query}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function SlashCommandRow({
  command,
  getItemProps,
  highlighted,
  index,
  query,
}: {
  command: SlashCommand;
  getItemProps: (index: number) => {
    onClick: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    onMouseEnter: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    "aria-selected": boolean;
    "data-list-navigation-item": "true";
  };
  highlighted: boolean;
  index: number;
  query: string;
}): ReactElement {
  const chunks: Array<TextChunk> = computeHighlightChunks(command.title, query);
  const hasMatch = chunks.some((chunk) => chunk.isMatch);

  return (
    <MentionListRow
      getItemProps={getItemProps}
      highlighted={highlighted}
      itemIndex={index}
    >
      <div className="flex w-full items-center gap-2">
        {command.Icon ? <command.Icon className="icon-xs shrink-0" /> : null}
        <div
          className={clsx(
            command.description
              ? "max-w-[60%] flex-none truncate"
              : "min-w-0 flex-1 truncate",
          )}
        >
          {chunks.map((chunk, chunkIndex) => (
            <span
              key={chunkIndex}
              className={clsx(
                !chunk.isMatch &&
                  hasMatch &&
                  "text-token-description-foreground",
              )}
            >
              {chunk.text}
            </span>
          ))}
        </div>
        {command.description ? (
          <span className="min-w-0 flex-1 truncate text-sm text-token-description-foreground">
            {command.description}
          </span>
        ) : null}
        {command.RightIcon ? (
          <command.RightIcon className="icon-xs shrink-0" />
        ) : null}
      </div>
    </MentionListRow>
  );
}
