import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import ChevronRightIcon from "@/icons/chevron-right.svg";

const PDF_PAGER_OVERLAY_CLASS_NAME =
  "pointer-events-none absolute right-0.5 top-0.5 z-20 flex items-center gap-0.5 rounded-full bg-token-side-bar-background/90 px-0.5 py-0.5 shadow-sm ring-1 ring-token-border/60 opacity-0 transition-opacity group-hover/pdf-preview:pointer-events-auto group-hover/pdf-preview:opacity-100 group-focus-within/pdf-preview:pointer-events-auto group-focus-within/pdf-preview:opacity-100";

export function PdfPreviewPager({
  canGoToNextPage,
  canGoToPreviousPage,
  currentPage,
  onNextPage,
  onPreviousPage,
  totalPages,
}: {
  canGoToNextPage: boolean;
  canGoToPreviousPage: boolean;
  currentPage: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  totalPages: number;
}): React.ReactElement {
  const intl = useIntl();
  const previousPageTooltip = intl.formatMessage({
    id: "codex.diffView.pdfPreview.previousPage",
    defaultMessage: "Previous page",
    description: "Tooltip for navigating to the previous page in PDF preview",
  });
  const nextPageTooltip = intl.formatMessage({
    id: "codex.diffView.pdfPreview.nextPage",
    defaultMessage: "Next page",
    description: "Tooltip for navigating to the next page in PDF preview",
  });

  return (
    <div className={PDF_PAGER_OVERLAY_CLASS_NAME}>
      <Tooltip tooltipContent={previousPageTooltip}>
        <Button
          color="ghost"
          size="composerSm"
          uniform
          aria-label={previousPageTooltip}
          disabled={!canGoToPreviousPage}
          onClick={onPreviousPage}
        >
          <ChevronRightIcon className="icon-2xs rotate-180" />
        </Button>
      </Tooltip>
      <span className="px-0.5 text-center text-sm text-token-text-secondary tabular-nums">
        <FormattedMessage
          id="codex.diffView.pdfPreview.pageIndicator"
          defaultMessage="{current}/{total}"
          description="Current page indicator for PDF preview"
          values={{
            current: currentPage,
            total: totalPages,
          }}
        />
      </span>
      <Tooltip tooltipContent={nextPageTooltip}>
        <Button
          color="ghost"
          size="composerSm"
          uniform
          aria-label={nextPageTooltip}
          disabled={!canGoToNextPage}
          onClick={onNextPage}
        >
          <ChevronRightIcon className="icon-2xs" />
        </Button>
      </Tooltip>
    </div>
  );
}
