import type { ComponentProps, ReactElement } from "react";

import { Button } from "@/components/button";
import ThreeDotsIcon from "@/icons/three-dots.svg";

export function MoreMenuTrigger({
  label,
  onClick,
  size = "toolbar",
  iconClassName = "icon-xs",
  uniform = true,
  ...rest
}: {
  label: string;
  iconClassName?: string;
  uniform?: boolean;
} & ComponentProps<typeof Button>): ReactElement {
  return (
    <Button
      color="ghost"
      size={size}
      uniform={uniform}
      aria-label={label}
      {...rest}
      onClick={(event): void => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      <ThreeDotsIcon className={iconClassName} />
    </Button>
  );
}
