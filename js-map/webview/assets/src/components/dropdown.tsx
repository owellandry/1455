// oxlint-disable-next-line no-restricted-imports
import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import React, { useRef, useState } from "react";

import ChevronRightIcon from "@/icons/chevron-right.svg";
import SearchIcon from "@/icons/search.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import { dismissAllTooltips, Tooltip } from "./tooltip";

export type DropdownSurface = "menu" | "panel";
export type DropdownContentWidth =
  | "icon"
  | "xs"
  | "sm"
  | "menuNarrow"
  | "menu"
  | "menuFixed"
  | "menuBounded"
  | "menuWide"
  | "sidebar"
  | "workspace"
  | "panel"
  | "panelWide";
export type DropdownContentMaxHeight = "list" | "tall";

const DROPDOWN_OVERLAY_BOUNDS_STYLE = {
  maxWidth:
    "min(var(--radix-dropdown-menu-content-available-width), calc(100vw - 16px))",
  maxHeight:
    "min(var(--radix-dropdown-menu-content-available-height), calc(100vh - 16px))",
} satisfies React.CSSProperties;

function getSurfaceClassName(surface: DropdownSurface): string | undefined {
  if (surface === "panel") {
    return "rounded-2xl p-4 shadow-2xl backdrop-blur-lg";
  }
  return undefined;
}

function getContentWidthClassName(
  width: DropdownContentWidth | undefined,
): string | undefined {
  if (width === "icon") {
    return "min-w-[120px]";
  }
  if (width === "xs") {
    return "min-w-[160px]";
  }
  if (width === "sm") {
    return "min-w-[180px]";
  }
  if (width === "menuNarrow") {
    return "w-52";
  }
  if (width === "menu") {
    return "min-w-[220px]";
  }
  if (width === "menuFixed") {
    return "w-[220px]";
  }
  if (width === "menuBounded") {
    return "min-w-[200px] max-w-[320px]";
  }
  if (width === "menuWide") {
    return "w-[240px]";
  }
  if (width === "sidebar") {
    return "min-w-[172px] max-w-[240px]";
  }
  if (width === "workspace") {
    return "min-w-[260px]";
  }
  if (width === "panel") {
    return "w-[280px]";
  }
  if (width === "panelWide") {
    return "w-[360px]";
  }
  return undefined;
}

function getContentMaxHeightClassName(
  maxHeight: DropdownContentMaxHeight | undefined,
): string | undefined {
  if (maxHeight === "list") {
    return "max-h-[250px]";
  }
  if (maxHeight === "tall") {
    return "max-h-[350px]";
  }
  return undefined;
}

function DropdownMenuTrigger({
  ref,
  disabled,
  className,
  ...rest
}: React.ComponentPropsWithRef<typeof RadixDropdown.Trigger> &
  Pick<
    RadixDropdown.DropdownMenuTriggerProps,
    "disabled"
  >): React.ReactElement {
  return (
    <RadixDropdown.Trigger
      ref={ref}
      // Intentionally keep styling minimal so the wrapped trigger element (passed via `asChild`) can
      // control its own appearance. We only ensure focus outlines are removed to avoid duplicate
      // outlines and set cursor behavior.
      aria-disabled={disabled || undefined}
      className={clsx(
        "outline-hidden",
        disabled ? "cursor-default opacity-25" : "cursor-interaction",
        className,
      )}
      {...rest}
    />
  );
}

