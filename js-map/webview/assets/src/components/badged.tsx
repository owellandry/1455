import clsx from "clsx";

export function Badged({
  children,
  color = "bg-token-text-link-active-foreground",
  borderColor,
  badgeEnabled = true,
}: {
  children: React.ReactNode;
  color?: string;
  borderColor?: string;
  badgeEnabled?: boolean;
}): React.ReactElement {
  if (!badgeEnabled) {
    return <>{children}</>;
  }
  return (
    <div className="relative">
      {children}
      <div
        className={clsx(
          "border-token-bg-primary absolute right-0 top-0 size-[7px] translate-x-[2px] translate-y-[-2px] rounded-full border-[1px]",
          color,
          borderColor,
          !badgeEnabled && "hidden",
        )}
      />
    </div>
  );
}
