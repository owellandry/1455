import {
  getPersistedValue,
  setPersistedValue,
} from "@/utils/persisted-atom-store";

export const SIDEBAR_DEFAULT_WIDTH = 300;
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 520;
// Ensure sidebar never eats the entire viewport; leaves 320px for main content.
const MAIN_CONTENT_MIN_WIDTH = 320;
const SIDEBAR_WIDTH_STORAGE_KEY = "sidebar-width";

export function getInitialSidebarWidth(): number {
  return normalizeSidebarWidth(
    getPersistedValue(SIDEBAR_WIDTH_STORAGE_KEY, SIDEBAR_DEFAULT_WIDTH),
  );
}

export function persistSidebarWidth(width: number): void {
  setPersistedValue(SIDEBAR_WIDTH_STORAGE_KEY, normalizeSidebarWidth(width));
}

export function normalizeSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  // Clamp to our min/max; viewport gap is enforced by CSS clamp.
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

/**
 * Uses CSS clamp + min() to keep the sidebar within sensible bounds and
 * responsive to the viewport without re-running JS math on every drag event.
 */
export function sidebarWidthCss(width: number): string {
  const normalizedWidth = normalizeSidebarWidth(width);
  return `clamp(${SIDEBAR_MIN_WIDTH}px, ${normalizedWidth}px, min(${SIDEBAR_MAX_WIDTH}px, calc(100vw - ${MAIN_CONTENT_MIN_WIDTH}px)))`;
}
