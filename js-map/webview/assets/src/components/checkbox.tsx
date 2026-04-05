import * as Checkbox from "@radix-ui/react-checkbox";
import clsx from "clsx";
import type React from "react";

import CheckIcon from "../icons/check-md.svg";

export function CheckboxComponent({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  ...rest
}: {
  className?: string;
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}): React.ReactElement {
  return (
    <Checkbox.Root
      className={clsx(
        "border-token-border peer",
        "data-[state=checked]:bg-token-checkbox-background data-[state=checked]:text-token-checkbox-foreground",
        "data-[state=checked]:border-token-border",
        "focus-visible:border-token-border focus-visible:ring-token-checkbox-background/50 focus-visible:ring-1",
        "aria-invalid:ring-2 aria-invalid:ring-token-error-foreground/20",
        "aria-invalid:border-token-error-foreground",
        "icon-2xs rounded-xs shrink-0 border shadow-sm outline-none transition-all",
        "disabled:cursor-not-allowed",
        !disabled && "hover:bg-token-editor-background",
        className,
      )}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      {...rest}
    >
      <Checkbox.Indicator className="flex h-full w-full items-center justify-center text-current">
        <CheckIcon className="icon-xxs flex-shrink-0" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

export { CheckboxComponent as Checkbox };
