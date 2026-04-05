import {
  isAbsoluteFilesystemPath,
  prependSlashToWindowsDrivePath,
  replaceBackslashesWithSlashes,
  stripSlashFromWindowsDrivePath,
} from "protocol";

/**
 * Normalize a filesystem path for deduplication and comparison.
 *
 * - Converts all backslashes to forward slashes
 * - Lowercases the entire path (to avoid case-sensitivity mismatches across platforms)
 */
export function normalizeFsPath(p: string): string {
  return normalizePath(p).toLowerCase();
}

export function getComparableFsPath(path: string): string {
  const normalizedPath = normalizeFsPath(path);
  const wslShareMatch = normalizedPath.match(
    /^\/\/(?:wsl\$|wsl\.localhost)\/[^/]+(?:\/(.*))?$/,
  );
  if (wslShareMatch) {
    const linuxPath = wslShareMatch[1] ?? "";
    return linuxPath.length > 0 ? `/${linuxPath}` : "/";
  }

  const driveMatch = normalizedPath.match(/^\/?([a-z]):(?:\/(.*))?$/);
  if (driveMatch) {
    const [, drive, remainder] = driveMatch;
    return remainder != null && remainder.length > 0
      ? `/mnt/${drive}/${remainder}`
      : `/mnt/${drive}`;
  }

  return normalizedPath;
}

export function normalizePath(p: string): string {
  return replaceBackslashesWithSlashes(stripWindowsVerbatimPathPrefix(p));
}

export function stripWindowsVerbatimPathPrefix(path: string): string {
  const uncMatch = path.match(/^\\\\\?\\UNC\\(.*)$/i);
  if (uncMatch != null) {
    return `\\\\${uncMatch[1]}`;
  }

  const driveMatch = path.match(/^\\\\\?\\([a-zA-Z]:[\\/].*)$/);
  if (driveMatch != null) {
    return driveMatch[1];
  }

  return path;
}

export function getPathBasename(path: string): string {
  const normalizedPath = normalizePath(path).replace(/\/+$/, "");
  return normalizedPath.split("/").at(-1) ?? normalizedPath;
}

export function formatRelativeFilePath({
  root,
  relativePath,
  includeWorkspaceRootLabel,
}: {
  root: string;
  relativePath: string;
  includeWorkspaceRootLabel: boolean;
}): string {
  const normalizedRelative = normalizePath(relativePath);
  if (!includeWorkspaceRootLabel) {
    return normalizedRelative;
  }
  const rootLabel = extractWorkspaceRootLabel(root);
  if (!rootLabel) {
    return normalizedRelative;
  }
  if (!normalizedRelative) {
    return rootLabel;
  }
  return `${rootLabel}/${normalizedRelative}`;
}

export function formatPathFromLastSharedSegment(
  path: string,
  allPaths: Array<string>,
): string {
  const normalizedPaths = allPaths.map((value) =>
    normalizePath(value).replace(/\/+$/, ""),
  );
  if (new Set(normalizedPaths).size <= 1) {
    return normalizePath(path).replace(/\/+$/, "");
  }

  const pathSegments = normalizedPaths.map((value) =>
    value.split("/").filter(Boolean),
  );
  let sharedSegmentCount = 0;
  while (true) {
    const sharedSegment = pathSegments[0]?.[sharedSegmentCount];
    if (
      sharedSegment == null ||
      pathSegments.some(
        (segments) => segments[sharedSegmentCount] !== sharedSegment,
      )
    ) {
      break;
    }
    sharedSegmentCount += 1;
  }

  const targetPath = normalizePath(path).replace(/\/+$/, "");
  const targetSegments = targetPath.split("/").filter(Boolean);
  const visibleSegments = targetSegments.slice(
    Math.max(sharedSegmentCount - 1, 0),
  );
  return visibleSegments.join("/") || targetPath;
}

function extractWorkspaceRootLabel(root: string): string {
  const normalizedRoot = normalizePath(root).replace(/\/+$/, "");
  if (normalizedRoot === "" || normalizedRoot === "/") {
    return "";
  }
  const segments = normalizedRoot.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalizedRoot;
}

export function resolveFsPath(root: string, filePath: string): string {
  const normalizedRoot = normalizePath(root);
  const normalizedPath = normalizePath(filePath);

  if (isAbsolutePath(normalizedPath) || normalizedRoot === "") {
    return prependSlashToWindowsDrivePath(normalizedPath);
  }

  return prependSlashToWindowsDrivePath(
    joinRootAndPath(normalizedRoot, normalizedPath),
  );
}

export function getHostFilePath(
  root: string,
  filePath: string,
  isWindowsHost: boolean,
): string {
  const resolvedPath = resolveFsPath(root, filePath);
  if (!isWindowsHost) {
    return resolvedPath;
  }

  return stripSlashFromWindowsDrivePath(resolvedPath);
}

export function joinRootAndPath(root: string, relative: string): string {
  if (!root) {
    return relative;
  }
  if (!relative) {
    return root;
  }
  const trimmedRoot = root.replace(/\/+$/, "");
  const trimmedRelative = relative.replace(/^\/+/, "");
  return `${trimmedRoot}/${trimmedRelative}`;
}

export function isAbsolutePath(path: string): boolean {
  return isAbsoluteFilesystemPath(path);
}
