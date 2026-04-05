import { FormattedMessage, useIntl } from "react-intl";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import CheckIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import { formatBranchLabelWithStartEllipsis } from "@/utils/format-branch-label-with-start-ellipsis";

import type { DiffFilter } from "./diff-filter";

export function ReviewHeaderSourceControls({
  baseBranch,
  baseBranchRemote,
  currentBranch,
  diffFilter,
  isReviewExpanded,
  onSelectDiffFilter,
  reviewSource,
  stagedFileCount,
  unstagedFileCount,
}: {
  baseBranch: string | null;
  baseBranchRemote: string | null;
  currentBranch: string | null;
  diffFilter?: DiffFilter;
  isReviewExpanded: boolean;
  onSelectDiffFilter?: (filter: DiffFilter) => void;
  reviewSource: "local" | "worktree" | "cloud";
  stagedFileCount?: number;
  unstagedFileCount?: number;
}): React.ReactElement {
  const showBranchRange =
    isReviewExpanded &&
    reviewSource !== "cloud" &&
    diffFilter === "branch" &&
    currentBranch != null;

  return (
    <div className="flex min-w-0 items-center text-base">
      <div className="min-w-0 font-medium text-token-foreground">
        <ReviewSourceSelector
          source={reviewSource}
          diffFilter={diffFilter}
          onSelectDiffFilter={onSelectDiffFilter}
          stagedFileCount={stagedFileCount}
          unstagedFileCount={unstagedFileCount}
          baseBranch={baseBranch}
          baseBranchRemote={baseBranchRemote}
          currentBranch={currentBranch}
        />
      </div>
      {showBranchRange ? (
        <BranchRangeLabel
          currentBranch={currentBranch}
          targetBranch={baseBranch ?? "main"}
        />
      ) : null}
    </div>
  );
}

function BranchRangeLabel({
  currentBranch,
  targetBranch,
}: {
  currentBranch: string;
  targetBranch: string;
}): React.ReactElement {
  return (
    <span className="truncate text-sm font-normal text-token-description-foreground max-[1024px]:hidden">
      <FormattedMessage
        id="codex.review.source.local.all.currentToTarget"
        defaultMessage="{currentBranch} → {targetBranch}"
        description="Branch range label shown in expanded review header when all branch changes are selected"
        values={{ currentBranch, targetBranch }}
      />
    </span>
  );
}

function ReviewSourceSelector({
  source,
  diffFilter,
  onSelectDiffFilter,
  stagedFileCount,
  unstagedFileCount,
  baseBranch,
  baseBranchRemote,
  currentBranch,
}: {
  source: "local" | "worktree" | "cloud";
  diffFilter?: DiffFilter;
  onSelectDiffFilter?: (filter: DiffFilter) => void;
  stagedFileCount?: number;
  unstagedFileCount?: number;
  baseBranch: string | null;
  baseBranchRemote: string | null;
  currentBranch: string | null;
}): React.ReactElement | string {
  const intl = useIntl();

  if (source === "cloud") {
    return (
      <FormattedMessage
        id="codex.review.source.cloud"
        defaultMessage="Cloud changes"
        description="Label for cloud task reviews"
      />
    );
  }

  const getStageLabel = (stage: "staged" | "unstaged"): string => {
    if (stage === "unstaged") {
      return intl.formatMessage({
        id: "codex.review.stageFilter.unstaged",
        defaultMessage: "Unstaged",
        description: "Show unstaged changes when there are none",
      });
    }

    return intl.formatMessage({
      id: "codex.review.stageFilter.staged",
      defaultMessage: "Staged",
      description: "Show staged changes when there are none",
    });
  };
  const renderOptionLabel = (
    label: string,
    count?: number,
  ): React.ReactNode => {
    if (count == null || count <= 0) {
      return label;
    }

    return (
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        <Badge className="disambiguated-digits px-1.5 py-0.5 text-xs font-medium">
          {count}
        </Badge>
      </span>
    );
  };
  const branchLabel = intl.formatMessage({
    id: "codex.review.source.local.all",
    defaultMessage: "Branch",
    description:
      "Dropdown label in the Codex review header for viewing branch changes. Keep it short for a compact menu item.",
  });
  const lastTurnLabel = intl.formatMessage({
    id: "codex.review.source.local.lastTurn",
    defaultMessage: "Last turn",
    description:
      "Dropdown label in the Codex review header for showing only the most recent assistant turn's diff. Keep it short for a compact menu item.",
  });
  const branchOption =
    baseBranch && baseBranchRemote && currentBranch ? (
      <span className="leading-tight">
        <span className="block">{branchLabel}</span>
        <span className="flex max-w-[300px] items-center gap-0.5 overflow-hidden font-normal whitespace-nowrap text-token-text-secondary">
          <span>{formatBranchLabelWithStartEllipsis(currentBranch, 20)}</span>
          <span className="flex min-w-0 items-center gap-0.5">
            {/* oxlint-disable formatjs/no-literal-string-in-jsx */}
            <span className="flex-shrink-0 opacity-75">→</span>
            <span className="flex-shrink-0">
              {baseBranchRemote}/{baseBranch}
            </span>
            {/* oxlint-enable formatjs/no-literal-string-in-jsx */}
          </span>
        </span>
      </span>
    ) : undefined;
  const options: Array<{
    id: DiffFilter;
    renderedLabel: React.ReactNode;
    menuItem?: React.ReactElement;
  }> = [
    {
      id: "unstaged",
      renderedLabel: renderOptionLabel(
        getStageLabel("unstaged"),
        unstagedFileCount,
      ),
    },
    {
      id: "staged",
      renderedLabel: renderOptionLabel(
        getStageLabel("staged"),
        stagedFileCount,
      ),
    },
    {
      id: "branch",
      renderedLabel: branchLabel,
      menuItem: branchOption,
    },
    {
      id: "last-turn",
      renderedLabel: lastTurnLabel,
    },
  ];

  if (!diffFilter || !onSelectDiffFilter) {
    const fallbackLabel =
      options.find((option) => option.id === diffFilter)?.renderedLabel ??
      options[0]?.renderedLabel;
    return <>{fallbackLabel}</>;
  }

  const selectedOption =
    options.find((option) => option.id === diffFilter) ?? options[0];

  return (
    <BasicDropdown
      triggerButton={
        <Button
          color="ghostActive"
          className="flex w-full max-w-[320px] min-w-0 items-center gap-1 px-2 py-1 text-base"
        >
          <span className="flex max-w-full min-w-0 items-center gap-1.5 truncate">
            {selectedOption.renderedLabel}
          </span>
          <ChevronIcon className="icon-2xs text-token-description-foreground" />
        </Button>
      }
      contentWidth="menuBounded"
    >
      {options.map((option) => (
        <Dropdown.Item
          key={option.id}
          onSelect={() => onSelectDiffFilter(option.id)}
          RightIcon={selectedOption.id === option.id ? CheckIcon : undefined}
        >
          {option.menuItem ?? option.renderedLabel}
        </Dropdown.Item>
      ))}
    </BasicDropdown>
  );
}
