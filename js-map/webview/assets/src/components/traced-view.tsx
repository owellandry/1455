import type React from "react";

/**
 * Non-Electron builds (browser + extension) get a no-op TracedView so call
 * sites don't need platform checks. The real implementation lives in
 * `traced-view.electron.tsx`.
 */
export function TracedView({
  children,
}: {
  name: string;
  attributes?: Record<string, string | number | boolean | undefined>;
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
