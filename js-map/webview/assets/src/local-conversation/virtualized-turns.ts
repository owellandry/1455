export function buildTurnOffsets({
  heightsPx,
  gapPx,
}: {
  heightsPx: Array<number>;
  gapPx: number;
}): {
  offsetsPx: Array<number>;
  totalHeightPx: number;
} {
  const offsetsPx = Array<number>();
  let totalHeightPx = 0;

  for (let index = 0; index < heightsPx.length; index++) {
    offsetsPx.push(totalHeightPx);
    totalHeightPx += heightsPx[index] ?? 0;
    if (index < heightsPx.length - 1) {
      totalHeightPx += gapPx;
    }
  }

  return { offsetsPx, totalHeightPx };
}

export function getVisibleTurnRange({
  offsetsPx,
  heightsPx,
  viewportTopPx,
  viewportBottomPx,
  overscanCount,
}: {
  offsetsPx: Array<number>;
  heightsPx: Array<number>;
  viewportTopPx: number;
  viewportBottomPx: number;
  overscanCount: number;
}): {
  startIndex: number;
  endIndex: number;
} {
  const count = heightsPx.length;
  if (count === 0) {
    return { startIndex: 0, endIndex: 0 };
  }

  const firstVisibleIndex = findFirstBottomAfter({
    offsetsPx,
    heightsPx,
    targetPx: viewportTopPx,
  });
  const firstHiddenIndex = findFirstOffsetAtOrAfter({
    offsetsPx,
    targetPx: viewportBottomPx,
  });

  if (firstVisibleIndex >= count) {
    return {
      startIndex: Math.max(0, count - 1 - overscanCount),
      endIndex: count,
    };
  }

  return {
    startIndex: Math.max(0, firstVisibleIndex - overscanCount),
    endIndex: Math.min(count, Math.max(firstHiddenIndex, 1) + overscanCount),
  };
}

function findFirstBottomAfter({
  offsetsPx,
  heightsPx,
  targetPx,
}: {
  offsetsPx: Array<number>;
  heightsPx: Array<number>;
  targetPx: number;
}): number {
  let low = 0;
  let high = heightsPx.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const bottomPx = (offsetsPx[mid] ?? 0) + (heightsPx[mid] ?? 0);
    if (bottomPx > targetPx) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

function findFirstOffsetAtOrAfter({
  offsetsPx,
  targetPx,
}: {
  offsetsPx: Array<number>;
  targetPx: number;
}): number {
  let low = 0;
  let high = offsetsPx.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((offsetsPx[mid] ?? 0) >= targetPx) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}
