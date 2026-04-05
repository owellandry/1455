import { assignEvenlySpacedHuesById } from "./assign-evenly-spaced-hues";

const REMOTE_HOST_GLOBE_LIGHTNESS = 0.74;
const REMOTE_HOST_GLOBE_MIN_CHROMA = 0.09;
const REMOTE_HOST_GLOBE_MAX_CHROMA = 0.18;
const REMOTE_HOST_GLOBE_FORBIDDEN_HUE_RANGES = [
  { start: 330, end: 45 },
  { start: 95, end: 165 },
];

function toOklchColor({
  chroma,
  hue,
}: {
  chroma: number;
  hue: number;
}): string {
  return `oklch(${REMOTE_HOST_GLOBE_LIGHTNESS} ${chroma} ${hue.toFixed(2)})`;
}

function getEvenlySpacedHostChroma({
  hostCount,
  hostIndex,
}: {
  hostCount: number;
  hostIndex: number;
}): number {
  if (hostCount <= 1) {
    return (REMOTE_HOST_GLOBE_MIN_CHROMA + REMOTE_HOST_GLOBE_MAX_CHROMA) / 2;
  }

  const chromaStep =
    (REMOTE_HOST_GLOBE_MAX_CHROMA - REMOTE_HOST_GLOBE_MIN_CHROMA) /
    (hostCount - 1);

  return REMOTE_HOST_GLOBE_MIN_CHROMA + chromaStep * hostIndex;
}

export function getRemoteHostGlobeColorsByHostId(
  hostIds: Array<string>,
): Record<string, string> {
  const huesByHostId = assignEvenlySpacedHuesById(hostIds, {
    forbiddenHueRanges: REMOTE_HOST_GLOBE_FORBIDDEN_HUE_RANGES,
  });
  const colorsByHostId: Record<string, string> = {};
  const sortedHostIds = Object.keys(huesByHostId).sort((first, second) =>
    first.localeCompare(second),
  );

  sortedHostIds.forEach((hostId, index) => {
    const hue = huesByHostId[hostId];

    colorsByHostId[hostId] = toOklchColor({
      chroma: getEvenlySpacedHostChroma({
        hostCount: sortedHostIds.length,
        hostIndex: index,
      }),
      hue,
    });
  });

  return colorsByHostId;
}
