import clsx from "clsx";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Document, Page, pdfjs } from "react-pdf";

import { ErrorBoundary } from "@/components/error-boundary";
import { useResizeObserver } from "@/utils/use-resize-observer";

import { PdfPreviewPager } from "./pdf-preview-pager";
import { RichPreviewGrid } from "./rich-preview-grid";
import {
  RichPreviewLoadingContent,
  RichPreviewMessage,
  RichPreviewPanel,
} from "./rich-preview-primitives";
import type {
  ImagePreviewData,
  ImagePreviewSource,
} from "./rich-preview-types";
import {
  useBinaryPreviewSource,
  type BinaryPreviewState,
} from "./use-binary-preview-source";
import { usePdfPager } from "./use-pdf-pager";

const pdfWorkerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

if (pdfjs.GlobalWorkerOptions.workerSrc !== pdfWorkerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}

export function PdfPreviewDiff({
  imagePreview,
  className,
  fallback,
  showMissingPreview,
}: {
  imagePreview: ImagePreviewData | null;
  className?: string;
  fallback: React.ReactElement;
  showMissingPreview: boolean;
}): React.ReactElement {
  const beforePreview = useBinaryPreviewSource(imagePreview?.before ?? null);
  const afterPreview = useBinaryPreviewSource(imagePreview?.after ?? null);
  const hasPreviewContent =
    beforePreview.dataUrl != null ||
    afterPreview.dataUrl != null ||
    beforePreview.isLoading ||
    afterPreview.isLoading;

  if (!imagePreview || (!showMissingPreview && !hasPreviewContent)) {
    return fallback;
  }

  const showAfterOnly =
    imagePreview.before == null && imagePreview.after != null;
  const beforeSourceKey = createPreviewSourceKey(imagePreview.before);
  const afterSourceKey = createPreviewSourceKey(imagePreview.after);

  return (
    <RichPreviewGrid
      className={className}
      showAfterOnly={showAfterOnly}
      before={
        <PdfPreviewPanel
          key={`pdf-before-${beforeSourceKey}`}
          preview={beforePreview}
        />
      }
      after={
        <PdfPreviewPanel
          key={`pdf-after-${afterSourceKey}`}
          preview={afterPreview}
        />
      }
    />
  );
}

function PdfPreviewPanel({
  preview,
}: {
  preview: BinaryPreviewState;
}): React.ReactElement {
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const {
    canGoToNextPage,
    canGoToPreviousPage,
    goToNextPage,
    goToPreviousPage,
    handlePdfLoadSuccess,
    numPages,
    pageNumber,
    showPager,
  } = usePdfPager();
  const pageContainerRef = useResizeObserver<HTMLDivElement>((entry) => {
    const nextWidth = Math.floor(entry.contentRect.width);
    setPageWidth((currentWidth) => {
      if (currentWidth === nextWidth) {
        return currentWidth;
      }
      return nextWidth;
    });
  });

  return (
    <div className="group/pdf-preview relative">
      <RichPreviewPanel>
        {preview.isLoading ? (
          <RichPreviewLoadingContent className="text-xs" />
        ) : preview.dataUrl != null && !preview.isError ? (
          <div ref={pageContainerRef} className="w-full max-w-full">
            <ErrorBoundary
              name="PdfPreviewPanel"
              fallback={<PdfPreviewErrorMessage />}
            >
              <Document
                file={preview.dataUrl}
                loading={null}
                onLoadSuccess={handlePdfLoadSuccess}
                error={<PdfPreviewErrorMessage />}
                noData={
                  <RichPreviewMessage className="text-center">
                    <FormattedMessage
                      id="codex.diffView.pdfPreviewEmpty"
                      defaultMessage="No PDF preview"
                      description="Placeholder text when PDF preview data is unavailable"
                    />
                  </RichPreviewMessage>
                }
              >
                <Page
                  className={clsx("overflow-hidden rounded-sm shadow-sm")}
                  pageNumber={pageNumber}
                  width={
                    pageWidth != null && pageWidth > 0 ? pageWidth : undefined
                  }
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>
            </ErrorBoundary>
          </div>
        ) : (
          <RichPreviewMessage className="text-center">
            <FormattedMessage
              id="codex.diffView.pdfPreviewEmpty"
              defaultMessage="No PDF preview"
              description="Placeholder text when PDF preview data is unavailable"
            />
          </RichPreviewMessage>
        )}
      </RichPreviewPanel>
      {showPager ? (
        <PdfPreviewPager
          canGoToNextPage={canGoToNextPage}
          canGoToPreviousPage={canGoToPreviousPage}
          currentPage={pageNumber}
          totalPages={numPages ?? 1}
          onNextPage={goToNextPage}
          onPreviousPage={goToPreviousPage}
        />
      ) : null}
    </div>
  );
}

function PdfPreviewErrorMessage(): React.ReactElement {
  return (
    <RichPreviewMessage className="text-center">
      <FormattedMessage
        id="codex.diffView.pdfPreviewError"
        defaultMessage="Unable to render PDF preview"
        description="Placeholder text when PDF content cannot be rendered"
      />
    </RichPreviewMessage>
  );
}

function createPreviewSourceKey(source: ImagePreviewSource | null): string {
  if (!source) {
    return "none";
  }
  if (source.kind === "git") {
    return `${source.kind}:${source.cwd}:${source.ref}:${source.path}`;
  }
  return `${source.kind}:${source.path}`;
}
