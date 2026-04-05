import clsx from "clsx";
import type { ReactElement } from "react";

const DEFAULT_SIZE = 12;
const STROKE_WIDTH = 2;
const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_PERCENT;
  }
  if (value < MIN_PERCENT) {
    return MIN_PERCENT;
  }
  if (value > MAX_PERCENT) {
    return MAX_PERCENT;
  }
  return value;
}

export function ProgressionDonut({
  percent,
  size = DEFAULT_SIZE,
  className,
}: {
  percent: number;
  size?: number;
  className?: string;
}): ReactElement {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = clampPercent(percent);
  const dashOffset = circumference * (1 - clampedPercent / 100);

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={clsx("shrink-0", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        fill="none"
        opacity={0.16}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 120ms ease-out" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
