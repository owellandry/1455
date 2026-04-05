const BLOCKING_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
].join(", ");

const TERMINAL_SELECTOR = "[data-codex-terminal]";

export function focusComposerInput(): void {
  const composerElement = document.querySelector<HTMLElement>(
    "[data-codex-composer]",
  );
  if (!composerElement) {
    return;
  }
  requestAnimationFrame(() => {
    composerElement.focus();
  });
}

export function routeCharacterInputToComposer({
  composerController,
  event,
}: {
  composerController: {
    focus: () => void;
    insertTextAtSelection: (text: string) => void;
  };
  event: KeyboardEvent;
}): void {
  if (!isRoutableCharacterKeydown(event)) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (
    isEditableTarget(target) ||
    isTerminalTarget(target) ||
    document.querySelector(BLOCKING_OVERLAY_SELECTOR) != null
  ) {
    return;
  }

  event.preventDefault();
  composerController.focus();
  composerController.insertTextAtSelection(event.key);
}

function isRoutableCharacterKeydown(event: KeyboardEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.metaKey &&
    !event.ctrlKey &&
    event.key !== " " &&
    event.key !== "\u00A0" &&
    event.key.length === 1
  );
}

function isEditableTarget(element: HTMLElement | null): boolean {
  if (element == null) {
    return false;
  }
  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return element.closest("[contenteditable='true']") != null;
}

function isTerminalTarget(element: HTMLElement | null): boolean {
  return element?.closest(TERMINAL_SELECTOR) != null;
}
