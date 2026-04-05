import clsx from "clsx";
import type { ComponentProps, ComponentType, ReactNode } from "react";

import { Badge } from "./badge";
import { Banner } from "./banner";
import { Button } from "./button";

type OnboardingBannerAction = {
  ariaLabel?: string;
  className?: string;
  color?: ComponentProps<typeof Button>["color"];
  disabled?: boolean;
  icon?: ComponentType<{ className?: string }>;
  label?: ReactNode;
  loading?: boolean;
  onClick: () => void;
  size?: ComponentProps<typeof Button>["size"];
  uniform?: boolean;
};

function OnboardingBannerActionButton({
  action,
}: {
  action: OnboardingBannerAction;
}): React.ReactElement {
  const Icon = action.icon;

  return (
    <Button
      aria-label={action.ariaLabel}
      className={action.className}
      color={action.color ?? "primary"}
      disabled={action.disabled}
      loading={action.loading}
      onClick={action.onClick}
      size={action.size ?? "composerSm"}
      uniform={action.uniform}
    >
      {Icon ? <Icon className="icon-xs" /> : null}
      {action.label}
    </Button>
  );
}

export function OnboardingBanner({
  actionsClassName,
  actionsPlacement = "aside",
  badge,
  bodyClassName,
  className,
  description,
  dismissAction,
  leadingClassName,
  leadingVisual,
  primaryAction,
  secondaryAction,
  title,
}: {
  actionsClassName?: string;
  actionsPlacement?: "aside" | "body" | "bodyOnNarrow";
  badge?: ReactNode;
  bodyClassName?: string;
  className?: string;
  description: ReactNode;
  dismissAction?: OnboardingBannerAction;
  leadingClassName?: string;
  leadingVisual?: ReactNode;
  primaryAction?: OnboardingBannerAction;
  secondaryAction?: OnboardingBannerAction;
  title: ReactNode;
}): React.ReactElement {
  const hasActions =
    primaryAction != null || secondaryAction != null || dismissAction != null;
  const renderActions = (className?: string): React.ReactNode => (
    <div
      className={clsx(
        "flex items-center gap-2",
        actionsPlacement === "body" || actionsPlacement === "bodyOnNarrow"
          ? "mt-3 justify-start"
          : "self-center max-[400px]:w-full max-[400px]:justify-center max-[400px]:self-stretch",
        actionsClassName,
        className,
      )}
    >
      {secondaryAction ? (
        <OnboardingBannerActionButton action={secondaryAction} />
      ) : null}
      {primaryAction ? (
        <OnboardingBannerActionButton action={primaryAction} />
      ) : null}
      {dismissAction ? (
        <OnboardingBannerActionButton action={dismissAction} />
      ) : null}
    </div>
  );

  const bodyActions =
    hasActions && actionsPlacement === "body" ? renderActions() : null;
  const narrowBodyActions =
    hasActions && actionsPlacement === "bodyOnNarrow"
      ? renderActions("hidden max-[400px]:flex")
      : null;
  const asideActions =
    hasActions && actionsPlacement === "aside" ? renderActions() : null;
  const wideAsideActions =
    hasActions && actionsPlacement === "bodyOnNarrow"
      ? renderActions("max-[400px]:hidden")
      : null;

  return (
    <Banner
      layout="horizontal"
      stackOnNarrow
      className={clsx(
        "!rounded-3xl border-token-border/50 bg-token-input-background/70 px-3 py-3 pr-3 text-sm dark:!border-token-border/50",
        className,
      )}
      content={
        <div className="flex min-w-0 items-center gap-2 max-[400px]:items-start">
          {leadingVisual ? (
            <div
              className={clsx(
                "text-token-text-secondary ml-1 flex h-6 w-6 shrink-0 items-center justify-center self-center",
                leadingClassName,
              )}
            >
              {leadingVisual}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 text-base font-medium text-token-text-primary">
                {title}
              </div>
              {badge ? (
                <Badge className="border border-token-border-default bg-transparent px-1.5 py-0.5 text-xs font-medium text-token-text-secondary">
                  {badge}
                </Badge>
              ) : null}
            </div>
            <div
              className={clsx(
                "text-token-text-secondary mt-0.5 text-base leading-relaxed",
                bodyClassName,
              )}
            >
              {description}
            </div>
            {bodyActions}
            {narrowBodyActions}
          </div>
        </div>
      }
      customCtas={asideActions ?? wideAsideActions ?? undefined}
    />
  );
}
