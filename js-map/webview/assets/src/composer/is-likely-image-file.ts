// only support image patterns which are handled by GPT
const IMAGE_FILE_NAME_PATTERN = /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/;
const DISALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  "image/svg+xml",
  "image/heic",
  "image/heic-sequence",
  "image/heif",
  "image/heif-sequence",
  "image/bmp",
  "image/tiff",
  "image/avif",
  "image/vnd.microsoft.icon",
  "image/x-icon",
  "image/jp2",
  "image/x-jp2",
]);

export function isLikelyImageName(name: string): boolean {
  return IMAGE_FILE_NAME_PATTERN.test(name.toLowerCase());
}

export function isLikelyImageFile(file: File): boolean {
  const normalizedType = file.type.toLowerCase();
  if (DISALLOWED_IMAGE_MIME_TYPES.has(normalizedType)) {
    return false;
  }
  if (normalizedType.startsWith("image/")) {
    return true;
  }
  return isLikelyImageName(file.name ?? "");
}
