type TerminalClipboardTarget = {
  getSelection: () => string;
  hasSelection: () => boolean;
  paste: (text: string) => void;
};

type TerminalClipboard = {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
};

type TerminalKeyboardShortcutEvent = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  preventDefault: () => void;
  shiftKey: boolean;
  stopPropagation: () => void;
};

const START_OF_LINE = "\u0001";
const END_OF_LINE = "\u0005";

export function handleTerminalKeyboardShortcut({
  clipboard,
  event,
  sendText,
  term,
}: {
  clipboard?: TerminalClipboard;
  event: TerminalKeyboardShortcutEvent;
  sendText: (text: string) => void;
  term: TerminalClipboardTarget;
}): boolean {
  if (clipboard != null) {
    if (isTerminalCopyShortcut(event, term.hasSelection())) {
      consumeEvent(event);
      const selection = term.getSelection();
      if (selection.length > 0) {
        void clipboard.writeText(selection).catch(() => undefined);
      }
      return false;
    }

    if (isTerminalPasteShortcut(event)) {
      consumeEvent(event);
      void clipboard
        .readText()
        .then((text) => {
          if (text.length > 0) {
            term.paste(text);
          }
        })
        .catch(() => undefined);
      return false;
    }
  }

  const navigationInput = getTerminalNavigationInput(event);
  if (navigationInput != null) {
    consumeEvent(event);
    sendText(navigationInput);
    return false;
  }

  return true;
}

function consumeEvent(event: TerminalKeyboardShortcutEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function isTerminalCopyShortcut(
  event: TerminalKeyboardShortcutEvent,
  hasSelection: boolean,
): boolean {
  return (
    (hasSelection && isCtrlShortcut(event, "c")) ||
    isCtrlShiftShortcut(event, "c") ||
    isInsertShortcut(event, { ctrlKey: true, shiftKey: false })
  );
}

function isTerminalPasteShortcut(
  event: TerminalKeyboardShortcutEvent,
): boolean {
  return (
    isCtrlShiftShortcut(event, "v") ||
    isInsertShortcut(event, { ctrlKey: false, shiftKey: true })
  );
}

function getTerminalNavigationInput(
  event: TerminalKeyboardShortcutEvent,
): string | null {
  if (isLineNavigationShortcut(event, ["ArrowLeft", "ArrowUp"])) {
    return START_OF_LINE;
  }
  if (isLineNavigationShortcut(event, ["ArrowRight", "ArrowDown"])) {
    return END_OF_LINE;
  }

  return null;
}

function isCtrlShiftShortcut(
  event: TerminalKeyboardShortcutEvent,
  key: string,
): boolean {
  return (
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.key.toLowerCase() === key
  );
}

function isCtrlShortcut(
  event: TerminalKeyboardShortcutEvent,
  key: string,
): boolean {
  return (
    event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.key.toLowerCase() === key
  );
}

function isInsertShortcut(
  event: TerminalKeyboardShortcutEvent,
  shortcut: { ctrlKey: boolean; shiftKey: boolean },
): boolean {
  return (
    event.ctrlKey === shortcut.ctrlKey &&
    event.shiftKey === shortcut.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.key.toLowerCase() === "insert"
  );
}

function isLineNavigationShortcut(
  event: TerminalKeyboardShortcutEvent,
  keys: Array<string>,
): boolean {
  return (
    event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    keys.includes(event.key)
  );
}