function DropdownContent({
  children,
  className,
  align,
  surface = "menu",
  ref,
  style,
  ...rest
}: React.ComponentPropsWithRef<typeof RadixDropdown.Content> & {
  surface?: DropdownSurface;
}): React.ReactElement {
  const surfaceClassName = getSurfaceClassName(surface);
  return (
    <RadixDropdown.Content
      ref={ref}
      className={clsx(
        "no-drag bg-token-dropdown-background/90 text-token-foreground ring-token-border z-50 m-px flex select-none flex-col overflow-y-auto rounded-xl ring-[0.5px] px-1 py-1 shadow-xl-spread backdrop-blur-sm",
        "[transform-origin:var(--radix-dropdown-menu-content-transform-origin)] [will-change:opacity,transform]",
        "[--dropdown-entry-transform:translateY(calc(var(--dropdown-translate)_*_-1))_scale(var(--dropdown-scale))]",
        "data-[side=top]:[--dropdown-entry-transform:translateY(calc(var(--dropdown-translate)_*_1))_scale(var(--dropdown-scale))]",
        "data-[side=right]:[--dropdown-entry-transform:translateX(calc(var(--dropdown-translate)_*_-1))_scale(var(--dropdown-scale))]",
        "data-[side=left]:[--dropdown-entry-transform:translateX(calc(var(--dropdown-translate)_*_1))_scale(var(--dropdown-scale))]",
        surfaceClassName,
        className,
      )}
      align={align ?? "start"}
      collisionPadding={6}
      style={{
        ...DROPDOWN_OVERLAY_BOUNDS_STYLE,
        ...style,
      }}
      {...rest}
    >
      {children}
    </RadixDropdown.Content>
  );
}

const DropdownItemTooltipComp = ({
  children,
  tooltipText,
  tooltipTextClassName,
  tooltipSide,
  tooltipAlign,
}: {
  children: React.ReactNode;
  tooltipText: string | undefined;
  tooltipTextClassName?: string;
  tooltipSide?: React.ComponentProps<typeof Tooltip>["side"];
  tooltipAlign?: React.ComponentProps<typeof Tooltip>["align"];
}): React.ReactElement => {
  if (!tooltipText) {
    return <>{children}</>;
  }
  return (
    <Tooltip
      tooltipContent={
        <div className={clsx("max-w-64 text-pretty", tooltipTextClassName)}>
          {tooltipText}
        </div>
      }
      side={tooltipSide ?? "right"}
      align={tooltipAlign}
    >
      {children}
    </Tooltip>
  );
};

const DROPDOWN_ROW_CLASSES = {
  content: "flex w-full items-center gap-1.5",
  itemBase:
    "text-token-foreground outline-hidden rounded-lg px-[var(--padding-row-x)] py-[var(--padding-row-y)] text-sm",
  itemInteractive:
    "hover:bg-token-list-hover-background focus:bg-token-list-hover-background cursor-interaction",
} as const;

const DROPDOWN_TEXT_CLASSES = {
  sectionLabel:
    "px-[var(--padding-row-x)] py-1 text-sm text-token-description-foreground",
  messageBase: "px-[var(--padding-row-x)] text-sm",
} as const;

