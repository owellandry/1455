import {
  electronMenuAccelerators,
  type ElectronMenuAcceleratorId,
} from "protocol";

export function detectIsMacOS(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform ?? "";
  return platform.startsWith("Mac");
}

export function detectIsLinux(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform ?? "";
  return platform.startsWith("Linux");
}

export function formatAccelerator(
  accelerator: string,
  isMac: boolean = detectIsMacOS(),
  isLinux: boolean = !isMac && detectIsLinux(),
): string {
  const parts = accelerator.split("+").filter(Boolean);

  const modifiers: Set<string> = new Set();
  let key: string | null = null;

  for (const part of parts) {
    switch (part) {
      case "CmdOrCtrl":
        modifiers.add(isMac ? "Command" : "Ctrl");
        break;
      case "Command":
      case "Cmd":
        modifiers.add(isMac ? "Command" : isLinux ? "Super" : "Win");
        break;
      case "Control":
      case "Ctrl":
        modifiers.add("Ctrl");
        break;
      case "Alt":
      case "Option":
        modifiers.add("Alt");
        break;
      case "Shift":
        modifiers.add("Shift");
        break;
      default:
        key = part;
        break;
    }
  }

  const keyValue = isMac && key === "Plus" ? "+" : (key ?? "");
  if (isMac) {
    const modifierSymbols = {
      Ctrl: "⌃",
      Alt: "⌥",
      Shift: "⇧",
      Command: "⌘",
    } as const;

    // Apple HIG: list modifiers as Control, Option, Shift, Command.
    // https://developer.apple.com/design/human-interface-guidelines/keyboards
    const modifierOrder: Array<keyof typeof modifierSymbols> = [
      "Ctrl",
      "Alt",
      "Shift",
      "Command",
    ];
    const renderedModifiers = modifierOrder
      .filter((modifier) => modifiers.has(modifier))
      .map((modifier) => modifierSymbols[modifier])
      .join("");

    return `${renderedModifiers}${keyValue}`;
  }

  const normalizedModifiers = Array.from(modifiers).map((modifier) =>
    modifier === "Command" ? "Cmd" : modifier,
  );
  const modifierOrder: Array<string> = [
    "Ctrl",
    "Alt",
    "Shift",
    "Cmd",
    "Super",
    "Win",
  ];
  const orderedModifiers = modifierOrder.filter((modifier) =>
    normalizedModifiers.includes(modifier),
  );

  const renderedParts = [...orderedModifiers, keyValue].filter(Boolean);
  return renderedParts.join("+");
}

export function getMenuShortcutLabel(
  id: ElectronMenuAcceleratorId,
  isMac: boolean = detectIsMacOS(),
): string | null {
  if (__WINDOW_TYPE__ !== "electron") {
    return null;
  }
  return formatAccelerator(electronMenuAccelerators[id], isMac);
}

export function isElectronMenuAcceleratorId(
  value: string,
): value is ElectronMenuAcceleratorId {
  return Object.prototype.hasOwnProperty.call(electronMenuAccelerators, value);
}
