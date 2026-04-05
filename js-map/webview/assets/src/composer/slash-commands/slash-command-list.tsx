import { Command } from "cmdk";
import type React from "react";

import type { SlashCommand } from "./slash-command";
import { SlashCommandItem } from "./slash-command-item";

export function SlashCommandList({
  commands,
  onCommandSelect,
}: {
  commands: Array<SlashCommand>;
  onCommandSelect: (command: SlashCommand) => void;
}): React.ReactElement | null {
  const renderedItems: Array<React.ReactElement> = [];
  let currentGroup: string | null = null;
  /* Buffer consecutive commands so we wrap each group label once before rendering. */
  let buffer: Array<SlashCommand> = [];

  const renderCommand = (command: SlashCommand): React.ReactElement => {
    return (
      <SlashCommandItem
        key={command.id}
        value={command.title}
        title={command.title}
        description={command.description}
        onSelect={() => {
          onCommandSelect(command);
        }}
        LeftIcon={command.Icon}
        RightIcon={command.RightIcon}
      />
    );
  };

  const flushBuffer = (): void => {
    if (buffer.length === 0) {
      return;
    }
    if (currentGroup) {
      renderedItems.push(
        <Command.Group
          key={`group-${currentGroup}`}
          heading={
            <span className="block px-2 pt-2 text-sm text-token-description-foreground">
              {currentGroup}
            </span>
          }
          className="flex flex-col"
          style={{ gap: "var(--spacing)" }}
        >
          {buffer.map(renderCommand)}
        </Command.Group>,
      );
    } else {
      renderedItems.push(...buffer.map(renderCommand));
    }
    buffer = [];
  };

  commands.forEach((command) => {
    const groupLabel = command.group ?? null;
    if (groupLabel !== currentGroup) {
      flushBuffer();
      currentGroup = groupLabel;
    }
    buffer.push(command);
  });
  flushBuffer();

  if (renderedItems.length === 0) {
    return null;
  }

  return <>{renderedItems}</>;
}
