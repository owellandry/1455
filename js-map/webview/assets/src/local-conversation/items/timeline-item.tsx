import clsx from "clsx";

export function TimelineItem({
  children,
  className,
  padding = "default",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "default" | "offset";
}): React.ReactElement {
  const baseClassName = clsx("min-w-0 text-size-chat", className);

  if (padding === "offset") {
    return (
      <div className={clsx(baseClassName, "relative overflow-visible py-0")}>
        {children}
      </div>
    );
  }

  return <div className={clsx(baseClassName, "py-0")}>{children}</div>;
}
