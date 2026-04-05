type HueRange = {
  start: number;
  end: number;
};

/**
 * Evenly assigns hues across the allowed parts of the color wheel after
 * excluding any forbidden ranges.
 */
export function assignEvenlySpacedHuesById(
  ids: Array<string>,
  {
    forbiddenHueRanges = [],
  }: {
    forbiddenHueRanges?: Array<HueRange>;
  } = {},
): Record<string, number> {
  const uniqueSortedIds = [...new Set(ids)].sort((first, second) =>
    first.localeCompare(second),
  );
  const huesById: Record<string, number> = {};
  const allowedHueRanges = getAllowedHueRanges(forbiddenHueRanges);
  const totalAllowedHueSpan = allowedHueRanges.reduce((total, range) => {
    return total + (range.end - range.start);
  }, 0);

  if (totalAllowedHueSpan === 0) {
    return huesById;
  }

  uniqueSortedIds.forEach((id, index) => {
    const slotOffset =
      ((index + 0.5) * totalAllowedHueSpan) / uniqueSortedIds.length;
    huesById[id] = getHueAtAllowedOffset(slotOffset, allowedHueRanges);
  });

  return huesById;
}

function getAllowedHueRanges(
  forbiddenHueRanges: Array<HueRange>,
): Array<HueRange> {
  const normalizedRanges = forbiddenHueRanges
    .flatMap((range) => {
      const normalizedStart = ((range.start % 360) + 360) % 360;
      const normalizedEnd = ((range.end % 360) + 360) % 360;

      if (normalizedStart <= normalizedEnd) {
        return [{ start: normalizedStart, end: normalizedEnd }];
      }

      // Wraparound ranges like 330..45 become two sortable segments.
      return [
        { start: normalizedStart, end: 360 },
        { start: 0, end: normalizedEnd },
      ];
    })
    .sort((first, second) => first.start - second.start);

  if (normalizedRanges.length === 0) {
    return [{ start: 0, end: 360 }];
  }

  const mergedForbiddenRanges: Array<HueRange> = [];

  normalizedRanges.forEach((range) => {
    const previousRange =
      mergedForbiddenRanges[mergedForbiddenRanges.length - 1];

    if (!previousRange || range.start > previousRange.end) {
      mergedForbiddenRanges.push(range);
      return;
    }

    previousRange.end = Math.max(previousRange.end, range.end);
  });

  const allowedRanges: Array<HueRange> = [];
  let previousEnd = 0;

  mergedForbiddenRanges.forEach((range) => {
    if (range.start > previousEnd) {
      allowedRanges.push({
        start: previousEnd,
        end: range.start,
      });
    }

    previousEnd = range.end;
  });

  if (previousEnd < 360) {
    allowedRanges.push({
      start: previousEnd,
      end: 360,
    });
  }

  return allowedRanges;
}

function getHueAtAllowedOffset(
  offset: number,
  allowedHueRanges: Array<HueRange>,
): number {
  let remainingOffset = offset;

  for (const range of allowedHueRanges) {
    const rangeSpan = range.end - range.start;

    if (remainingOffset <= rangeSpan) {
      return range.start + remainingOffset;
    }

    remainingOffset -= rangeSpan;
  }

  const lastRange = allowedHueRanges[allowedHueRanges.length - 1];
  return lastRange?.end ?? 0;
}
