import type React from "react";

export function AppSunsetGate({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // No-op fallback for non-electron hosts; the electron-only variant lives in
  // `app-sunset-gate.electron.tsx`.
  return <>{children}</>;
}
