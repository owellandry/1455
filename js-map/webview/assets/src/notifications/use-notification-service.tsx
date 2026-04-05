// Non-electron (VS Code extension / browser) disabled implementation.
// Electron gets `use-notification-service.electron.tsx` via platform module
// resolution and starts the notification service there.
export function UseNotificationService(): null {
  return null;
}
