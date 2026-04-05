import { atom, useSetAtom } from "jotai";
import sortBy from "lodash/sortBy";
import type { DependencyList } from "react";
import { useEffect } from "react";

import type { MentionUiState } from "@/composer/prosemirror/mentions-shared";
import { scoreQueryMatch } from "@/composer/score-query-match";

type BaseSlashCommand = {
  id: string;
  title: string;
  /** Optional secondary text shown with the command (e.g., current selection). */
  description?: string;
  /** Whether this command should only be available when the composer has no draft text. */
  requiresEmptyComposer: boolean;
  /** Optional group heading to cluster commands in the picker; pass an intl-formatted string. */
  group?: string;
  enabled?: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
  RightIcon?: React.ComponentType<{ className?: string }>;
  /** Include specific dependencies that should retrigger the component. Even if the component is memoized, it needs to be re-registered into the slash command list. */
  dependencies?: DependencyList;
  /** Controls how the command dialog should render when this command is active. */
  presentation?: "default" | "bare";
};

type WithContent = {
  /**
   * If your component needs to capture data from the containing component, wrap your component in a useMemo
   * to ensure that it only gets recreated when the data it depends on changes.
   */
  Content: React.ComponentType<{
    /** Call this when the content renders a new set of Command.Item to focus on the first item of the new list. */
    onItemsChanged: () => void;
    onClose: () => void;
  }>;
  onSelect?: undefined;
};

type WithHandler = {
  onSelect: () => Promise<void>;
  onSelectFromInlineSlash?: (ui: MentionUiState) => Promise<void>;
  Content?: undefined;
};

export type SlashCommand = BaseSlashCommand & (WithContent | WithHandler);

export const aSlashCommands = atom<Array<SlashCommand>>([]);
export const aSlashCommandMenuOpen = atom(false);

const slashCommandOnlyPattern = /^\s*\/[^\s/]*\s*$/;

/**
 * Use this hook to provide a slash command to the composer.
 * Slash commands can capture state and change based on the components they come from.
 *
 * NOTE: the command is NOT keyed on Content or Icon to prevent anonymous components
 * from causing the command to get re-registered on every render.
 */
export function useProvideSlashCommand({
  dependencies = [],
  ...command
}: SlashCommand): void {
  const setSlashCommands = useSetAtom(aSlashCommands);
  const onSelectFromInlineSlash =
    "onSelectFromInlineSlash" in command
      ? command.onSelectFromInlineSlash
      : undefined;
  useEffect(() => {
    setSlashCommands((prev) => {
      return sortBy(
        [...prev.filter((c) => c.id !== command.id), command].filter(
          (c) => c.enabled !== false,
        ),
        [(c): string => c.group ?? "", (c): string => c.title],
      );
    });
    // oxlint-disable-next-line react/exhaustive-deps
  }, [
    command.id,
    command.title,
    command.description,
    command.enabled,
    command.requiresEmptyComposer,
    command.presentation,
    command.onSelect,
    onSelectFromInlineSlash,
    setSlashCommands,
    command.RightIcon,
    command.group,
    // oxlint-disable-next-line react/exhaustive-deps
    ...dependencies,
  ]);
  useEffect(() => {
    return (): void => {
      setSlashCommands((prev) => prev.filter((c) => c.id !== command.id));
    };
  }, [command.id, setSlashCommands]);
}

export function filterCommands(
  commands: Array<SlashCommand>,
  query: string,
): Array<SlashCommand> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return commands;
  }

  const groupOrderIndex = new Map<string | null, number>();
  commands.forEach((command) => {
    const groupKey = command.group ?? null;
    if (!groupOrderIndex.has(groupKey)) {
      groupOrderIndex.set(groupKey, groupOrderIndex.size);
    }
  });

  return sortBy(
    commands
      .map((command) => ({
        command,
        score: scoreQueryMatch(command.title, trimmedQuery),
      }))
      .filter((entry) => entry.score > 0),
    [
      (entry): number =>
        groupOrderIndex.get(entry.command.group ?? null) ??
        Number.MAX_SAFE_INTEGER,
      (entry): number => -entry.score,
      (entry): string => entry.command.title,
    ],
  ).map((entry) => entry.command);
}

export function getAvailableCommandsForComposer(
  commands: Array<SlashCommand>,
  hasDraftText: boolean,
): Array<SlashCommand> {
  if (!hasDraftText) {
    return commands;
  }

  return commands.filter((command) => !command.requiresEmptyComposer);
}

export function hasDraftTextOutsideSlashCommand(text: string): boolean {
  if (text.trim().length === 0) {
    return false;
  }

  return !slashCommandOnlyPattern.test(text);
}
