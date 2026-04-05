export function getConversationCwd({
  requestedCwd,
  responseCwd,
  threadCwd,
  fallbackCwd,
}: {
  requestedCwd: string | null;
  responseCwd: string | null;
  threadCwd: string | null | undefined;
  fallbackCwd: string | null | undefined;
}): string | undefined {
  const canonicalCwd = threadCwd || responseCwd;
  if (
    requestedCwd != null &&
    canonicalCwd != null &&
    isSamePathOrChildPath(requestedCwd, canonicalCwd)
  ) {
    return requestedCwd;
  }

  return canonicalCwd || requestedCwd || fallbackCwd || undefined;
}

function isSamePathOrChildPath(path: string, basePath: string): boolean {
  const comparablePath = getComparableCwdPath(path);
  const comparableBasePath = getComparableCwdPath(basePath);

  if (comparablePath === comparableBasePath) {
    return true;
  }

  return comparablePath.startsWith(`${comparableBasePath}/`);
}

function getComparableCwdPath(path: string): string {
  let comparablePath = path.replaceAll("\\", "/");
  while (
    comparablePath.length > 1 &&
    comparablePath.endsWith("/") &&
    !isWindowsDriveRoot(comparablePath)
  ) {
    comparablePath = comparablePath.slice(0, -1);
  }

  if (isWindowsPath(comparablePath)) {
    return comparablePath.toLowerCase();
  }

  return comparablePath;
}

function isWindowsPath(path: string): boolean {
  return /^[a-zA-Z]:\//.test(path) || path.startsWith("//");
}

function isWindowsDriveRoot(path: string): boolean {
  return /^[a-zA-Z]:\/$/.test(path);
}
