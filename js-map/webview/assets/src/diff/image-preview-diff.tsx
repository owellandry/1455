import { FormattedMessage, useIntl } from "react-intl";

import { RichPreviewGrid } from "./rich-preview-grid";
import {
  RichPreviewLoadingContent,
  RichPreviewMessage,
  RichPreviewPanel,
} from "./rich-preview-primitives";
import type { ImagePreviewData } from "./rich-preview-types";
import {
  useBinaryPreviewSource,
  type BinaryPreviewState,
} from "./use-binary-preview-source";

export function ImagePreviewDiff({
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
  const intl = useIntl();
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

  const previewAlt = intl.formatMessage({
    id: "codex.diffView.imagePreviewAlt",
    defaultMessage: "Image preview",
    description: "Alt text for image previews in the diff view",
  });
  const showAfterOnly =
    imagePreview.before == null && imagePreview.after != null;

  return (
    <RichPreviewGrid
      className={className}
      showAfterOnly={showAfterOnly}
      before={<ImagePreviewPanel preview={beforePreview} alt={previewAlt} />}
      after={<ImagePreviewPanel preview={afterPreview} alt={previewAlt} />}
    />
  );
}

function ImagePreviewPanel({
  preview,
  alt,
}: {
  preview: BinaryPreviewState;
  alt: string;
}): React.ReactElement {
  return (
    <RichPreviewPanel>
      {preview.isLoading ? (
        <RichPreviewLoadingContent className="text-xs" />
      ) : preview.dataUrl != null && !preview.isError ? (
        <img
          className="max-h-full max-w-full rounded-sm object-contain shadow-sm"
          src={preview.dataUrl}
          alt={alt}
        />
      ) : (
        <RichPreviewMessage>
          <FormattedMessage
            id="codex.diffView.imagePreviewEmpty"
            defaultMessage="No image"
            description="Placeholder text when an image preview is unavailable"
          />
        </RichPreviewMessage>
      )}
    </RichPreviewPanel>
  );
}
