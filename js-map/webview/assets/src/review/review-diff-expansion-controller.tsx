import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";

/* oxlint-disable react/only-export-components */
import { useExpandAllCodeDiffs } from "@/diff/use-expand-all-code-diffs";

type ReviewDiffExpansionContextValue = {
  expandedDiffs: boolean;
  toggleExpandedDiffs: () => void;
};

const ReviewDiffExpansionContext =
  createContext<ReviewDiffExpansionContextValue | null>(null);

export function ReviewDiffExpansionController({
  children,
}: PropsWithChildren): ReactElement {
  const [expandedDiffs, setExpandedDiffs] = useState(true);
  const toggleAllDiffs = useExpandAllCodeDiffs(setExpandedDiffs, "review");

  return (
    <ReviewDiffExpansionContext.Provider
      value={{
        expandedDiffs,
        toggleExpandedDiffs: (): void => {
          toggleAllDiffs(!expandedDiffs);
        },
      }}
    >
      {children}
    </ReviewDiffExpansionContext.Provider>
  );
}

export function useReviewDiffExpansion(): ReviewDiffExpansionContextValue {
  const value = useContext(ReviewDiffExpansionContext);
  if (value == null) {
    throw new Error(
      "Review diff expansion must be used inside ReviewDiffExpansionController",
    );
  }
  return value;
}
