// oxlint-disable-next-line no-restricted-imports
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { KeybindingLabel } from "./keybinding-label";

const TOOLTIP_DISMISS_EVENT = "codex:dismiss-tooltips";

// oxlint-disable-next-line react/only-export-components
export function dismissAllTooltips(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(TOOLTIP_DISMISS_EVENT));
}

export function TooltipProvider({
  delayDuration = 0,
  ...rest
}: React.ComponentProps<typeof TooltipPrimitive.Provider>): React.ReactElement {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...rest} />;
}

export function Tooltip({
  children,
  delayOpen,
  open,
  defaultOpen,
  onOpenChange,
  tooltipContent,
  shortcut,
  sideOffset,
  side,
  align,
  disabled = false,
  triggerAsChild = true,
  triggerRef,
  delayDuration,
  interactive = false,
  tooltipClassName,
  tooltipBodyClassName,
  ...rest
}: TooltipPrimitive.TooltipProps & {
  tooltipContent: React.ReactNode;
  shortcut?: string | null;
  delayOpen?: boolean;
  sideOffset?: TooltipPrimitive.TooltipContentProps["sideOffset"];
  side?: TooltipPrimitive.TooltipContentProps["side"];
  align?: TooltipPrimitive.TooltipContentProps["align"];
  disabled?: boolean;
  triggerAsChild?: boolean;
  triggerRef?: React.Ref<HTMLButtonElement>;
  interactive?: boolean;
  tooltipClassName?: string;
  tooltipBodyClassName?: string;
}): React.ReactElement {
  const contentRef = useRef<HTMLDivElement>(null);
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    defaultOpen ?? false,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleDismiss = (): void => {
      if (isControlled) {
        onOpenChange?.(false);
        return;
      }
      setUncontrolledOpen(false);
    };
    window.addEventListener(TOOLTIP_DISMISS_EVENT, handleDismiss);
    return (): void => {
      window.removeEventListener(TOOLTIP_DISMISS_EVENT, handleDismiss);
    };
  }, [isControlled, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  if (disabled || tooltipContent == null) {
    return <>{children}</>;
  }

  const tooltipRoot = (
    <TooltipPrimitive.Root
      open={isControlled ? open : uncontrolledOpen}
      onOpenChange={handleOpenChange}
      delayDuration={delayOpen ? 250 : delayDuration}
      disableHoverableContent={!interactive}
    >
      <TooltipTrigger
        triggerRef={triggerRef}
        asChild={triggerAsChild}
        {...rest}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        contentRef={contentRef}
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={tooltipClassName}
      >
        <div className="flex items-center gap-2">
          <div className={clsx("min-w-0", tooltipBodyClassName)}>
            {tooltipContent}
          </div>
          {shortcut ? <KeybindingLabel keysLabel={shortcut} /> : null}
        </div>
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
  if (__TEST__) {
    return <TooltipProvider delayDuration={0}>{tooltipRoot}</TooltipProvider>;
  }
  return tooltipRoot;
}

function TooltipTrigger({
  triggerRef,
  ...rest
}: TooltipPrimitive.TooltipTriggerProps & {
  triggerRef?: React.Ref<HTMLButtonElement>;
}): React.ReactElement {
  return <TooltipPrimitive.Trigger ref={triggerRef} asChild {...rest} />;
}

function TooltipContent({
  className,
  sideOffset = 2,
  children,
  contentRef,
  style,
  ...rest
}: TooltipPrimitive.TooltipContentProps & {
  contentRef?: React.Ref<HTMLDivElement>;
}): React.ReactElement {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={contentRef}
        collisionPadding={8}
        sideOffset={sideOffset}
        className={clsx(
          "bg-token-dropdown-background text-token-foreground border-token-border z-50 w-fit select-none rounded-lg border px-2 py-1 text-sm whitespace-normal break-words",
          className,
        )}
        style={{
          maxWidth:
            "min(20rem, var(--radix-tooltip-content-available-width), calc(100vw - 16px))",
          maxHeight:
            "min(var(--radix-tooltip-content-available-height), calc(100vh - 16px))",
          ...style,
        }}
        {...rest}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
