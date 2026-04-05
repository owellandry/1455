import { WebFetchWrapper } from "@/web-fetch-wrapper";

type TranscribeResponse = {
  text: string;
};

type TranscribeOptions = {
  filename?: string;
  contentType?: string;
  language?: string;
};

export async function transcribeAudio(
  blob: Blob,
  options: TranscribeOptions = {},
): Promise<string> {
  const contentType =
    options.contentType ??
    (blob.type && blob.type.trim().length > 0 ? blob.type : "audio/webm");
  const extension = contentType.split(/[/;]/)[1] ?? "webm";
  const filename = sanitizeFilename(options.filename ?? `codex.${extension}`);
  const boundary = createBoundary();
  const body = await buildMultipartBody({
    blob,
    boundary,
    filename,
    contentType,
    language: options.language,
  });
  const base64Body = bytesToBase64(body);
  const headers: Record<string, string> = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "X-Codex-Base64": "1",
  };
  const response = await WebFetchWrapper.getInstance().post<TranscribeResponse>(
    "/transcribe",
    base64Body,
    headers,
  );
  return response.body.text;
}

async function buildMultipartBody({
  blob,
  boundary,
  filename,
  contentType,
  language,
}: {
  blob: Blob;
  boundary: string;
  filename: string;
  contentType: string;
  language?: string;
}): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const parts: Array<Uint8Array> = [];
  const fileBytes = new Uint8Array(await blob.arrayBuffer());

  parts.push(encoder.encode(`--${boundary}\r\n`));
  parts.push(
    encoder.encode(
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
    ),
  );
  parts.push(encoder.encode(`Content-Type: ${contentType}\r\n\r\n`));
  parts.push(fileBytes);
  parts.push(encoder.encode("\r\n"));

  if (language) {
    parts.push(encoder.encode(`--${boundary}\r\n`));
    parts.push(
      encoder.encode('Content-Disposition: form-data; name="language"\r\n\r\n'),
    );
    parts.push(encoder.encode(`${language}\r\n`));
  }

  parts.push(encoder.encode(`--${boundary}--\r\n`));
  return concatBytes(parts);
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/"/g, "");
}

function createBoundary(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `----codex-transcribe-${crypto.randomUUID()}`;
  }
  return `----codex-transcribe-${Math.random().toString(36).slice(2)}`;
}

function concatBytes(parts: Array<Uint8Array>): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.byteLength;
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
