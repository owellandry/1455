import { FormattedMessage } from "react-intl";

export function LargeDiffBanner(): React.ReactElement {
  return (
    <div className="bg-token-surface-muted text-token-foreground-muted rounded-md px-3 py-2 text-xs">
      <FormattedMessage
        id="codex.review.largeDiff.banner"
        defaultMessage="Large diff detected — showing one file at a time."
        description="Banner shown when the review switches to single-file mode for large diffs"
      />
    </div>
  );
}
