import clsx from "clsx";
import type { ReactNode } from "react";

import { Button } from "./button";

type ButtonColor = React.ComponentProps<typeof Button>["color"];

export function Banner({
  title,
  content,
  customCtas,
  onPrimaryCtaClick,
  primaryCtaText,
  primaryCtaColor,
  secondaryCtaColor,
  onSecondaryCtaClick,
  onDangerCtaClick,
  secondaryCtaText,
  dangerCtaText,
  Icon,
  iconClassName,
  isPrimaryCtaDisabled = false,
  isSecondaryCtaDisabled = false,
  isDangerCtaDisabled = false,
  type = "normal",
  className,
  layout = "horizontal",
  stackOnNarrow = false,
}: {
  onPrimaryCtaClick?: () => void;
  primaryCtaText?: ReactNode;
  primaryCtaColor?: ButtonColor;
  customCtas?: ReactNode;
  onSecondaryCtaClick?: () => void;
  secondaryCtaText?: ReactNode;
  secondaryCtaColor?: ButtonColor;
  onDangerCtaClick?: () => void;
  dangerCtaText?: ReactNode;
  title?: ReactNode;
  content: ReactNode;
  isPrimaryCtaDisabled?: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
  isSecondaryCtaDisabled?: boolean;
  isDangerCtaDisabled?: boolean;
  type?: "normal" | "error" | "info" | "infoAccent";
  className?: string;
  layout?: "horizontal" | "vertical" | "verticalIcon";
  iconClassName?: string;
  stackOnNarrow?: boolean;
}): React.ReactElement {
  const isVertical = layout === "vertical";
  const isVerticalIcon = layout === "verticalIcon";
  const shouldStackOnNarrow = layout === "horizontal" && stackOnNarrow;
  const ctaContainerClass = clsx(
    "flex gap-2 pb-0",
    isVertical ? "w-full justify-end pt-0" : "shrink-0",
    shouldStackOnNarrow &&
      "max-[400px]:w-full max-[400px]:shrink max-[400px]:justify-center",
  );
  const ctas = customCtas ? (
    <div className={ctaContainerClass}>{customCtas}</div>
  ) : (
    (primaryCtaText || secondaryCtaText || dangerCtaText) && (
      <div className={ctaContainerClass}>
        {primaryCtaText && (
          <Button
            onClick={onPrimaryCtaClick}
            color={primaryCtaColor ?? "outline"}
            className="shrink-0"
            disabled={isPrimaryCtaDisabled}
          >
            {primaryCtaText}
          </Button>
        )}
        {secondaryCtaText && (
          <Button
            onClick={onSecondaryCtaClick}
            color={secondaryCtaColor ?? "ghost"}
            className="shrink-0"
            disabled={isSecondaryCtaDisabled}
          >
            {secondaryCtaText}
          </Button>
        )}
        {dangerCtaText && (
          <Button
            onClick={onDangerCtaClick}
            color="danger"
            className="shrink-0"
            disabled={isDangerCtaDisabled}
          >
            {dangerCtaText}
          </Button>
        )}
      </div>
    )
  );
  const variantClass = {
    error:
      "border-token-error-foreground/20 text-token-error-foreground bg-token-input-validation-error-background/20",
    info: "border-token-border bg-token-input-background text-token-foreground",
    infoAccent:
      "border-token-text-link-foreground/40 bg-token-input-background text-token-foreground",
    normal:
      "border-token-border bg-token-input-background text-token-foreground",
  }[type];
  const resolvedIconClassName = clsx(
    "icon-sm shrink-0",
    type === "infoAccent" && "text-token-text-link-foreground",
    iconClassName,
  );

  const renderHeader = (): React.ReactElement => (
    <div className="flex items-center gap-1">
      {Icon && <Icon className={resolvedIconClassName} />}
      {title && (
        <h3 className="text-pretty electron:text-base electron:font-semibold extension:text-sm extension:font-bold">
          {title}
        </h3>
      )}
    </div>
  );
  const renderContent = (extraClass?: string): React.ReactElement => (
    <div className={clsx("flex min-w-0 flex-1 flex-col", extraClass)}>
      <div
        className={clsx(
          "electron:leading-relaxed min-w-0 flex-1",
          title
            ? type === "error"
              ? "text-token-error-foreground"
              : "text-token-description-foreground"
            : "",
        )}
      >
        {content}
      </div>
    </div>
  );

  // Some themes (like cursor dark) have opacity on the input background color token. However, banners often overlap other content so
  // we add an opaque background below it. However, it's just a background color wrapper so we still apply className to main content root.
  if (isVertical) {
    return (
      <div className="rounded-3xl bg-token-side-bar-background opacity-100">
        <aside
          className={clsx(
            "flex w-full flex-col gap-1.5 rounded-3xl border py-2 pl-3 pr-2 text-sm [text-wrap:pretty] lg:mx-auto dark:border-transparent",
            variantClass,
            className,
          )}
        >
          {(Icon || title) && renderHeader()}
          {renderContent("gap-1.5")}
          {ctas}
        </aside>
      </div>
    );
  }

  if (isVerticalIcon) {
    return (
      <div className="rounded-3xl bg-token-side-bar-background opacity-100">
        <aside
          className={clsx(
            "flex w-full gap-3 rounded-3xl border py-2 pl-3 pr-2 text-sm [text-wrap:pretty] lg:mx-auto dark:border-transparent",
            variantClass,
            className,
          )}
        >
          {Icon ? (
            <div className="flex items-center self-center">
              <Icon className={resolvedIconClassName} />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {title ? (
              <h3 className="text-pretty electron:text-base electron:font-semibold extension:text-sm extension:font-bold">
                {title}
              </h3>
            ) : null}
            {renderContent()}
            {ctas}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-token-side-bar-background opacity-100">
      <aside
        className={clsx(
          "flex w-full items-center gap-4 rounded-3xl border py-2 pl-3 pr-2 text-sm [text-wrap:pretty] lg:mx-auto dark:border-transparent",
          shouldStackOnNarrow && "max-[400px]:items-start max-[400px]:gap-2",
          variantClass,
          className,
        )}
      >
        <div
          className={clsx(
            "flex h-full w-full items-center gap-2",
            shouldStackOnNarrow && "max-[400px]:items-start",
          )}
        >
          {Icon && (
            <Icon
              className={clsx(
                resolvedIconClassName,
                shouldStackOnNarrow && "max-[400px]:hidden",
              )}
            />
          )}
          <div
            className={clsx(
              "flex min-w-0 grow flex-row items-center justify-between gap-2",
              shouldStackOnNarrow &&
                "max-[400px]:flex-col max-[400px]:items-stretch max-[400px]:gap-2",
            )}
          >
            {title && (
              <h3 className="text-sm font-bold text-pretty">{title}</h3>
            )}
            {renderContent()}
            {ctas}
          </div>
        </div>
      </aside>
    </div>
  );
}
