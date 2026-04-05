export type RepoInfo = { host: string; owner: string; repo: string };

type ParseResult<T> = { success: true; value: T } | { success: false };

export function parseRepoFromRemoteUrl(remoteUrl: string): RepoInfo | null {
  const trimmedRemoteUrl = remoteUrl.trim();
  if (!trimmedRemoteUrl) {
    return null;
  }

  if (/^[a-zA-Z]:[\\/]/.test(trimmedRemoteUrl)) {
    return null;
  }

  if (trimmedRemoteUrl.includes("://")) {
    const parsedFromUrlStyle = parseRepoFromUrlStyleRemoteUrl(trimmedRemoteUrl);
    return parsedFromUrlStyle.success ? parsedFromUrlStyle.value : null;
  }

  const parsedFromScpStyle = parseRepoFromScpStyleRemoteUrl(trimmedRemoteUrl);
  return parsedFromScpStyle.success ? parsedFromScpStyle.value : null;
}

export function parseRepoFromUrlStyleRemoteUrl(
  remoteUrl: string,
): ParseResult<RepoInfo> {
  try {
    const parsedUrl = new URL(remoteUrl);
    const host = parsedUrl.hostname;
    if (!host) {
      return { success: false };
    }

    const normalizedPath = parsedUrl.pathname
      .replace(/^\/+/, "")
      .replace(/\.git$/i, "");
    const parsedOwnerAndRepo = parseOwnerAndRepoFromPath(normalizedPath);
    if (!parsedOwnerAndRepo.success) {
      return { success: false };
    }

    return {
      success: true,
      value: { host, ...parsedOwnerAndRepo.value },
    };
  } catch {
    return { success: false };
  }
}

export function parseRepoFromScpStyleRemoteUrl(
  remoteUrl: string,
): ParseResult<RepoInfo> {
  if (remoteUrl.includes("://")) {
    return { success: false };
  }

  const scpMatch = /^(?:[^@]+@)?([^:]+):(.+)$/.exec(remoteUrl);
  if (!scpMatch) {
    return { success: false };
  }

  const host = scpMatch[1]?.trim();
  const normalizedPath = scpMatch[2]
    ?.trim()
    .replace(/^\/+/, "")
    .replace(/\.git$/i, "");
  if (!host || !normalizedPath) {
    return { success: false };
  }

  const parsedOwnerAndRepo = parseOwnerAndRepoFromPath(normalizedPath);
  if (!parsedOwnerAndRepo.success) {
    return { success: false };
  }

  return {
    success: true,
    value: { host, ...parsedOwnerAndRepo.value },
  };
}

function parseOwnerAndRepoFromPath(
  normalizedPath: string,
): ParseResult<{ owner: string; repo: string }> {
  const pathParts = normalizedPath.split("/").filter((part) => part.length > 0);
  if (pathParts.length < 2) {
    return { success: false };
  }

  const repo = pathParts[pathParts.length - 1];
  if (!repo) {
    return { success: false };
  }

  const owner = pathParts.slice(0, -1).join("/");
  if (!owner) {
    return { success: false };
  }

  return {
    success: true,
    value: { owner, repo },
  };
}
