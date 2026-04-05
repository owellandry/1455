import clsx from "clsx";
import {
  cloneElement,
  createElement,
  isValidElement,
  type CSSProperties,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";

import { Tooltip } from "./tooltip";

const inlineChipBaseClassName =
  "inline max-w-full items-center py-0.5 px-1.5 whitespace-nowrap blend rounded-sm font-normal";

const inlineChipVariants = {
  link: {
    background:
      "bg-token-text-link-foreground/10 hover:bg-token-text-link-foreground/15",
    text: "text-token-text-link-foreground",
  },
  success: {
    background: "bg-token-charts-purple/10 hover:bg-token-charts-purple/20  ",
    text: "text-token-charts-purple",
  },
} satisfies Record<"link" | "success", { background: string; text: string }>;

const inlineChipIconBaseClassName =
  "size-3.5 shrink-0 inline-block align-middle mr-0.5 -ml-0.5";

/** Compact inline pill for mentions inside composer text or chat bubbles. */
export function InlineChip({
  text,
  icon,
  className,
  tooltipText,
  dataAttributes,
  interactive,
  colorVariant = "link",
  style,
}: {
  text: ReactNode;
  icon?:
    | ReactElement<{ className?: string }>
    | ComponentType<{ className?: string }>;
  className?: string;
  tooltipText?: ReactNode;
  dataAttributes?: Record<string, string>;
  interactive?: boolean;
  colorVariant?: keyof typeof inlineChipVariants;
  style?: CSSProperties;
}): ReactElement {
  const iconClassName = clsx(
    inlineChipIconBaseClassName,
    colorVariant === "link" && "-mt-0.5",
    colorVariant === "success" && "-translate-y-px",
  );
  const iconNode =
    icon == null
      ? null
      : isValidElement(icon)
        ? cloneElement(icon, {
            className: clsx(iconClassName, icon.props.className),
          })
        : createElement(icon, { className: iconClassName });

  const chip = (
    <span
      className={clsx(
        inlineChipBaseClassName,
        inlineChipVariants[colorVariant].background,
        interactive
          ? clsx("cursor-interaction", inlineChipVariants[colorVariant].text)
          : "text-token-foreground",
        className,
      )}
      style={style}
      {...dataAttributes}
    >
      {iconNode}
      <span className="blend">{text}</span>
    </span>
  );

  if (tooltipText == null) {
    return chip;
  }

  return (
    <Tooltip
      tooltipContent={
        <div className="max-w-[400px] text-pretty">{tooltipText}</div>
      }
    >
      {chip}
    </Tooltip>
  );
}
