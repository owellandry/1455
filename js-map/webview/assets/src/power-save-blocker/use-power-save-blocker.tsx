import type React from "react";

/**
 * No-op in non-Electron builds.
 *
 * The Electron implementation lives in `use-power-save-blocker.electron.tsx`.
 */
export function UsePowerSaveBlocker(): React.ReactElement | null {
  return null;
}
