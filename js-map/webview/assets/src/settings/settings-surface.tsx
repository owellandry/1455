import clsx from "clsx";
import type React from "react";

export function SettingsSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        className,
        "border-token-border flex flex-col divide-y-[0.5px] divide-token-border rounded-lg border",
      )}
      style={{
        backgroundColor:
          "var(--color-background-panel, var(--color-token-bg-fog))",
      }}
    >
      {children}
    </div>
  );
}
