import clsx from "clsx";
import type { DiffModeEnum } from "protocol";
import { FormattedMessage } from "react-intl";

import { FileDiff } from "@/components/file-diff";
import { getFileIconKey } from "@/files/get-file-icon";

import { ImagePreviewDiff } from "./image-preview-diff";
import { MarkdownPreviewDiff } from "./markdown-preview-diff";
import { PdfPreviewDiff } from "./pdf-preview-diff";
import type { ImagePreviewData } from "./rich-preview-types";

export type {
  ImagePreviewData,
  ImagePreviewSource,
} from "./rich-preview-types";

type ImagePreviewMode = "always" | "toggle" | "none";
type RichPreviewKind = "diff" | "image" | "markdown" | "pdf";

export function DiffContentBody({
  diffViewProps,
  filePath,
  previewPath,
  imagePreview,
  hasNoChanges,
  isBinary,
  isDeletion,
  richPreviewEnabled,
}: {
  diffViewProps: React.ComponentProps<typeof DiffFileView>;
  filePath: string;
  previewPath: string | null;
  imagePreview: ImagePreviewData | null;
  hasNoChanges: boolean;
  isBinary: boolean;
  isDeletion: boolean;
  richPreviewEnabled: boolean;
}): React.ReactElement {
  const diffView = <DiffFileView {...diffViewProps} />;
  const emptyState = <EmptyDiffState isBinary={isBinary} />;
  const imagePreviewMode = getImagePreviewMode(filePath);
  const richPreviewKind = getRichPreviewKind({
    filePath,
    imagePreviewMode,
    isDeletion,
    richPreviewEnabled,
  });

  if (richPreviewKind === "markdown") {
    return (
      <MarkdownPreviewDiff
        className={diffViewProps.diffViewClassName}
        path={previewPath}
        fallback={diffView}
      />
    );
  }

  if (richPreviewKind === "image") {
    return (
      <ImagePreviewDiff
        className={diffViewProps.diffViewClassName}
        imagePreview={imagePreview}
        fallback={imagePreviewMode === "always" ? emptyState : diffView}
        showMissingPreview={imagePreviewMode === "always"}
      />
    );
  }

  if (richPreviewKind === "pdf") {
    return (
      <PdfPreviewDiff
        className={diffViewProps.diffViewClassName}
        imagePreview={imagePreview}
        fallback={emptyState}
        showMissingPreview
      />
    );
  }

  if (hasNoChanges || isBinary) {
    return emptyState;
  }

  return diffView;
}

function DiffFileView({
  diffViewClassName,
  viewType,
  wrapLines,
  hunkSeparators,
  ...restProps
}: {
  diffViewClassName?: string;
  viewType: DiffModeEnum;
  wrapLines: boolean;
} & Pick<
  React.ComponentProps<typeof FileDiff>,
  | "fileDiff"
  | "isLoadingFullContent"
  | "enableLineSelection"
  | "hunkSeparators"
  | "lineDiffType"
  | "expansionLineCount"
  | "onLineEnter"
  | "onLineLeave"
  | "onLineClick"
  | "onLineNumberClick"
  | "onGutterUtilityClick"
  | "lineAnnotations"
  | "renderAnnotation"
>): React.ReactElement {
  return (
    <FileDiff
      className={clsx(
        "relative overflow-clip [contain:content]",
        diffViewClassName,
      )}
      diffStyle={viewType === "split" ? "split" : "unified"}
      overflow={wrapLines ? "wrap" : "scroll"}
      hunkSeparators={hunkSeparators ?? "simple"}
      {...restProps}
    />
  );
}

function EmptyDiffState({
  isBinary,
}: {
  isBinary: boolean;
}): React.ReactElement {
  return (
    <div className="flex h-full justify-center bg-token-editor-background py-4 text-sm text-token-text-secondary empty:hidden">
      {isBinary ? (
        <FormattedMessage
          id="wham.diff.binaryFile"
          defaultMessage="Binary file not shown"
          description="Text shown when a binary file is not shown."
        />
      ) : (
        <FormattedMessage
          id="wham.diff.noContent"
          defaultMessage="No content"
          description="Text shown when a file is empty."
        />
      )}
    </div>
  );
}

function getImagePreviewMode(filePath: string): ImagePreviewMode {
  const extension = getPathExtension(filePath);
  if (!extension) {
    return "none";
  }
  if (extension === "svg") {
    return "toggle";
  }
  if (rasterImageExtensions.has(extension)) {
    return "always";
  }
  return "none";
}

function getRichPreviewKind({
  filePath,
  imagePreviewMode,
  isDeletion,
  richPreviewEnabled,
}: {
  filePath: string;
  imagePreviewMode: ImagePreviewMode;
  isDeletion: boolean;
  richPreviewEnabled: boolean;
}): RichPreviewKind {
  if (richPreviewEnabled && !isDeletion && isMarkdownFile(filePath)) {
    return "markdown";
  }
  if (
    imagePreviewMode === "always" ||
    (imagePreviewMode === "toggle" && richPreviewEnabled)
  ) {
    return "image";
  }
  if (isPdfFile(filePath)) {
    return "pdf";
  }
  return "diff";
}

function isMarkdownFile(filePath: string): boolean {
  return getFileIconKey(filePath) === "markdown";
}

function isPdfFile(filePath: string): boolean {
  return getPathExtension(filePath) === "pdf";
}

function getPathExtension(filePath: string): string | null {
  const normalizedPath = filePath.toLowerCase();
  const lastSlash = Math.max(
    normalizedPath.lastIndexOf("/"),
    normalizedPath.lastIndexOf("\\"),
  );
  const filename =
    lastSlash >= 0 ? normalizedPath.slice(lastSlash + 1) : normalizedPath;
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0 && lastDot < filename.length - 1) {
    return filename.slice(lastDot + 1);
  }
  return null;
}

const rasterImageExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "avif",
  "tif",
  "tiff",
]);
