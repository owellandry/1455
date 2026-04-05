import type React from "react";

import { DebugLineItem } from "./debug-line-item";

export function DebugEntry({
  lines,
}: {
  lines: Array<{ label: string; value: string }>;
}): React.ReactElement {
  return (
    <div className="flex flex-col py-1.5">
      {lines.map((line) => (
        <DebugLineItem key={line.label} label={line.label} value={line.value} />
      ))}
    </div>
  );
}
