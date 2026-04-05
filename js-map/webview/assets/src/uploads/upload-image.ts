import type { ImageAssetPointer } from "protocol";

import { logger } from "@/utils/logger";
import { CodexRequest } from "@/utils/request";
import type { FetchError } from "@/web-fetch-wrapper";
import { WebFetchWrapper } from "@/web-fetch-wrapper";

/** Convert a file id to a file-service compatible asset pointer. */
function getFileServicePointerFromId(id: string): string {
  // Sediment files have a 'file_' prefix; file-service files have 'file-'.
  return id.startsWith("file_") ? `sediment://${id}` : `file-service://${id}`;
}

type ParsedDataUrl = {
  base64Payload: string;
  bytes: Uint8Array;
  contentType: string;
};

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Malformed data URL (not a data: URL)");
  }

  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) {
    throw new Error("Malformed data URL (no comma)");
  }

  const meta = dataUrl.substring(5, commaIdx); // after 'data:'
  const payload = dataUrl.substring(commaIdx + 1);
  const contentType = meta.match(/^[^;]+/)?.[0] || "image/png";
  const isBase64 = /;base64/i.test(meta);

  if (!payload) {
    throw new Error("Malformed data URL (missing payload)");
  }

  if (isBase64) {
    const binaryString = atob(payload);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { base64Payload: payload, bytes, contentType };
  }

  const decoded = decodeURIComponent(payload);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(decoded);
  return { base64Payload: bytesToBase64(bytes), bytes, contentType };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function dataUrlToFile(
  dataUrl: string,
  filename: string,
): {
  base64Payload: string;
  file: File;
} {
  const { base64Payload, bytes, contentType } = parseDataUrl(dataUrl);
  const safeName = filename.trim().length > 0 ? filename.trim() : "image.png";
  return {
    base64Payload,
    file: new File([new Uint8Array(bytes)], safeName, { type: contentType }),
  };
}

/** Read intrinsic width/height from a data URL without attaching to the DOM. */
async function getImageDimensionsFromDataUrl(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e): void => {
      reject(e);
    };
    img.src = dataUrl;
  });
}

/** Extract the Azure upload URL from a combined Estuary URL. */
function parseAzureUploadUrlFromCombined(url: string): string | null {
  try {
    const u = new URL(url, window.location.origin);
    const nested = u.searchParams.get("upload_url");
    return nested ?? null;
  } catch {
    return null;
  }
}

/** Create a file entry and get the SAS upload URL. */
async function createFileEntry(
  fileName: string,
  fileSize: number,
): Promise<{ file_id: string; upload_url: string }> {
  const res = await CodexRequest.safePost("/files", {
    requestBody: {
      file_name: fileName,
      file_size: fileSize,
      use_case: "codex",
      timezone_offset_min: new Date().getTimezoneOffset(),
      reset_rate_limits: false,
    },
  });
  const { file_id, upload_url } = res as unknown as {
    file_id: string;
    upload_url: string;
  };
  return { file_id, upload_url };
}

async function putToAzure(
  uploadUrl: string,
  file: File,
  base64Body: string,
): Promise<void> {
  try {
    await WebFetchWrapper.getInstance().put<unknown>(uploadUrl, base64Body, {
      "Content-Type": file.type || "application/octet-stream",
      "x-ms-blob-type": "BlockBlob",
      "x-ms-version": "2020-04-08",
      "X-Codex-Base64": "1",
      // Hint blob content type for later serving (optional but aligns with web behavior)
      ...(file.type ? { "x-ms-blob-content-type": file.type } : {}),
    });
  } catch (e) {
    // The wrapper throws for non-200 statuses; Azure often returns 201 on success
    const maybeStatus = (e as FetchError)?.status;
    if (
      typeof maybeStatus === "number" &&
      maybeStatus >= 200 &&
      maybeStatus < 300
    ) {
      return; // treat as success
    }
    throw e;
  }
}

/**
 * Upload a data URL image for Codex and return an image_asset_pointer item.
 * Supports Azure direct upload; if a combined Estuary URL is returned, falls back to its embedded Azure upload_url.
 */
export async function uploadImageDataUrlForCodex(
  dataUrl: string,
  filename: string,
): Promise<ImageAssetPointer> {
  const { base64Payload, file } = dataUrlToFile(dataUrl, filename);
  const { width, height } = await getImageDimensionsFromDataUrl(dataUrl);
  const { file_id, upload_url } = await createFileEntry(file.name, file.size);

  const azureUrl = getAzureUploadUrl(upload_url);
  await putToAzure(azureUrl, file, base64Payload);

  await finalizeFileUpload(file_id);

  return {
    type: "image_asset_pointer",
    asset_pointer: getFileServicePointerFromId(file_id),
    width,
    height,
    size_bytes: file.size,
  };
}

function getAzureUploadUrl(uploadUrl: string): string {
  if (!uploadUrl.toLowerCase().includes("estuary")) {
    return uploadUrl;
  }

  const nested = parseAzureUploadUrlFromCombined(uploadUrl);
  if (!nested) {
    throw new Error("Combined upload URL missing embedded Azure upload_url");
  }
  return nested;
}

async function finalizeFileUpload(fileId: string): Promise<void> {
  try {
    await CodexRequest.safePost("/files/{file_id}/uploaded", {
      parameters: { path: { file_id: fileId } },
      requestBody: {},
    });
  } catch (e) {
    logger.error("Finalize upload failed for file", {
      safe: { fileId },
      sensitive: {
        error: e,
      },
    });
    // Non-fatal: if finalize fails, caller may see a transient Retry status; keep pointer anyway
  }
}
