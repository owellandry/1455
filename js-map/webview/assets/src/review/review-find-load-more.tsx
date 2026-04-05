import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";

export function ReviewFindLoadMore({
  onClick,
}: {
  onClick: () => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-2">
      <Button color="secondary" size="default" onClick={onClick}>
        <FormattedMessage
          id="codex.review.find.loadMore"
          defaultMessage="Load more matches"
          description="Button to load more matching diffs while find is active in capped review mode"
        />
      </Button>
    </div>
  );
}
