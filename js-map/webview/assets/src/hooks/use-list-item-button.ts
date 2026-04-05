import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";

export function useListItemButton({
  onSelect,
  isDisabled = false,
}: {
  onSelect?: () => void;
  isDisabled?: boolean;
}): HTMLAttributes<HTMLDivElement> {
  const isButtonDisabled = isDisabled || onSelect == null;
  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (isButtonDisabled) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    onSelect?.();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (isButtonDisabled) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (event.currentTarget !== event.target) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.();
    }
  };

  return {
    role: "button",
    tabIndex: isButtonDisabled ? -1 : 0,
    "aria-disabled": isButtonDisabled,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  };
}
