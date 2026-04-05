import clsx from "clsx";
import React, { createContext, useContext } from "react";

import { Button } from "@/components/button";
import { WithWindow } from "@/components/with-window";

export const DIALOG_LAYOUT_DEBUG_STORAGE_KEY = "codex.debug.dialogLayout";
export const DIALOG_FOOTER_COMPACT = "w-auto gap-2";
type DialogBodySize = "full" | "tall";

const DIALOG_LAYOUT_DEBUG_FRAME_CLASS =
  "relative rounded-lg border border-token-charts-blue/40";
const DIALOG_LAYOUT_DEBUG_LABEL_CLASS =
  "absolute -top-2 left-2 rounded bg-token-charts-blue/15 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-token-charts-blue";
const DialogDebugContext = createContext<boolean | null>(null);

function getDialogBodySizeClassName(
  size: DialogBodySize | undefined,
): string | undefined {
  if (size === "full") {
    return "h-full min-h-0";
  }
  if (size === "tall") {
    return "min-h-[520px] max-h-[560px]";
  }
  return undefined;
}

function getDialogDebugEnabled(): boolean {
  if (
    typeof window === "undefined" ||
    window.localStorage == null ||
    typeof window.localStorage.getItem !== "function"
  ) {
    return false;
  }
  return window.localStorage.getItem(DIALOG_LAYOUT_DEBUG_STORAGE_KEY) === "1";
}

function useDialogDebugEnabled(): boolean {
  const contextValue = useContext(DialogDebugContext);
  return contextValue ?? getDialogDebugEnabled();
}

function DialogDebugLabel({ name }: { name: string }): React.ReactElement {
  return <span className={DIALOG_LAYOUT_DEBUG_LABEL_CLASS}>{name}</span>;
}

export function DialogDebugProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <DialogDebugContext.Provider value={enabled}>
      {children}
    </DialogDebugContext.Provider>
  );
}

export function DialogHeader({
  icon,
  title,
  subtitle,
  className,
  iconClassName,
  iconBackgroundClassName,
  titleSize = "dialog",
  titleClassName,
  subtitleSize = "base",
  subtitleClassName,
}: {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  iconBackgroundClassName?: string;
  titleSize?: "sm" | "base" | "lg" | "dialog";
  titleClassName?: string;
  subtitleSize?: "sm" | "base";
  subtitleClassName?: string;
}): React.ReactElement {
  const isDebug = useDialogDebugEnabled();
  const titleSizeClassName =
    titleSize === "lg"
      ? "heading-lg"
      : titleSize === "base"
        ? "heading-base"
        : titleSize === "sm"
          ? "heading-sm"
          : "heading-dialog";
  const subtitleSizeClassName =
    subtitleSize === "base"
      ? "text-base leading-normal tracking-normal"
      : "text-sm leading-normal tracking-normal";

  return (
    <div
      className={clsx(
        "flex flex-col items-start gap-3",
        isDebug && DIALOG_LAYOUT_DEBUG_FRAME_CLASS,
        className,
      )}
    >
      {isDebug ? <DialogDebugLabel name="DialogHeader" /> : null}
      {icon ? (
        <span
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-2",
            iconBackgroundClassName ?? "bg-token-foreground/5",
            iconClassName,
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1 self-stretch">
        {title ? (
          <div
            className={clsx(
              titleSizeClassName,
              "min-w-0 font-semibold",
              titleClassName,
            )}
          >
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div
            className={clsx(
              "text-token-description-foreground",
              subtitleSizeClassName,
              subtitleClassName,
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DialogBody(
  props:
    | ({
        as?: "div";
        children: React.ReactNode;
        className?: string;
        size?: DialogBodySize;
      } & Omit<React.ComponentPropsWithoutRef<"div">, "children" | "className">)
    | ({
        as: "form";
        children: React.ReactNode;
        className?: string;
        size?: DialogBodySize;
      } & Omit<
        React.ComponentPropsWithoutRef<"form">,
        "children" | "className"
      >),
): React.ReactElement {
  const { children, className, size } = props;
  const isDebug = useDialogDebugEnabled();
  const sizeClassName = getDialogBodySizeClassName(size);
  const dialogBodyClassName = clsx(
    "flex flex-col gap-0 px-5 py-5 text-base leading-normal tracking-normal",
    isDebug && DIALOG_LAYOUT_DEBUG_FRAME_CLASS,
    sizeClassName,
    className,
  );

  if (props.as === "form") {
    const {
      as: _as,
      children: _children,
      className: _className,
      size: _size,
      ...formProps
    } = props;
    return (
      <form {...formProps} className={dialogBodyClassName}>
        {isDebug ? <DialogDebugLabel name="DialogBody" /> : null}
        {children}
      </form>
    );
  }

  const {
    as: _as,
    children: _children,
    className: _className,
    size: _size,
    ...divProps
  } = props;
  return (
    <div {...divProps} className={clsx(dialogBodyClassName)}>
      {isDebug ? <DialogDebugLabel name="DialogBody" /> : null}
      {children}
    </div>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const isDebug = useDialogDebugEnabled();
  const childrenArray = React.Children.toArray(children);
  const buttonCount = childrenArray.reduce<number>((count, child) => {
    if (!React.isValidElement(child)) {
      return count;
    }
    if (child.type !== Button) {
      return count;
    }
    return count + 1;
  }, 0);
  const renderButtons = (
    defaultSize: NonNullable<React.ComponentProps<typeof Button>["size"]>,
  ): Array<React.ReactNode> =>
    childrenArray.map((child) => {
      if (!React.isValidElement<React.ComponentProps<typeof Button>>(child)) {
        return child;
      }
      if (child.type !== Button) {
        return child;
      }
      const sizeClassName =
        buttonCount === 1 ? "w-full justify-center" : undefined;
      return React.cloneElement(child, {
        size: child.props.size ?? defaultSize,
        className: clsx(child.props.className, sizeClassName),
      });
    });
  return (
    <div
      className={clsx(
        "flex w-full items-center justify-end gap-3",
        isDebug && DIALOG_LAYOUT_DEBUG_FRAME_CLASS,
        className,
      )}
    >
      {isDebug ? <DialogDebugLabel name="DialogFooter" /> : null}
      <WithWindow electron>{renderButtons("medium")}</WithWindow>
      <WithWindow extension browser>
        {renderButtons("toolbar")}
      </WithWindow>
    </div>
  );
}

export function DialogSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const isDebug = useDialogDebugEnabled();
  return (
    <div
      className={clsx(
        "flex w-full flex-col pt-3 first:pt-0",
        isDebug && DIALOG_LAYOUT_DEBUG_FRAME_CLASS,
        className,
      )}
    >
      {isDebug ? <DialogDebugLabel name="DialogSection" /> : null}
      {children}
    </div>
  );
}

export function FormRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const isDebug = useDialogDebugEnabled();
  return (
    <div
      className={clsx(
        "relative flex items-center gap-2",
        isDebug && DIALOG_LAYOUT_DEBUG_FRAME_CLASS,
        className,
      )}
    >
      {isDebug ? <DialogDebugLabel name="FormRow" /> : null}
      {children}
    </div>
  );
}

export function FieldStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const isDebug = useDialogDebugEnabled();
  return (
    <div
      className={clsx(
        "flex flex-col gap-2",
        isDebug && DIALOG_LAYOUT_DEBUG_FRAME_CLASS,
        className,
      )}
    >
      {isDebug ? <DialogDebugLabel name="FieldStack" /> : null}
      {children}
    </div>
  );
}
