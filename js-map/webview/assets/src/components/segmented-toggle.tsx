import clsx from "clsx";
import type { ReactNode } from "react";

import { Button } from "./button";
import { Tooltip } from "./tooltip";

type SegmentedToggleOption<TId extends string> = {
  id: TId;
  label: ReactNode;
  ariaLabel?: string;
  tooltipContent?: ReactNode;
  disabled?: boolean;
};

export function SegmentedToggle<TId extends string = string>({
  options = [],
  selectedId,
  onSelect,
  size = "default",
  className,
  uniform: uniformProp,
  selectedColor = "secondary",
  unselectedColor = "ghost",
  ariaLabel,
  ariaLabelledBy,
}: {
  options?: Array<SegmentedToggleOption<TId>>;
  selectedId: TId | null;
  onSelect: (id: TId) => void;
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  uniform?: boolean;
  selectedColor?: React.ComponentProps<typeof Button>["color"];
  unselectedColor?: React.ComponentProps<typeof Button>["color"];
  ariaLabel?: string;
  ariaLabelledBy?: string;
}): React.ReactElement {
  const uniform =
    uniformProp != null ? uniformProp : size === "icon" && options.length > 2;

  return (
    <div
      className={clsx("inline-flex items-center gap-0.5", className)}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        const isDisabled = option.disabled ?? false;
        const handleClick = (): void => {
          if (isDisabled) {
            return;
          }

          onSelect(option.id);
        };
        if (!option.tooltipContent) {
          return (
            <Button
              key={option.id}
              color={isSelected ? selectedColor : unselectedColor}
              size={size}
              onClick={handleClick}
              aria-pressed={isSelected}
              uniform={uniform}
              aria-label={option.ariaLabel}
              disabled={isDisabled}
            >
              {option.label}
            </Button>
          );
        }
        return (
          <Tooltip key={option.id} tooltipContent={option.tooltipContent}>
            <Button
              key={option.id}
              color={isSelected ? selectedColor : unselectedColor}
              size={size}
              onClick={handleClick}
              aria-pressed={isSelected}
              uniform={uniform}
              aria-label={option.ariaLabel}
              disabled={isDisabled}
            >
              {option.label}
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
}
