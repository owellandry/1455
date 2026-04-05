import type { GhPullRequestCheck } from "protocol";
import type { ReactElement } from "react";

import UnselectedCircleIcon from "@/icons/unselected-circle.svg";

const RING_RADIUS = 5.75;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SEGMENT_GAP_LENGTH = 1.5;

export function PullRequestChecksStatusRing({
  checks,
}: {
  checks: Array<GhPullRequestCheck>;
}): ReactElement {
  const segments = getChecksStatusRingSegments(checks);

  if (segments.length === 0) {
    return (
      <UnselectedCircleIcon className="icon-sm shrink-0 text-token-description-foreground" />
    );
  }

  const gapLength = segments.length > 1 ? SEGMENT_GAP_LENGTH : 0;
  let offset = 0;

  return (
    <svg
      aria-hidden
      className="icon-sm shrink-0"
      fill="none"
      viewBox="0 0 18 18"
    >
      <g transform="rotate(-90 9 9)">
        {segments.map((segment) => {
          const segmentLength = RING_CIRCUMFERENCE * segment.ratio;
          const visibleLength = Math.max(segmentLength - gapLength, 0.001);
          const dashArray = `${visibleLength} ${RING_CIRCUMFERENCE}`;
          const dashOffset = -(offset + gapLength / 2);
          offset += segmentLength;

          return (
            <circle
              key={segment.key}
              cx="9"
              cy="9"
              r={RING_RADIUS}
              stroke={segment.color}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              strokeWidth="1.7"
            />
          );
        })}
      </g>
    </svg>
  );
}

function getChecksStatusRingSegments(checks: Array<GhPullRequestCheck>): Array<{
  color: string;
  key: string;
  ratio: number;
}> {
  const totalChecks = checks.length;

  if (totalChecks === 0) {
    return [];
  }

  const counts = {
    failing: checks.filter((check) => check.status === "failing").length,
    passing: checks.filter((check) => check.status === "passing").length,
    pending: checks.filter((check) => check.status === "pending").length,
    skipped: checks.filter((check) => check.status === "skipped").length,
    unknown: checks.filter((check) => check.status === "unknown").length,
  };

  return [
    {
      color: "var(--color-token-charts-green)",
      count: counts.passing,
      key: "passing",
    },
    {
      color: "var(--color-token-charts-red)",
      count: counts.failing,
      key: "failing",
    },
    {
      color: "var(--color-token-charts-yellow)",
      count: counts.pending,
      key: "pending",
    },
    {
      color: "var(--color-token-description-foreground)",
      count: counts.skipped + counts.unknown,
      key: "skipped",
    },
  ]
    .filter((segment) => segment.count > 0)
    .map((segment) => ({
      color: segment.color,
      key: segment.key,
      ratio: segment.count / totalChecks,
    }));
}
