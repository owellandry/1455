import clsx from "clsx";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import ClipboardIcon from "@/icons/clipboard.svg";
import CollapseIcon from "@/icons/collapse.svg";
import SplitDiffIcon from "@/icons/diff-split.svg";
import UnifiedDiffIcon from "@/icons/diff-unified.svg";
import DiffIcon from "@/icons/diff.svg";
import ExpandIcon from "@/icons/expand.svg";
import FileIcon from "@/icons/file.svg";
import FoldersIcon from "@/icons/folders.svg";
import ImageSquareIcon from "@/icons/image-square.svg";
import JsonIcon from "@/icons/json.svg";
import OverflowIcon from "@/icons/overflow.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import TextLongerIcon from "@/icons/text-longer.svg";
import TextShorterIcon from "@/icons/text-shorter.svg";
import TextWrapIcon from "@/icons/text-wrap.svg";
import ThreeDotsIcon from "@/icons/three-dots.svg";
import WrapIcon from "@/icons/wrap.svg";

export type ReviewHeaderDiffControls = {
  diffMode: "unified" | "split";
  onSelectDiffMode: (selected: "left" | "right") => void;
  wrap: boolean;
  onToggleWrap: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  richPreviewEnabled: boolean;
  onToggleRichPreview: () => void;
  wordDiffsEnabled: boolean;
  onToggleWordDiffs: () => void;
  loadFullFilesEnabled: boolean;
  onToggleLoadFullFiles: () => void;
};

