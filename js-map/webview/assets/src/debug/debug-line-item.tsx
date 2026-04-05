import type React from "react";

import { CopyButton } from "@/components/copy-button";

export function DebugLineItem({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div
      className="group/line-item relative flex items-start justify-between border-t-[0.5px] border-token-border py-1.5 tabular-nums first:border-t-0"
      style={{ ["--debug-label-width" as string]: "110px" }}
    >
      <span
        className="shrink-0 text-left text-token-description-foreground"
        style={{ width: "var(--debug-label-width)" }}
      >
        {label}
      </span>
      <span className="flex-1 pr-3 text-left">{value}</span>
      <CopyButton
        iconOnly
        className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover/line-item:opacity-100"
        iconClassName="icon-2xs"
        onCopy={() => {
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(value).catch(() => {});
          }
        }}
      />
    </div>
  );
}
