import type { ReactElement } from "react";

export function CardStatusIndicator({
  ariaLabel,
  icon,
}: {
  ariaLabel: string;
  icon: ReactElement;
}): ReactElement {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="flex h-7 w-7 items-center justify-center rounded-md text-token-description-foreground"
    >
      {icon}
    </span>
  );
}
