import { useEffect, useEffectEvent, useRef } from "react";

import { detectIsMacOS } from "./electron-menu-shortcuts";

type ParsedAccelerator = {
  key: string;
  requireCtrl: boolean;
  requireMeta: boolean;
  requireAlt: boolean;
  requireShift: boolean;
};

function parseAccelerator(
  accelerator: string,
  isMac: boolean,
): ParsedAccelerator {
  const parts = accelerator.split("+").filter(Boolean);

  let key: string | null = null;
  let requireCtrl = false;
  let requireMeta = false;
  let requireAlt = false;
  let requireShift = false;

  for (const part of parts) {
    switch (part) {
      case "CmdOrCtrl":
        if (isMac) {
          requireMeta = true;
        } else {
          requireCtrl = true;
        }
        break;
      case "Command":
      case "Cmd":
        requireMeta = true;
        break;
      case "Control":
      case "Ctrl":
        requireCtrl = true;
        break;
      case "Alt":
      case "Option":
        requireAlt = true;
        break;
      case "Shift":
        requireShift = true;
        break;
      default:
        key = part.toLowerCase();
        break;
    }
  }

  return {
    key: key ?? "",
    requireCtrl,
    requireMeta,
    requireAlt,
    requireShift,
  };
}

function eventIsWithin(event: KeyboardEvent, selector: string): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }
  return event.target.closest(selector) != null;
}

function matchesAccelerator(
  event: KeyboardEvent,
  parsed: ParsedAccelerator,
): boolean {
  if (!parsed.key) {
    return false;
  }

  const key = event.key.toLowerCase();
  if (key !== parsed.key) {
    return false;
  }

  // We require an exact modifier match so shortcuts do not trigger unexpectedly
  // when additional modifiers are pressed.
  if (event.ctrlKey !== parsed.requireCtrl) {
    return false;
  }
  if (event.metaKey !== parsed.requireMeta) {
    return false;
  }
  if (event.altKey !== parsed.requireAlt) {
    return false;
  }
  if (event.shiftKey !== parsed.requireShift) {
    return false;
  }

  return true;
}

export function useHotkey({
  accelerator,
  enabled = true,
  onKeyDown,
  onKeyUp,
  capture = true,
  ignoreWithin,
}: {
  accelerator: string;
  enabled?: boolean;
  onKeyDown: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  capture?: boolean;
  ignoreWithin?: string;
}): void {
  const isMac = detectIsMacOS();
  const parsedAccelerator = parseAccelerator(accelerator, isMac);

  const activeRef = useRef(false);
  const hasKeyUpHandler = onKeyUp != null;

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) {
      return;
    }
    if (event.repeat) {
      return;
    }
    if (ignoreWithin && eventIsWithin(event, ignoreWithin)) {
      return;
    }
    if (!matchesAccelerator(event, parsedAccelerator)) {
      return;
    }

    activeRef.current = true;
    onKeyDown?.(event);
  });

  const handleKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (!activeRef.current) {
      return;
    }
    // We don't check for exact match to avoid timing issues when the user releases the chord not all at once
    if (event.key.toLowerCase() !== parsedAccelerator.key.toLowerCase()) {
      return;
    }

    activeRef.current = false;
    onKeyUp?.(event);
  });

  useEffect(() => {
    if (!enabled) {
      activeRef.current = false;
      return;
    }

    window.addEventListener("keydown", handleKeyDown, { capture });
    if (hasKeyUpHandler) {
      window.addEventListener("keyup", handleKeyUp, { capture });
    }

    return (): void => {
      window.removeEventListener("keydown", handleKeyDown, { capture });
      if (hasKeyUpHandler) {
        window.removeEventListener("keyup", handleKeyUp, { capture });
      }
      activeRef.current = false;
    };
  }, [capture, enabled, hasKeyUpHandler]);
}
