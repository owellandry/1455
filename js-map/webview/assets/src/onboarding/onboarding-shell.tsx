import clsx from "clsx";
import type React from "react";
import { FormattedMessage } from "react-intl";

import { Checkbox } from "@/components/checkbox";
import { WithWindow } from "@/components/with-window";
import { usePlatform } from "@/hooks/use-platform";

export const ONBOARDING_CHECKBOX_CLASSNAME =
  "h-[18px] w-[18px] rounded-[3px] border-[1px]";

export function OnboardingCheckboxList({
  children,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "flex h-[240px] w-full flex-col gap-2 overflow-y-auto rounded-2xl border border-token-border bg-token-surface-primary px-5 py-4",
        className,
      )}
      role="list"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function OnboardingCheckboxListRow({
  checkboxId,
  checked,
  disabled = false,
  onCheckedChange,
  control,
  label,
  description,
  leadingContent,
  trailingContent,
  className,
  checkboxClassName = ONBOARDING_CHECKBOX_CLASSNAME,
  labelClassName,
  descriptionClassName,
  trailingClassName,
}: {
  checkboxId?: string;
  checked?: boolean | "indeterminate";
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  control?: React.ReactNode;
  label: React.ReactNode;
  description?: React.ReactNode;
  leadingContent?: React.ReactNode;
  trailingContent?: React.ReactNode;
  className?: string;
  checkboxClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  trailingClassName?: string;
}): React.ReactElement {
  const shouldRenderCheckbox =
    control == null &&
    checkboxId != null &&
    checked != null &&
    onCheckedChange != null;
  const controlNode = shouldRenderCheckbox ? (
    <Checkbox
      id={checkboxId}
      className={checkboxClassName}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => {
        onCheckedChange(value);
      }}
    />
  ) : (
    control
  );

  return (
    <div
      className={clsx(
        "relative flex items-start gap-2 last:border-b-0",
        className,
      )}
      role="listitem"
    >
      <div className="pt-[2px]">{controlNode}</div>
      {leadingContent != null ? (
        <div className="pt-[2px]">{leadingContent}</div>
      ) : null}
      <label
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
        htmlFor={shouldRenderCheckbox ? checkboxId : undefined}
      >
        <div className="min-w-0 flex-1">
          <div
            className={clsx(
              "truncate text-[13px] font-medium leading-6 text-token-foreground",
              labelClassName,
            )}
          >
            {label}
          </div>
          {description != null ? (
            <div
              className={clsx(
                "truncate text-[12px] leading-[22px] text-token-description-foreground",
                descriptionClassName,
              )}
            >
              {description}
            </div>
          ) : null}
        </div>
        {trailingContent != null ? (
          <span
            className={clsx(
              "max-w-[45%] shrink truncate text-right text-[12px] leading-5 text-token-description-foreground",
              trailingClassName,
            )}
          >
            {trailingContent}
          </span>
        ) : null}
      </label>
    </div>
  );
}

export function OnboardingContentFrame({
  children,
  icon,
  title,
  subtitle,
  className,
  textClassName,
  titleClassName,
  subtitleClassName,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  textClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}): React.ReactElement {
  return (
    <div className={clsx("flex w-full flex-col items-center gap-6", className)}>
      {icon != null ? icon : null}
      <div
        className={clsx(
          "flex w-full flex-col items-center text-center",
          textClassName,
        )}
      >
        <span
          className={clsx(
            "text-[24px] font-semibold text-token-foreground",
            titleClassName,
          )}
        >
          {title}
        </span>
        {subtitle != null ? (
          <span
            className={clsx(
              "text-[15px] leading-6 text-token-description-foreground",
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function OnboardingShell({
  children,
  fullBleed = false,
  hideHeader = false,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
  hideHeader?: boolean;
}): React.ReactElement {
  const { platform } = usePlatform();
  const shouldShowHeader = !hideHeader && platform !== "windows";

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-token-bg-primary electron:bg-transparent" />
      <WithWindow electron>
        {shouldShowHeader ? (
          <div className="draggable fixed inset-x-0 top-0 z-10 flex h-toolbar-sm items-center justify-center text-sm font-medium text-token-description-foreground select-none">
            <FormattedMessage
              id="electron.onboarding.shell.title"
              defaultMessage="Codex"
              description="Title shown in the draggable header on the desktop onboarding pages"
            />
          </div>
        ) : null}
        <div
          className={
            fullBleed
              ? "fixed inset-0"
              : "fixed inset-0 top-toolbar-sm flex items-center justify-center px-6 pt-2 pb-8"
          }
        >
          {children}
        </div>
      </WithWindow>
    </div>
  );
}
