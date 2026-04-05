import { atom, useSetAtom } from "jotai";
import sortBy from "lodash/sortBy";
import { useEffect, useEffectEvent } from "react";

export const aCommandMenuEntries = atom<Array<CommandMenuEntry>>([]);

export function useRegisterCommandMenuEntry(entry: CommandMenuEntry): void {
  const setEntries = useSetAtom(aCommandMenuEntries);
  const dependencyKey = entry.dependencies
    ? entry.dependencies
        .map((dependency) => dependencyToKey(dependency))
        .join("|")
    : "";
  const handleEntryChanged = useEffectEvent(() => {
    setEntries((prev) => {
      let found = false;
      const nextEntries = [...prev].map((item) => {
        if (item.id === entry.id) {
          found = true;
          return entry;
        }
        return item;
      });

      if (!found) {
        nextEntries.push(entry);
      }

      return sortBy(
        nextEntries.filter((item) => item.enabled !== false),
        [(item): number => item.order ?? 0, (item): string => item.id],
      );
    });
  });

  useEffect(() => {
    handleEntryChanged();
  }, [entry.id, entry.enabled, entry.order, dependencyKey]);

  useEffect(() => {
    return (): void => {
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    };
  }, [entry.id, setEntries]);
}

type CommandMenuEntryDependency = string | number | boolean | null | undefined;

type CommandMenuEntry = {
  id: string;
  enabled?: boolean;
  order?: number;
  dependencies?: Array<CommandMenuEntryDependency>;
  render: (close: () => void) => React.ReactElement | null;
};

export type { CommandMenuEntry };

function dependencyToKey(dependency: CommandMenuEntryDependency): string {
  if (dependency == null) {
    return "";
  }
  return String(dependency);
}
