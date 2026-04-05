import { useRef, useState, type RefObject } from "react";

export function useDropdownTooltipSuppression(): {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  tooltipOpen: boolean | undefined;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onTriggerBlur: () => void;
  onTriggerPointerLeave: () => void;
  handleSelectAndClose: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerTooltipSuppressed, setIsTriggerTooltipSuppressed] =
    useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ignoreNextTriggerBlurRef = useRef(false);

  const handleSelectAndClose = (): void => {
    setIsTriggerTooltipSuppressed(true);
    ignoreNextTriggerBlurRef.current = true;
    triggerRef.current?.blur();
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    tooltipOpen: isOpen || isTriggerTooltipSuppressed ? false : undefined,
    triggerRef,
    onTriggerBlur: (): void => {
      if (ignoreNextTriggerBlurRef.current) {
        ignoreNextTriggerBlurRef.current = false;
        return;
      }
      setIsTriggerTooltipSuppressed(false);
    },
    onTriggerPointerLeave: (): void => {
      ignoreNextTriggerBlurRef.current = false;
      setIsTriggerTooltipSuppressed(false);
    },
    handleSelectAndClose,
  };
}
