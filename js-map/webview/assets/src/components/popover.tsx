// oxlint-disable-next-line no-restricted-imports
import * as PopoverPrimitive from "@radix-ui/react-popover";
import clsx from "clsx";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactElement,
} from "react";

export function Popover(
  props: ComponentProps<typeof PopoverPrimitive.Root>,
): ReactElement {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export function PopoverTrigger(
  props: ComponentProps<typeof PopoverPrimitive.Trigger>,
): ReactElement {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  style,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>): ReactElement {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        collisionPadding={6}
        sideOffset={sideOffset}
        className={clsx(
          "bg-token-dropdown-background/90 text-token-foreground ring-token-border z-50 flex w-72 origin-[var(--radix-popover-content-transform-origin)] flex-col overflow-y-auto rounded-xl px-1 py-1 shadow-lg ring-[0.5px] backdrop-blur-sm outline-hidden",
          className,
        )}
        style={{
          maxWidth:
            "min(var(--radix-popover-content-available-width), calc(100vw - 16px))",
          maxHeight:
            "min(var(--radix-popover-content-available-height), calc(100vh - 16px))",
          ...style,
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export function PopoverAnchor(
  props: ComponentProps<typeof PopoverPrimitive.Anchor>,
): ReactElement {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export function PopoverHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): ReactElement {
  return (
    <div
      data-slot="popover-header"
      className={clsx("flex flex-col gap-0.5 px-1 text-sm", className)}
      {...props}
    />
  );
}

export function PopoverTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): ReactElement {
  return (
    <div
      data-slot="popover-title"
      className={clsx("font-medium", className)}
      {...props}
    />
  );
}

export function PopoverDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): ReactElement {
  return (
    <p
      data-slot="popover-description"
      className={clsx("text-token-description-foreground", className)}
      {...props}
    />
  );
}
