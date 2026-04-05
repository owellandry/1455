import type React from "react";
import { useEffect, useState } from "react";

export function DeferInitialRender({
  defer,
  delayMs = 0,
  fallback = null,
  children,
}: {
  defer: boolean;
  delayMs?: number;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  const [isReady, setIsReady] = useState(() => !defer);

  useEffect(() => {
    if (!defer || isReady) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setIsReady(true);
    }, delayMs);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [defer, delayMs, isReady]);

  if (!defer || isReady) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
