import { lookup } from "mime-types";

import { useFetchFromVSCode } from "@/vscode-api";

import { NULL_FILE } from "./diff-file-utils";
import type { ImagePreviewSource } from "./rich-preview-types";

export type BinaryPreviewState = {
  dataUrl: string | null;
  isLoading: boolean;
  isError: boolean;
};

export function useBinaryPreviewSource(
  source: ImagePreviewSource | null,
): BinaryPreviewState {
  const isGitSource = source?.kind === "git";
  const sourcePath = source?.path ?? "";
  const shouldFetchPreview = sourcePath.length > 0 && sourcePath !== NULL_FILE;
  const {
    data: gitImageData,
    isLoading: isGitImageLoading,
    isError: isGitImageError,
  } = useFetchFromVSCode("read-git-file-binary", {
    params: {
      cwd: isGitSource ? (source?.cwd ?? null) : null,
      path: isGitSource ? sourcePath : "",
      ref: isGitSource ? (source?.ref ?? "head") : "head",
    },
    queryConfig: {
      enabled: isGitSource && shouldFetchPreview,
    },
  });
  const {
    data: fileImageData,
    isLoading: isFileImageLoading,
    isError: isFileImageError,
  } = useFetchFromVSCode("read-file-binary", {
    params: { path: !isGitSource ? sourcePath : "" },
    queryConfig: {
      enabled: !isGitSource && shouldFetchPreview,
    },
  });

  if (!shouldFetchPreview) {
    return { dataUrl: null, isLoading: false, isError: false };
  }

  const contentsBase64 = isGitSource
    ? gitImageData?.contentsBase64
    : fileImageData?.contentsBase64;
  const mimeType = sourcePath ? lookup(sourcePath) : false;
  const resolvedMimeType =
    typeof mimeType === "string" ? mimeType : "application/octet-stream";

  if (!contentsBase64) {
    return {
      dataUrl: null,
      isLoading: isGitSource ? isGitImageLoading : isFileImageLoading,
      isError: isGitSource ? isGitImageError : isFileImageError,
    };
  }

  return {
    dataUrl: `data:${resolvedMimeType};base64,${contentsBase64}`,
    isLoading: isGitSource ? isGitImageLoading : isFileImageLoading,
    isError: isGitSource ? isGitImageError : isFileImageError,
  };
}
