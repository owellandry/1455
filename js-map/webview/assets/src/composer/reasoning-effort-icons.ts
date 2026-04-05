import type React from "react";

import ReasoningExtraHighIcon from "@/icons/reasoning-extra-high.svg";
import ReasoningHighIcon from "@/icons/reasoning-high.svg";
import ReasoningLowIcon from "@/icons/reasoning-low.svg";
import ReasoningMediumIcon from "@/icons/reasoning-medium.svg";
import ReasoningMinimalIcon from "@/icons/reasoning-minimal.svg";
import type { ReasoningEffortKey } from "@/types/models";

const REASONING_EFFORT_ICONS: Record<
  ReasoningEffortKey,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  none: ReasoningMinimalIcon,
  minimal: ReasoningMinimalIcon,
  low: ReasoningLowIcon,
  medium: ReasoningMediumIcon,
  high: ReasoningHighIcon,
  xhigh: ReasoningExtraHighIcon,
};

export function getReasoningEffortIcon(
  effort: ReasoningEffortKey,
): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  return REASONING_EFFORT_ICONS[effort];
}
