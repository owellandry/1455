export function formatElapsedDuration(
  durationMs: number,
  {
    underOneSecond = "null",
    trimZeroUnits = false,
  }: {
    underOneSecond?: "null" | "zero";
    trimZeroUnits?: boolean;
  } = {},
): string | null {
  const clampedDurationMs = Math.max(durationMs, 0);
  const totalSeconds = Math.floor(clampedDurationMs / 1000);
  if (totalSeconds < 1) {
    if (underOneSecond === "zero") {
      return "0s";
    }
    return null;
  }
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const secondsPerHour = 60 * 60;
  const hours = Math.floor(totalSeconds / secondsPerHour);
  const minutes = Math.floor((totalSeconds % secondsPerHour) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (!trimZeroUnits) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    const parts = [`${hours}h`];
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (seconds > 0) {
      parts.push(`${seconds}s`);
    }
    return parts.join(" ");
  }
  if (trimZeroUnits && seconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}
