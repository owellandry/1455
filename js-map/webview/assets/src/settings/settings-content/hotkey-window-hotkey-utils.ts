type HotkeyWindowHotkeyEvent = {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "AltGraph", "Shift"]);

function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

function getPrintableKeyTokenFromCode(code?: string): string | null {
  if (code == null) {
    return null;
  }

  if (/^Key[A-Z]$/.test(code)) {
    return code.slice("Key".length);
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.slice("Digit".length);
  }
  if (code === "Space") {
    return "Space";
  }

  return null;
}

function normalizeKeyToken(key: string, code?: string): string | null {
  if (isModifierKey(key)) {
    return null;
  }

  const printableKeyToken = getPrintableKeyTokenFromCode(code);
  if (printableKeyToken != null) {
    return printableKeyToken;
  }

  if (key === " " || key === "\u00A0") {
    return "Space";
  }
  if (key === "+") {
    return "Plus";
  }

  switch (key) {
    case "Escape":
      return "Esc";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    default:
      break;
  }

  if (/^f\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
}

export function hotkeyWindowAcceleratorFromKeyboardEvent(
  event: HotkeyWindowHotkeyEvent,
): string | null {
  const keyToken = normalizeKeyToken(event.key, event.code);
  if (keyToken == null) {
    return null;
  }

  const parts: Array<string> = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.metaKey) {
    parts.push("Command");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  parts.push(keyToken);
  return parts.join("+");
}
