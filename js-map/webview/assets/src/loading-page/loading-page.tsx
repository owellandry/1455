import clsx from "clsx";
import type React from "react";
import { useState } from "react";

import { CodexLogoShimmer } from "@/components/codex-logo-shimmer";

export function LoadingPage({
  overlay = false,
  fillParent = false,
  debugName,
}: {
  overlay?: boolean;
  fillParent?: boolean;
  debugName?: string;
}): React.ReactElement {
  const [isDebugNameVisible, setIsDebugNameVisible] = useState(false);
  const canRevealDebugName = __DEV__ && debugName != null;

  return (
    <div
      className={clsx(
        "flex items-center justify-center",
        overlay
          ? "absolute inset-0 z-10 bg-token-bg-primary/70"
          : fillParent
            ? "absolute inset-0 bg-transparent"
            : "relative size-full bg-transparent",
      )}
      onClick={() => {
        if (!canRevealDebugName) {
          return;
        }
        setIsDebugNameVisible((isVisible) => !isVisible);
      }}
    >
      {overlay || fillParent ? null : (
        <div className="draggable absolute inset-x-0 top-0 electron:h-toolbar browser:h-toolbar extension:h-toolbar-sm" />
      )}
      <div className="flex flex-col items-center gap-2">
        <CodexLogoShimmer className="size-14" />
        {canRevealDebugName && isDebugNameVisible ? (
          <div className="font-mono text-xs text-token-text-secondary">
            {debugName}
          </div>
        ) : null}
      </div>
    </div>
  );
}
