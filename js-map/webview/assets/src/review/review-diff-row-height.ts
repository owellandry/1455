const REVIEW_DIFF_HEADER_AND_CHROME_PX = 56;
const REVIEW_DIFF_APPROX_LINE_PX = 20;
const REVIEW_DIFF_MAX_ESTIMATED_BODY_LINES = 480;

export function estimateReviewDiffRowHeightPx({
  additions,
  deletions,
  viewType,
}: {
  additions: number;
  deletions: number;
  viewType: "split" | "unified";
}): number {
  const bodyLines = Math.min(
    additions + deletions,
    REVIEW_DIFF_MAX_ESTIMATED_BODY_LINES,
  );
  const modeScale = viewType === "split" ? 2 : 1;

  return (
    REVIEW_DIFF_HEADER_AND_CHROME_PX +
    bodyLines * REVIEW_DIFF_APPROX_LINE_PX * modeScale
  );
}