export function ReviewHeaderToolbar({
  copyGitApplyCommandDisabled,
  diffControls,
  fileTreeToggleDisabled,
  fileTreeToggleLabel,
  isReviewExpanded,
  onClickCopyGitApplyCommand,
  onCollapseReview,
  onExpandReview,
  onRefreshGitQueries,
  onToggleFileTree,
  refreshGitQueriesDisabled,
  showCopyGitApplyCommand,
  showRefreshGitQueries,
}: {
  copyGitApplyCommandDisabled?: boolean;
  diffControls: ReviewHeaderDiffControls;
  fileTreeToggleDisabled: boolean;
  fileTreeToggleLabel: string;
  isReviewExpanded: boolean;
  onClickCopyGitApplyCommand?: () => void;
  onCollapseReview: () => void;
  onExpandReview: () => void;
  onRefreshGitQueries?: () => void;
  onToggleFileTree?: () => void;
  refreshGitQueriesDisabled?: boolean;
  showCopyGitApplyCommand?: boolean;
  showRefreshGitQueries?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const refreshLabel = intl.formatMessage({
    id: "codex.review.refreshGitQueries",
    defaultMessage: "Refresh",
    description: "Menu item to refresh git queries for the current repository",
  });
  const switchDiffModeLabel =
    diffControls.diffMode === "unified"
      ? intl.formatMessage({
          id: "codex.review.switchToSplit",
          defaultMessage: "Switch to split diff",
          description: "Menu item to switch to split diff view",
        })
      : intl.formatMessage({
          id: "codex.review.switchToUnified",
          defaultMessage: "Switch to unified diff",
          description: "Menu item to switch to unified diff view",
        });
  const wrapLabel = diffControls.wrap
    ? intl.formatMessage({
        id: "codex.review.wrap.disable",
        defaultMessage: "Disable word wrap",
        description: "Menu item to disable word wrap in diff view",
      })
    : intl.formatMessage({
        id: "codex.review.wrap.enable",
        defaultMessage: "Enable word wrap",
        description: "Menu item to enable word wrap in diff view",
      });
  const expandAllLabel = diffControls.expanded
    ? intl.formatMessage({
        id: "codex.review.expandOrCollapseDiffMenu.collapse",
        defaultMessage: "Collapse all diffs",
        description:
          "Menu item to collapse all diffs in the review options menu",
      })
    : intl.formatMessage({
        id: "codex.review.expandOrCollapseDiffMenu.expand",
        defaultMessage: "Expand all diffs",
        description: "Menu item to expand all diffs in the review options menu",
      });
  const dropdownLabel = intl.formatMessage({
    id: "codex.review.header.moreOptions",
    defaultMessage: "Review options",
    description: "Aria label for review header dropdown menu button",
  });
  const closeDropdown = (): void => {
    setDropdownOpen(false);
  };
  const optionsContent = (
    <ReviewHeaderOptionsContent
      onClose={closeDropdown}
      wordDiffsEnabled={diffControls.wordDiffsEnabled}
      showCopyGitApplyCommand={showCopyGitApplyCommand}
      copyGitApplyCommandDisabled={copyGitApplyCommandDisabled}
      onClickCopyGitApplyCommand={onClickCopyGitApplyCommand}
      richPreviewEnabled={diffControls.richPreviewEnabled}
      onToggleRichPreview={diffControls.onToggleRichPreview}
      onToggleWordDiffs={diffControls.onToggleWordDiffs}
      loadFullFilesEnabled={diffControls.loadFullFilesEnabled}
      onToggleLoadFullFiles={diffControls.onToggleLoadFullFiles}
    />
  );

  if (isReviewExpanded) {
    const closeReviewLabel = intl.formatMessage({
      id: "codex.review.closeReview",
      defaultMessage: "Close review",
      description:
        "Tooltip label to collapse expanded review and show chat again",
    });
    return (
      <div className="flex items-center gap-1">
        <div
          className={clsx(
            "pointer-events-none flex items-center gap-1 opacity-0 transition-opacity",
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
            dropdownOpen && "pointer-events-auto opacity-100",
          )}
        >
          <BasicDropdown
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            align="end"
            contentWidth="menu"
            triggerButton={
              <Button aria-label={dropdownLabel} color="ghost" size="icon">
                <ThreeDotsIcon className="icon-xs text-token-description-foreground" />
              </Button>
            }
          >
            {optionsContent}
          </BasicDropdown>
          {showRefreshGitQueries ? (
            <HeaderIconButton
              Icon={RegenerateIcon}
              label={refreshLabel}
              onClick={() => onRefreshGitQueries?.()}
              disabled={refreshGitQueriesDisabled || !onRefreshGitQueries}
            />
          ) : null}
          <HeaderIconButton
            Icon={diffControls.wrap ? WrapIcon : OverflowIcon}
            label={wrapLabel}
            onClick={diffControls.onToggleWrap}
          />
          <HeaderIconButton
            Icon={diffControls.expanded ? TextShorterIcon : TextLongerIcon}
            label={expandAllLabel}
            onClick={diffControls.onToggleExpanded}
          />
          <HeaderIconButton
            Icon={
              diffControls.diffMode === "unified"
                ? SplitDiffIcon
                : UnifiedDiffIcon
            }
            label={switchDiffModeLabel}
            onClick={() =>
              diffControls.onSelectDiffMode(
                diffControls.diffMode === "unified" ? "right" : "left",
              )
            }
          />
          {onToggleFileTree ? (
            <HeaderIconButton
              Icon={FoldersIcon}
              label={fileTreeToggleLabel}
              onClick={onToggleFileTree}
              disabled={fileTreeToggleDisabled}
            />
          ) : null}
        </div>
        <HeaderIconButton
          Icon={CollapseIcon}
          label={closeReviewLabel}
          onClick={onCollapseReview}
        />
      </div>
    );
  }

  const expandReviewLabel = intl.formatMessage({
    id: "codex.review.reviewLabel",
    defaultMessage: "Review",
    description: "Short button label shown in the compact review header",
  });

  return (
    <div className="flex items-center gap-1.5">
      <BasicDropdown
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        align="end"
        contentWidth="menu"
        triggerButton={
          <Button aria-label={dropdownLabel} color="ghost" size="icon">
            <ThreeDotsIcon className="icon-xs text-token-description-foreground" />
          </Button>
        }
      >
        {showRefreshGitQueries ? (
          <Dropdown.Item
            onSelect={(event) => {
              event.preventDefault();
              onRefreshGitQueries?.();
              closeDropdown();
            }}
            LeftIcon={RegenerateIcon}
            disabled={refreshGitQueriesDisabled || !onRefreshGitQueries}
          >
            {refreshLabel}
          </Dropdown.Item>
        ) : null}
        <Dropdown.Item
          onSelect={(event) => {
            event.preventDefault();
            diffControls.onSelectDiffMode(
              diffControls.diffMode === "unified" ? "right" : "left",
            );
            closeDropdown();
          }}
          LeftIcon={
            diffControls.diffMode === "unified"
              ? SplitDiffIcon
              : UnifiedDiffIcon
          }
        >
          {switchDiffModeLabel}
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={(event) => {
            event.preventDefault();
            diffControls.onToggleWrap();
            closeDropdown();
          }}
          LeftIcon={diffControls.wrap ? WrapIcon : OverflowIcon}
        >
          {wrapLabel}
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={(event) => {
            event.preventDefault();
            diffControls.onToggleExpanded();
            closeDropdown();
          }}
          LeftIcon={diffControls.expanded ? TextShorterIcon : TextLongerIcon}
        >
          {expandAllLabel}
        </Dropdown.Item>
        <Dropdown.Separator />
        {optionsContent}
      </BasicDropdown>
      {onToggleFileTree ? (
        <HeaderIconButton
          Icon={FoldersIcon}
          label={fileTreeToggleLabel}
          onClick={onToggleFileTree}
          disabled={fileTreeToggleDisabled}
        />
      ) : null}
      <HeaderIconButton
        Icon={ExpandIcon}
        label={expandReviewLabel}
        onClick={onExpandReview}
      />
    </div>
  );
}

function HeaderIconButton({
  Icon,
  label,
  onClick,
  disabled = false,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <Tooltip tooltipContent={label}>
      <Button
        aria-label={label}
        color="ghost"
        size="icon"
        className={disabled ? "opacity-50" : undefined}
        onClick={onClick}
        disabled={disabled}
      >
        <Icon className="icon-xs" />
      </Button>
    </Tooltip>
  );
}

export function ReviewHeaderOptionsContent({
  onClose,
  wordDiffsEnabled,
  showCopyGitApplyCommand,
  copyGitApplyCommandDisabled,
  onClickCopyGitApplyCommand,
  richPreviewEnabled,
  onToggleRichPreview,
  onToggleWordDiffs,
  loadFullFilesEnabled,
  onToggleLoadFullFiles,
}: {
  onClose: () => void;
  wordDiffsEnabled: boolean;
  showCopyGitApplyCommand?: boolean;
  copyGitApplyCommandDisabled?: boolean;
  onClickCopyGitApplyCommand?: () => void;
  richPreviewEnabled: boolean;
  onToggleRichPreview: () => void;
  onToggleWordDiffs: () => void;
  loadFullFilesEnabled: boolean;
  onToggleLoadFullFiles: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const richPreviewLabel = richPreviewEnabled
    ? intl.formatMessage({
        id: "codex.diffView.richPreviewDisable",
        defaultMessage: "Disable rich preview",
        description: "Aria label for disabling rich previews in the diff view",
      })
    : intl.formatMessage({
        id: "codex.diffView.richPreviewEnable",
        defaultMessage: "Enable rich preview",
        description: "Aria label for enabling rich previews in the diff view",
      });
  const handleToggleRichPreview = (event: Event): void => {
    event.preventDefault();
    onToggleRichPreview();
    onClose();
  };
  const handleToggleWordDiffs = (event: Event): void => {
    event.preventDefault();
    onToggleWordDiffs();
    onClose();
  };
  const handleToggleLoadFullFiles = (event: Event): void => {
    event.preventDefault();
    onToggleLoadFullFiles();
    onClose();
  };
  const handleCopyGitApplyCommand = (event: Event): void => {
    event.preventDefault();
    onClickCopyGitApplyCommand?.();
    onClose();
  };

  return (
    <>
      <Dropdown.Item onSelect={handleToggleLoadFullFiles} LeftIcon={FileIcon}>
        {loadFullFilesEnabled ? (
          <FormattedMessage
            id="codex.review.loadFullFiles.disable"
            defaultMessage="Don't load full files"
            description="Menu item to avoid loading full file contents for partial diffs"
          />
        ) : (
          <FormattedMessage
            id="codex.review.loadFullFiles.enable"
            defaultMessage="Load full files"
            description="Menu item to load full file contents for partial diffs"
          />
        )}
      </Dropdown.Item>
      <Dropdown.Item
        onSelect={handleToggleRichPreview}
        aria-label={richPreviewLabel}
        LeftIcon={richPreviewEnabled ? JsonIcon : ImageSquareIcon}
      >
        {richPreviewEnabled ? (
          <FormattedMessage
            id="codex.review.richPreview.disable"
            defaultMessage="Disable rich preview"
            description="Menu item to disable rich previews in the diff view"
          />
        ) : (
          <FormattedMessage
            id="codex.review.richPreview.enable"
            defaultMessage="Enable rich preview"
            description="Menu item to enable rich previews in the diff view"
          />
        )}
      </Dropdown.Item>
      <Dropdown.Item
        onSelect={handleToggleWordDiffs}
        LeftIcon={wordDiffsEnabled ? DiffIcon : TextWrapIcon}
      >
        {wordDiffsEnabled ? (
          <FormattedMessage
            id="codex.review.wordDiffs.disable"
            defaultMessage="Disable word diffs"
            description="Menu item to disable word-level diff highlights"
          />
        ) : (
          <FormattedMessage
            id="codex.review.wordDiffs.enable"
            defaultMessage="Enable word diffs"
            description="Menu item to enable word-level diff highlights"
          />
        )}
      </Dropdown.Item>
      {showCopyGitApplyCommand ? (
        <Dropdown.Item
          onSelect={handleCopyGitApplyCommand}
          disabled={copyGitApplyCommandDisabled || !onClickCopyGitApplyCommand}
          LeftIcon={ClipboardIcon}
        >
          <FormattedMessage
            id="codex.review.copyGitApplyCommand"
            defaultMessage="Copy git apply command"
            description="Menu item to copy a git apply command"
          />
        </Dropdown.Item>
      ) : null}
    </>
  );
}
