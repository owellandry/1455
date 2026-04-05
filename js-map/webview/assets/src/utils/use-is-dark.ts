import { useSyncExternalStore } from "react";

/** Threshold (0-1) below which a color is considered dark based on relative luminance. */
const LUMINANCE_DARK_THRESHOLD = 0.5;

/**
 * React hook that returns whether the current `--color-token-editor-background` resolves
 * to a dark color (relative luminance below threshold). Returns `null` initially while
 * computing, then a boolean. Recomputes on root class / style changes.
 */
type Listener = () => void;

let cachedIsDark: boolean | null = null;
const subscribers = new Set<Listener>();
let rootObserver: MutationObserver | null = null;
let headObserver: MutationObserver | null = null;
let mediaQuery: MediaQueryList | null = null;

function notifySubscribers(): void {
  for (const listener of subscribers) {
    listener();
  }
}

function updateCache(): void {
  const next = computeIsDark();
  if (next === cachedIsDark) {
    return;
  }
  cachedIsDark = next;
  notifySubscribers();
}

function waitForStylesheet(link: HTMLLinkElement): void {
  if (link.rel !== "stylesheet") {
    return;
  }
  if (link.sheet) {
    queueMicrotask((): void => {
      updateCache();
    });
    return;
  }
  const onLoad = (): void => {
    updateCache();
  };
  link.addEventListener("load", onLoad, { once: true });
  link.addEventListener("error", onLoad, { once: true });
}

function handleHeadMutation(mutation: MutationRecord): void {
  if (mutation.type === "childList") {
    let sawStylesheet = false;
    for (const node of Array.from(mutation.addedNodes)) {
      if (node instanceof HTMLLinkElement && node.rel === "stylesheet") {
        waitForStylesheet(node);
        sawStylesheet = true;
      }
    }
    if (mutation.removedNodes.length > 0 || !sawStylesheet) {
      updateCache();
    }
    return;
  }

  if (mutation.type === "attributes") {
    const target = mutation.target;
    if (
      target instanceof HTMLLinkElement &&
      target.rel === "stylesheet" &&
      (mutation.attributeName === "href" ||
        mutation.attributeName === "media" ||
        mutation.attributeName === "rel")
    ) {
      waitForStylesheet(target);
      return;
    }
    updateCache();
  }
}

function startObservers(): void {
  if (typeof window === "undefined" || rootObserver || headObserver) {
    return;
  }

  updateCache();

  rootObserver = new MutationObserver(
    (mutations: Array<MutationRecord>): void => {
      for (const m of mutations) {
        if (m.type === "attributes") {
          updateCache();
          break;
        }
      }
    },
  );
  rootObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const head = document.head;
  if (head) {
    headObserver = new MutationObserver(
      (mutations: Array<MutationRecord>): void => {
        for (const m of mutations) {
          if (m.type === "childList" || m.type === "attributes") {
            handleHeadMutation(m);
            break;
          }
        }
      },
    );
    headObserver.observe(head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "media", "rel"],
    });
  }

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateCache);
  }
}

function stopObservers(): void {
  rootObserver?.disconnect();
  headObserver?.disconnect();
  rootObserver = null;
  headObserver = null;
  mediaQuery?.removeEventListener("change", updateCache);
  mediaQuery = null;
}

function subscribe(listener: Listener): () => void {
  subscribers.add(listener);
  startObservers();
  return (): void => {
    subscribers.delete(listener);
    if (subscribers.size === 0) {
      stopObservers();
    }
  };
}

function getSnapshot(): boolean | null {
  return cachedIsDark;
}

export function useIsDark(): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Compute WCAG relative luminance from 0-1 sRGB channels. */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number): number => {
    const srgb = c / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  // Hex formats #rgb, #rgba, #rrggbb, #rrggbbaa
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const expand = (ch: string): string => ch + ch;
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(expand(hex[0]), 16);
      const g = parseInt(expand(hex[1]), 16);
      const b = parseInt(expand(hex[2]), 16);
      return { r, g, b };
    } else if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }

  // rgb / rgba
  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/\s*,\s*/).map((p) => p.trim());
    if (parts.length >= 3) {
      const r = parseComponent(parts[0]);
      const g = parseComponent(parts[1]);
      const b = parseComponent(parts[2]);
      if (r != null && g != null && b != null) {
        return { r, g, b };
      }
    }
    return null;
  }

  // hsl / hsla
  const hslMatch = trimmed.match(/^hsla?\(([^)]+)\)$/);
  if (hslMatch) {
    const parts = hslMatch[1].split(/\s*,\s*/).map((p) => p.trim());
    if (parts.length >= 3) {
      const h = parseFloat(parts[0]);
      const s = parsePercent(parts[1]);
      const l = parsePercent(parts[2]);
      if ([h, s, l].every((v) => !Number.isNaN(v))) {
        const { r, g, b } = hslToRgb(h, s, l);
        return { r, g, b };
      }
    }
    return null;
  }

  return null;
}

function parseComponent(value: string): number | null {
  if (value.endsWith("%")) {
    const pct = parseFloat(value.slice(0, -1));
    if (Number.isNaN(pct)) {
      return null;
    }
    return Math.round((pct / 100) * 255);
  }
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : Math.max(0, Math.min(255, num));
}

function parsePercent(value: string): number {
  if (value.endsWith("%")) {
    const pct = parseFloat(value.slice(0, -1));
    return Number.isNaN(pct) ? 0 : pct / 100;
  }
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num / 100; // assume already 0-100 if no %
}

// Convert HSL to RGB (0-1 inputs for s & l, 0-360 for h). Returns 0-255 integers.
function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const Hp = (h % 360) / 60;
  const X = C * (1 - Math.abs((Hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (Hp >= 0 && Hp < 1) {
    [r1, g1, b1] = [C, X, 0];
  } else if (Hp >= 1 && Hp < 2) {
    [r1, g1, b1] = [X, C, 0];
  } else if (Hp >= 2 && Hp < 3) {
    [r1, g1, b1] = [0, C, X];
  } else if (Hp >= 3 && Hp < 4) {
    [r1, g1, b1] = [0, X, C];
  } else if (Hp >= 4 && Hp < 5) {
    [r1, g1, b1] = [X, 0, C];
  } else if (Hp >= 5 && Hp < 6) {
    [r1, g1, b1] = [C, 0, X];
  }
  const m = l - C / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function resolveEditorBackgroundColor(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    // Create a temporary element to force full variable resolution, handling nested var() chains / color-mix().
    const el = document.createElement("div");
    el.style.display = "none";
    el.style.backgroundColor = "var(--color-token-editor-background)";
    document.body.appendChild(el);
    const computed = getComputedStyle(el).backgroundColor || "";
    el.remove();
    return computed;
  } catch {
    return null;
  }
}

function computeIsDark(): boolean | null {
  const resolved = resolveEditorBackgroundColor();
  if (!resolved) {
    return null;
  }
  const rgb = parseColor(resolved);
  if (!rgb) {
    return null;
  }
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return lum < LUMINANCE_DARK_THRESHOLD;
}
