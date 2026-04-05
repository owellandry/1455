import type { ReactElement } from "react";

import PinIcon from "@/icons/pin.svg";

export function PinIndicatorButton({
  isPinned,
  ariaLabel,
  onPin,
  onUnpin,
}: {
  isPinned: boolean;
  ariaLabel: string;
  onPin: () => void;
  onUnpin: () => void;
}): ReactElement {
  const Icon = PinIcon;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex h-5 w-5 items-center justify-center leading-none text-token-foreground/50 hover:text-token-foreground"
      onClick={(event) => {
        event.stopPropagation();
        if (isPinned) {
          onUnpin();
        } else {
          onPin();
        }
      }}
    >
      <Icon className="icon-2xs block shrink-0" />
    </button>
  );
}
