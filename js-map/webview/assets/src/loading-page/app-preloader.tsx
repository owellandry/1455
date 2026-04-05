import type React from "react";

import { LoadingPage } from "./loading-page";

/**
 * Temporary: use the simple spinner preloader.
 * When ready, add `AnimatedIcon` with `animation="loader"` instead.
 */
export function AppPreloader({
  debugName,
}: {
  debugName?: string;
}): React.ReactElement {
  return <LoadingPage debugName={debugName} />;
}
