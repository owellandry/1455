import type React from "react";

export function KeybindingLabel({
  keysLabel,
}: {
  keysLabel: string;
}): React.ReactElement {
  return (
    <kbd className="rounded-[3px] bg-token-foreground/5 px-1.5 py-0.5 font-sans text-[11px] leading-none font-medium tracking-wide text-token-description-foreground tabular-nums">
      {keysLabel}
    </kbd>
  );
}
