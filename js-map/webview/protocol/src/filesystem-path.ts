const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
const WINDOWS_DRIVE_URL_PATH_PATTERN = /^\/[A-Za-z]:[\\/]/;
const WINDOWS_UNC_BACKSLASH_PATH_PATTERN = /^\\\\[^\\]+\\[^\\]+/;
const WINDOWS_UNC_SLASH_PATH_PATTERN = /^\/\/[^/]+\/[^/]+/;

/**
 * Replaces Windows path separators with forward slashes.
 *
 * @example
 * replaceBackslashesWithSlashes("C:\\repo\\icon.png") === "C:/repo/icon.png"
 *
 * @example
 * replaceBackslashesWithSlashes("/Users/alex/icon.png") === "/Users/alex/icon.png"
 */
export function replaceBackslashesWithSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Returns true when the input starts with a Windows drive letter.
 *
 * @example
 * isWindowsDrivePath("C:/repo/icon.png") === true
 *
 * @example
 * isWindowsDrivePath("/Users/alex/icon.png") === false
 */
export function isWindowsDrivePath(path: string): boolean {
  return WINDOWS_DRIVE_PATH_PATTERN.test(path);
}

/**
 * Returns true when the input is an absolute filesystem path.
 *
 * @example
 * isAbsoluteFilesystemPath("/Users/alex/icon.png") === true
 *
 * @example
 * isAbsoluteFilesystemPath("C:\\repo\\icon.png") === true
 *
 * @example
 * isAbsoluteFilesystemPath("//server/share/icon.png") === true
 *
 * @example
 * isAbsoluteFilesystemPath("//example.com") === false
 *
 * @example
 * isAbsoluteFilesystemPath("assets/icon.png") === false
 */
export function isAbsoluteFilesystemPath(path: string): boolean {
  return (
    (path.startsWith("/") && !path.startsWith("//")) ||
    isWindowsDrivePath(path) ||
    WINDOWS_UNC_BACKSLASH_PATH_PATTERN.test(path) ||
    WINDOWS_UNC_SLASH_PATH_PATTERN.test(path)
  );
}

/**
 * Adds the URL-style leading slash used to serialize Windows drive paths.
 *
 * @example
 * prependSlashToWindowsDrivePath("C:/repo/icon.png") === "/C:/repo/icon.png"
 *
 * @example
 * prependSlashToWindowsDrivePath("/Users/alex/icon.png") === "/Users/alex/icon.png"
 */
export function prependSlashToWindowsDrivePath(path: string): string {
  if (isWindowsDrivePath(path) && !path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

/**
 * Removes the URL-style leading slash from a Windows drive path.
 *
 * @example
 * stripSlashFromWindowsDrivePath("/C:/repo/icon.png") === "C:/repo/icon.png"
 *
 * @example
 * stripSlashFromWindowsDrivePath("/Users/alex/icon.png") === "/Users/alex/icon.png"
 */
export function stripSlashFromWindowsDrivePath(path: string): string {
  if (WINDOWS_DRIVE_URL_PATH_PATTERN.test(path)) {
    return path.slice(1);
  }
  return path;
}
