import { formatElapsedDuration } from "./format-elapsed-duration";

export function formatWorkedDuration(durationMs: number): string {
  return (
    formatElapsedDuration(durationMs, {
      underOneSecond: "zero",
      trimZeroUnits: true,
    }) ?? "0s"
  );
}