export function DropdownItem({
  children,
  LeftIcon,
  keyboardShortcut,
  leftIconClassName,
  RightIcon,
  rightIconClassName,
  className,
  onClick,
  onSelect,
  disabled,
  href,
  SubText,
  tooltipText,
  tooltipTextClassName,
  tooltipSide,
  tooltipAlign,
  allowWrap = false,
  ...rest
}: RadixDropdown.DropdownMenuItemProps & {
  className?: string;
  disabled?: boolean;
  href?: string;
  LeftIcon?: React.ComponentType<{ className?: string }>;
  keyboardShortcut?: string | null;
  leftIconClassName?: string;
  RightIcon?: React.ComponentType<{ className?: string }>;
  rightIconClassName?: string;
  SubText?: React.ReactElement | null;
  onClick?: React.MouseEventHandler<Element>;
  tooltipText?: string;
  tooltipTextClassName?: string;
  tooltipSide?: React.ComponentProps<typeof Tooltip>["side"];
  tooltipAlign?: React.ComponentProps<typeof Tooltip>["align"];
  allowWrap?: boolean;
}): React.ReactElement {
  const Component = href ? "a" : "div";
  const isInteractive =
    !disabled && (Boolean(href) || Boolean(onClick) || Boolean(onSelect));
  const renderRow = (
    content: React.ReactNode,
    showIcons = true,
    allowWrap = false,
    reserveIconSpace = true,
  ): React.ReactElement => (
    <div className={DROPDOWN_ROW_CLASSES.content}>
      {LeftIcon ? (
        showIcons ? (
          <LeftIcon
            className={clsx(leftIconClassName ?? "icon-2xs", "shrink-0")}
          />
        ) : reserveIconSpace ? (
          <span
            aria-hidden
            className={clsx(leftIconClassName ?? "icon-2xs", "shrink-0")}
          />
        ) : null
      ) : null}
      <span
        className={clsx(
          "flex-1 min-w-0",
          allowWrap ? "whitespace-normal" : "truncate",
        )}
      >
        {content}
      </span>
      {keyboardShortcut ? (
        <span className="ml-2 shrink-0 text-xs text-token-description-foreground">
          {keyboardShortcut}
        </span>
      ) : null}
      {RightIcon ? (
        showIcons ? (
          <RightIcon
            className={clsx(rightIconClassName ?? "icon-2xs", "shrink-0")}
          />
        ) : reserveIconSpace ? (
          <span
            aria-hidden
            className={clsx(rightIconClassName ?? "icon-2xs", "shrink-0")}
          />
        ) : null
      ) : null}
    </div>
  );

  return (
    <DropdownItemTooltipComp
      tooltipText={tooltipText}
      tooltipTextClassName={tooltipTextClassName}
      tooltipSide={tooltipSide}
      tooltipAlign={tooltipAlign}
    >
      <RadixDropdown.Item
        asChild
        className={clsx(
          "no-drag",
          DROPDOWN_ROW_CLASSES.itemBase,
          disabled
            ? "cursor-default opacity-50"
            : isInteractive && DROPDOWN_ROW_CLASSES.itemInteractive,
          className,
        )}
        onClick={disabled ? undefined : onClick}
        onSelect={disabled ? undefined : onSelect}
        disabled={disabled}
        {...rest}
      >
        <Component
          href={href}
          className={clsx(
            href && "!text-token-foreground focus:!outline-none",
            "flex flex-col",
          )}
        >
          {renderRow(children, true, allowWrap)}
          {SubText ? renderRow(SubText, false, true, false) : null}
        </Component>
      </RadixDropdown.Item>
    </DropdownItemTooltipComp>
  );
}

export function DropdownInput({
  onKeyDown,
  className,
  ...rest
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "ref"
>): React.ReactElement {
  return (
    <input
      className={clsx(
        "text-md w-full min-w-0 rounded-sm border border-none px-[var(--padding-row-x)] py-[var(--padding-row-y)] text-sm !outline-none",
        className,
      )}
      autoFocus
      onKeyDown={(e) => {
        e.stopPropagation();
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
          // Manually select all text so Cmd/Ctrl+A works even inside Radix dropdown
          (e.currentTarget as HTMLInputElement).select();
          return;
        }
        onKeyDown?.(e);
      }}
      {...rest}
    />
  );
}

export function DropdownSearchInput({
  className,
  inputClassName,
  trailingContent,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "ref"> & {
  className?: string;
  inputClassName?: string;
  trailingContent?: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        DROPDOWN_ROW_CLASSES.content,
        "px-[var(--padding-row-x)] py-[var(--padding-row-y)]",
        className,
      )}
    >
      <SearchIcon className="icon-2xs shrink-0 text-token-text-tertiary" />
      <DropdownInput
        className={clsx(
          "!w-auto flex-1 appearance-none !rounded-none !border-none bg-transparent !px-0 !py-0 text-token-foreground placeholder:text-token-input-placeholder-foreground",
          inputClassName,
        )}
        {...rest}
      />
      {trailingContent ? (
        <div className="shrink-0">{trailingContent}</div>
      ) : null}
    </div>
  );
}

export function DropdownSeparator({
  className,
  paddingClassName = "py-1",
}: {
  className?: string;
  paddingClassName?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "w-full px-[var(--padding-row-x)]",
        paddingClassName,
        className,
      )}
    >
      <div className="h-[1px] w-full bg-token-menu-border" />
    </div>
  );
}

function DropdownSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={clsx(DROPDOWN_TEXT_CLASSES.sectionLabel, className)}>
      {children}
    </div>
  );
}

function DropdownMessage({
  children,
  className,
  tone = "muted",
  compact = false,
  centered = false,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "error";
  compact?: boolean;
  centered?: boolean;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        DROPDOWN_TEXT_CLASSES.messageBase,
        compact ? "py-2" : "py-3",
        tone === "error"
          ? "text-token-error-foreground"
          : "text-token-description-foreground",
        centered && "self-center text-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BasicDropdown({
  triggerButton,
  disabled,
  children,
  open: forceOpen,
  onOpenChange,
  dir,
  side,
  align,
  sideOffset,
  alignOffset,
  onCloseAutoFocus,
  onEscapeKeyDown,
  contentClassName,
  surface = "menu",
  contentWidth,
  contentMaxHeight,
  portalContainer,
}: {
  triggerButton: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
} & Pick<RadixDropdown.DropdownMenuProps, "open" | "onOpenChange"> & {
    dir?: "ltr" | "rtl";
    side?: React.ComponentProps<typeof RadixDropdown.Content>["side"];
    align?: React.ComponentProps<typeof RadixDropdown.Content>["align"];
    sideOffset?: React.ComponentProps<
      typeof RadixDropdown.Content
    >["sideOffset"];
    alignOffset?: React.ComponentProps<
      typeof RadixDropdown.Content
    >["alignOffset"];
    onCloseAutoFocus?: React.ComponentProps<
      typeof RadixDropdown.Content
    >["onCloseAutoFocus"];
    onEscapeKeyDown?: React.ComponentProps<
      typeof RadixDropdown.Content
    >["onEscapeKeyDown"];
    contentClassName?: string;
    surface?: DropdownSurface;
    contentWidth?: DropdownContentWidth;
    contentMaxHeight?: DropdownContentMaxHeight;
    portalContainer?: HTMLElement | null;
  }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isControlled = forceOpen !== undefined;
  const widthClassName = getContentWidthClassName(contentWidth);
  const maxHeightClassName = getContentMaxHeightClassName(contentMaxHeight);

  const handleOpenChange = (isOpen: boolean): void => {
    if (isOpen) {
      dismissAllTooltips();
    }
    if (!isControlled) {
      setIsOpen(isOpen);
    }

    onOpenChange?.(isOpen);
  };

  return (
    <RadixDropdown.Root
      dir={dir}
      modal={false}
      open={forceOpen ?? isOpen}
      onOpenChange={handleOpenChange}
    >
      <Dropdown.Trigger asChild disabled={disabled}>
        {triggerButton}
      </Dropdown.Trigger>
      {!disabled && (
        <RadixDropdown.Portal container={portalContainer ?? undefined}>
          <Dropdown.Content
            ref={contentRef}
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={onEscapeKeyDown}
            surface={surface}
            className={clsx(
              widthClassName,
              maxHeightClassName,
              contentClassName,
            )}
          >
            {children}
          </Dropdown.Content>
        </RadixDropdown.Portal>
      )}
    </RadixDropdown.Root>
  );
}

