// Non-electron (VS Code extension / browser) disabled implementation.
// Electron gets `use-app-badge-count.electron.tsx` via platform module
// resolution and updates the badge there.
export function UseAppBadgeCount(): null {
  return null;
}
