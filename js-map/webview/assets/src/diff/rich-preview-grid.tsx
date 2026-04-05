import clsx from "clsx";

export function RichPreviewGrid({
  className,
  showAfterOnly,
  after,
  before,
}: {
  className?: string;
  showAfterOnly: boolean;
  after: React.ReactNode;
  before: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={clsx("relative overflow-auto", className)}>
      <div
        className={clsx(
          "grid gap-px",
          showAfterOnly ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {showAfterOnly ? (
          after
        ) : (
          <>
            {before}
            {after}
          </>
        )}
      </div>
    </div>
  );
}
