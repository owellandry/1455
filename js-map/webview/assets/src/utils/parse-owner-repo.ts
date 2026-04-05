export type OwnerRepo = { owner: string; repoName: string };

/**
 * Parse a git remote URL into `{ owner, repoName }`.
 * Supports:
 * - HTTPS/HTTP URLs (with or without credentials)
 * - SSH SCP-like syntax (e.g., git@host:owner/repo(.git))
 * - ssh:// style URLs
 * - Plain host/path strings (e.g., github.com/owner/repo)
 * Returns null if the input cannot be parsed into at least two path segments after the host.
 */
export function parseOwnerRepo(url: string): OwnerRepo | null {
  try {
    let normalized = url.trim();

    // Handle SCP-like syntax: git@host:owner/repo(.git)
    const scpMatch = /^(?<user>[^@]+)@(?<host>[^:]+):(?<path>.+)$/.exec(
      normalized,
    );
    let host: string | null = null;
    if (scpMatch?.groups?.path && scpMatch.groups.host) {
      host = scpMatch.groups.host;
      normalized = `${host}/${scpMatch.groups.path}`;
    }

    // Strip protocol prefixes
    if (host == null) {
      const protoMatch = /^(?<proto>[a-z]+):\/\/(?<rest>.+)$/i.exec(normalized);
      if (protoMatch?.groups?.rest) {
        normalized = protoMatch.groups.rest;
      }
    } else {
      normalized = normalized.replace(/^[a-z]+:\/\//i, "");
    }

    // Drop possible leading credentials (e.g., user@)
    normalized = normalized.replace(/^[^@]+@/, "");

    // Remove trailing .git and any # or ? fragments
    normalized = normalized.replace(/[?#].*$/, "").replace(/\.git$/i, "");

    // Split and take last two segments
    const parts = normalized.split("/").filter(Boolean);
    if (!host && parts.length > 0) {
      host = parts[0] ?? null;
    }
    const segments = host ? parts.slice(1) : parts;
    if (segments.length < 2) {
      return null;
    }
    const repoName = segments[segments.length - 1];
    const owner = segments[segments.length - 2];
    if (!owner || !repoName) {
      return null;
    }
    return { owner, repoName };
  } catch {
    return null;
  }
}
