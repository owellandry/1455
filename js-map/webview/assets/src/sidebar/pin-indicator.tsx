import type { ReactNode } from "react";
import type { MessageDescriptor } from "react-intl";

import { PinIndicatorButton } from "@/sidebar/pin-indicator-button";

export { setThreadPinned } from "@/set-pinned-thread";

export const pinMessageDescriptor: MessageDescriptor = {
  id: "sidebarElectron.pinThread",
  defaultMessage: "Pin thread",
  description: "Action label to pin a thread in the sidebar",
};

export const unpinMessageDescriptor: MessageDescriptor = {
  id: "sidebarElectron.unpinThread",
  defaultMessage: "Unpin thread",
  description: "Action label to unpin a thread from the sidebar",
};

export function buildPinIndicatorNodes({
  isPinned,
  indicatorLocation,
  hasUnreadTurn,
  ariaLabel,
  onPin,
  onUnpin,
}: {
  isPinned: boolean;
  indicatorLocation: "end" | "start" | "none";
  hasUnreadTurn: boolean;
  ariaLabel: string;
  onPin: () => void;
  onUnpin: () => void;
}): { rest: ReactNode | null; hover: ReactNode | null } {
  if (indicatorLocation === "none") {
    return { rest: null, hover: null };
  }

  const pinIndicatorNode = (
    <PinIndicatorButton
      isPinned={isPinned}
      ariaLabel={ariaLabel}
      onPin={onPin}
      onUnpin={onUnpin}
    />
  );
  const showAtRest =
    isPinned && indicatorLocation === "start" && !hasUnreadTurn;

  return {
    rest: showAtRest ? pinIndicatorNode : null,
    hover: showAtRest ? null : pinIndicatorNode,
  };
}
