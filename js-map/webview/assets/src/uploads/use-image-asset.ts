import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { CodexRequest } from "@/utils/request";
import { WebFetchWrapper } from "@/web-fetch-wrapper";

function fileIdFromPointer(pointer: string): string {
  if (pointer.startsWith("file-service://")) {
    return pointer.replace("file-service://", "");
  }
  if (pointer.startsWith("sediment://")) {
    return pointer.replace("sediment://", "");
  }
  return pointer;
}

function base64ToBlobUrl(base64: string, contentType?: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: contentType || "application/octet-stream",
  });
  return URL.createObjectURL(blob);
}

/**
 * Fetches an image asset pointer and returns a blob URL suitable for <img src>.
 * - Gets a signed download URL from Codex
 * - Downloads via WebFetchWrapper to avoid CORS
 * - Converts to blob URL and manages cleanup
 */
export function useImageAssetSrc(assetPointer: string): {
  src: string | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const lastUrlRef = useRef<string | null>(null);

  const enabled = useMemo(() => !!assetPointer, [assetPointer]);

  const { data, isLoading, isError, refetch } = useQuery<string, Error>({
    enabled,
    queryKey: ["file", "image-src", assetPointer],
    queryFn: async () => {
      const fileId = fileIdFromPointer(assetPointer);
      const resp = await CodexRequest.safeGet("/files/download/{file_id}", {
        parameters: { path: { file_id: fileId } },
      });
      if (resp.status !== "success" || !resp.download_url) {
        throw new Error("Failed to get download URL");
      }
      const { body } = await WebFetchWrapper.getInstance().get<{
        base64: string;
        contentType: string;
      }>(resp.download_url);
      const url = base64ToBlobUrl(body.base64, body.contentType);
      return url;
    },
    // Keep fairly short to avoid expired SAS URLs lingering
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
  });

  // Revoke previously created blob URLs when data changes or on unmount
  useEffect(() => {
    if (
      lastUrlRef.current &&
      lastUrlRef.current !== data &&
      lastUrlRef.current.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(lastUrlRef.current);
      } catch {
        // ignore
      }
    }
    lastUrlRef.current = data ?? null;
    return (): void => {
      if (lastUrlRef.current && lastUrlRef.current.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(lastUrlRef.current);
        } catch {
          // ignore
        }
      }
      lastUrlRef.current = null;
    };
  }, [data]);

  return {
    src: data ?? null,
    isLoading,
    isError,
    refetch,
  };
}
