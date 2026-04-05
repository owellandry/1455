import clsx from "clsx";

import {
  MarkdownSurface,
  MarkdownSurfaceBody,
} from "@/components/markdown-surface";
import { useFetchFromVSCode } from "@/vscode-api";

import { NULL_FILE } from "./diff-file-utils";
import { RichPreviewLoadingContent } from "./rich-preview-primitives";

export function MarkdownPreviewDiff({
  path,
  className,
  fallback,
}: {
  path: string | null;
  className?: string;
  fallback: React.ReactElement;
}): React.ReactElement {
  const shouldFetchPreview =
    path != null && path.length > 0 && path !== NULL_FILE;
  const {
    data: markdownPreviewData,
    isLoading: isMarkdownPreviewLoading,
    isError: isMarkdownPreviewError,
  } = useFetchFromVSCode("read-file", {
    params: { path: path ?? "" },
    queryConfig: {
      enabled: shouldFetchPreview,
    },
  });
  const markdownContents = markdownPreviewData?.contents ?? null;

  if (!shouldFetchPreview) {
    return fallback;
  }

  if (isMarkdownPreviewLoading) {
    return (
      <div className={clsx("relative overflow-clip", className)}>
        <RichPreviewLoadingContent className="justify-center py-6 text-sm" />
      </div>
    );
  }

  if (markdownContents == null || markdownContents.length === 0) {
    return fallback;
  }

  if (isMarkdownPreviewError) {
    return fallback;
  }

  return (
    <MarkdownSurface className={className}>
      <MarkdownSurfaceBody markdown={markdownContents} />
    </MarkdownSurface>
  );
}
