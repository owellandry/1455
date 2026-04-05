import { persistedAtom } from "@/utils/persisted-atom";

export const aTerminalOpenByKey = persistedAtom<Record<string, boolean>>(
  "terminal-open-by-key",
  {},
);

export function getTerminalOpenByKey(
  terminalOpenByKey: Record<string, boolean>,
  key: string,
): boolean {
  return terminalOpenByKey[key] === true;
}

export function setTerminalOpenByKey(
  terminalOpenByKey: Record<string, boolean>,
  key: string,
  isOpen: boolean,
): Record<string, boolean> {
  if (isOpen) {
    return { ...terminalOpenByKey, [key]: true };
  }
  if (!(key in terminalOpenByKey)) {
    return terminalOpenByKey;
  }
  const { [key]: _removed, ...rest } = terminalOpenByKey;
  return rest;
}
