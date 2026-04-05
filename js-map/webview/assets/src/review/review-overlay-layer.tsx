import { useSignal } from "maitai";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR } from "./review-mode-composer-overlay";
import { reviewLayoutMode$ } from "./review-preferences-model";
import { ReviewStageActionsPill } from "./review-stage-actions-pill";

export function ReviewOverlayLayer({
  children,
  expandedActionsPortalTarget,
}: {
  children: ReactNode;
  expandedActionsPortalTarget: HTMLElement | null;
}): React.ReactNode {
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const isReviewExpanded = reviewLayoutMode === "expanded";

  if (children == null) {
    return null;
  }

  if (!isReviewExpanded) {
    return (
      <ReviewStageActionsPill className="absolute bottom-[20px] left-1/2 z-30">
        {children}
      </ReviewStageActionsPill>
    );
  }

  return createPortal(
    <ReviewStageActionsPill
      className="absolute left-1/2 z-[60]"
      style={{
        bottom: `calc(var(${REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR}, 0px) + 8px)`,
      }}
    >
      {children}
    </ReviewStageActionsPill>,
    expandedActionsPortalTarget ?? document.body,
  );
}