export function BasicSubDropdown({
  trigger,
  children,
  isDefaultOpen = false,
}: {
  trigger: React.ReactElement<React.ComponentProps<typeof DropdownItem>>;
  children: React.ReactNode;
  isDefaultOpen?: boolean;
}): React.ReactElement {
  const disabled = trigger.props.disabled ?? false;
  const [isOpenState, setIsOpen] = useState(disabled ? false : isDefaultOpen);
  const isOpen = isOpenState && !disabled;

  const clonedTrigger = React.cloneElement(trigger, {
    onSelect: (event) => {
      trigger.props.onSelect?.(event);
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }
      setIsOpen((value) => !value);
    },
    RightIcon: ({ className }: { className?: string }): React.ReactElement => {
      return (
        <AnimatePresence initial={false}>
          <motion.span
            aria-hidden
            className="inline-flex items-center justify-center text-token-input-placeholder-foreground"
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={ACCORDION_TRANSITION}
          >
            <ChevronRightIcon className={className} />
          </motion.span>
        </AnimatePresence>
      );
    },
  });

  return (
    <div className="flex flex-col" data-state={isOpen ? "open" : "closed"}>
      {clonedTrigger}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="dropdown-submenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ACCORDION_TRANSITION}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownFlyoutSubmenuItem({
  label,
  children,
  LeftIcon,
  leftIconClassName,
  className,
  disabled = false,
  contentClassName,
  contentSurface = "menu",
  onSelect,
  triggerContent,
  tooltipText,
  tooltipTextClassName,
  tooltipSide,
  tooltipAlign,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  LeftIcon?: React.ComponentType<{ className?: string }>;
  leftIconClassName?: string;
  className?: string;
  disabled?: boolean;
  contentClassName?: string;
  contentSurface?: "bare" | "menu";
  onSelect?: () => void;
  triggerContent?: React.ReactNode;
  tooltipText?: string;
  tooltipTextClassName?: string;
  tooltipSide?: React.ComponentProps<typeof Tooltip>["side"];
  tooltipAlign?: React.ComponentProps<typeof Tooltip>["align"];
}): React.ReactElement {
  const subContentClassName =
    contentSurface === "bare"
      ? "z-50 m-0 flex min-w-[180px] select-none flex-col overflow-y-auto p-0"
      : "bg-token-dropdown-background/90 text-token-foreground ring-token-border z-50 m-px flex min-w-[180px] select-none flex-col overflow-y-auto rounded-xl px-1 py-1 shadow-xl-spread ring-[0.5px] backdrop-blur-sm";
  return (
    <RadixDropdown.Sub>
      <DropdownItemTooltipComp
        tooltipText={tooltipText}
        tooltipTextClassName={tooltipTextClassName}
        tooltipSide={tooltipSide}
        tooltipAlign={tooltipAlign}
      >
        <RadixDropdown.SubTrigger
          className={clsx(
            DROPDOWN_ROW_CLASSES.itemBase,
            "flex w-full items-center",
            disabled
              ? "cursor-default opacity-50"
              : DROPDOWN_ROW_CLASSES.itemInteractive,
            className,
          )}
          disabled={disabled}
          onClick={(event) => {
            if (disabled || onSelect == null) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            onSelect();
          }}
        >
          {triggerContent ?? (
            <div className={DROPDOWN_ROW_CLASSES.content}>
              {LeftIcon ? (
                <LeftIcon
                  className={clsx(leftIconClassName ?? "icon-2xs", "shrink-0")}
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronRightIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
            </div>
          )}
        </RadixDropdown.SubTrigger>
      </DropdownItemTooltipComp>
      <RadixDropdown.Portal>
        <RadixDropdown.SubContent
          className={clsx(subContentClassName, contentClassName)}
          collisionPadding={6}
          sideOffset={4}
          alignOffset={-4}
          style={DROPDOWN_OVERLAY_BOUNDS_STYLE}
        >
          <div dir="ltr">{children}</div>
        </RadixDropdown.SubContent>
      </RadixDropdown.Portal>
    </RadixDropdown.Sub>
  );
}

function DropdownTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "text-token-description-foreground flex min-h-6 items-center truncate px-[var(--padding-row-x)] py-[var(--padding-row-y)] text-sm leading-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DropdownSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={className}>{children}</div>;
}

// oxlint-disable-next-line react/only-export-components
export const Dropdown = {
  Trigger: DropdownMenuTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Input: DropdownInput,
  SearchInput: DropdownSearchInput,
  Separator: DropdownSeparator,
  SectionLabel: DropdownSectionLabel,
  Message: DropdownMessage,
  Title: DropdownTitle,
  SubmenuItem: BasicSubDropdown,
  FlyoutSubmenuItem: DropdownFlyoutSubmenuItem,
  Section: DropdownSection,
};
