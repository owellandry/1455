import clsx from "clsx";
import type React from "react";

type SettingsGroupComponent = ((props: {
  children: React.ReactNode;
  className?: string;
}) => React.ReactElement) & {
  Header: typeof SettingsGroupHeader;
  Content: typeof SettingsGroupContent;
};

/**
 * Shared wrapper for labeled settings sections.
 */
function SettingsGroupBase({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section className={clsx("flex flex-col", className)}>{children}</section>
  );
}

function SettingsGroupHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const hasTitle = title != null;
  const hasSubtitle = subtitle != null;
  const hasActions = actions != null;

  if (!hasTitle && !hasSubtitle && !hasActions) {
    return <></>;
  }

  return (
    <div
      className={clsx(
        hasSubtitle
          ? "flex items-start justify-between gap-2 px-0 py-0"
          : "flex h-toolbar items-center justify-between gap-2 px-0 py-0",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? (
          <div className="text-base font-medium text-token-text-primary">
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div className="text-base font-normal text-token-text-tertiary">
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

function SettingsGroupContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>{children}</div>
  );
}

export const SettingsGroup: SettingsGroupComponent = Object.assign(
  SettingsGroupBase,
  {
    Header: SettingsGroupHeader,
    Content: SettingsGroupContent,
  },
);
