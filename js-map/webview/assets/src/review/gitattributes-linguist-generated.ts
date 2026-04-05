import { useMemo } from "react";

import { joinRootAndPath, normalizePath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

type GitattributesLinguistGeneratedState = "set" | "unset" | "unspecified";
type GitattributesLinguistGeneratedMatchState =
  GitattributesLinguistGeneratedState | null;

type GitattributesLinguistGeneratedRule = {
  matches: (path: string) => boolean;
  state: GitattributesLinguistGeneratedState;
};

type NormalizedGitPathContext = {
  normalizedGitRoot: string | null;
  normalizedCwd: string | null;
  cwdRelativeToGitRoot: string | null;
};

export function useLinguistGeneratedPaths({
  gitRoot,
  cwd,
  paths,
}: {
  gitRoot: string | null;
  cwd: string | null;
  paths: Array<string>;
}): ReadonlySet<string> {
  const { normalizedGitRoot, normalizedCwd, cwdRelativeToGitRoot } = useMemo(
    () => getNormalizedGitPathContext(gitRoot, cwd),
    [cwd, gitRoot],
  );

  const gitRootAttributesPath =
    normalizedGitRoot == null ? null : `${normalizedGitRoot}/.gitattributes`;
  const cwdAttributesPath =
    cwdRelativeToGitRoot != null && cwdRelativeToGitRoot !== ""
      ? `${normalizedCwd}/.gitattributes`
      : null;

  const gitattributesPaths = [gitRootAttributesPath, cwdAttributesPath].filter(
    (path): path is string => path != null && path.length > 0,
  );
  const existingGitattributesPaths = useExistingPathsSet(gitattributesPaths);

  const gitRootAttributesExists =
    gitRootAttributesPath != null &&
    existingGitattributesPaths.has(gitRootAttributesPath);
  const cwdAttributesExists =
    cwdAttributesPath != null &&
    existingGitattributesPaths.has(cwdAttributesPath);

  const ambiguousSlashPaths = useMemo(() => {
    if (cwdRelativeToGitRoot == null || cwdRelativeToGitRoot === "") {
      return [];
    }

    return paths.filter((path) => {
      const normalizedPath = normalizePath(path);
      return (
        normalizedPath.includes("/") &&
        getPathRelativeToBase(normalizedPath, cwdRelativeToGitRoot) == null
      );
    });
  }, [cwdRelativeToGitRoot, paths]);

  const ambiguousPathCandidates = useMemo(
    () =>
      getAmbiguousPathCandidates({
        ambiguousSlashPaths,
        normalizedCwd,
        normalizedGitRoot,
      }),
    [ambiguousSlashPaths, normalizedCwd, normalizedGitRoot],
  );
  const existingAmbiguousPathCandidates = useExistingPathsSet(
    ambiguousPathCandidates,
  );

  const { data: gitRootAttributesData } = useFetchFromVSCode("read-file", {
    params: { path: gitRootAttributesPath ?? "" },
    queryConfig: {
      enabled: gitRootAttributesExists,
    },
  });

  const { data: cwdAttributesData } = useFetchFromVSCode("read-file", {
    params: { path: cwdAttributesPath ?? "" },
    queryConfig: {
      enabled: cwdAttributesExists,
    },
  });

  const isLinguistGeneratedByRootPath = useMemo(
    () =>
      createLinguistGeneratedStateMatcher(
        gitRootAttributesData?.contents ?? null,
      ),
    [gitRootAttributesData?.contents],
  );

  const isLinguistGeneratedByCwdPath = useMemo(() => {
    if (cwdRelativeToGitRoot == null || cwdRelativeToGitRoot === "") {
      return null;
    }

    return createLinguistGeneratedStateMatcher(
      cwdAttributesData?.contents ?? null,
      { basePath: cwdRelativeToGitRoot },
    );
  }, [cwdAttributesData?.contents, cwdRelativeToGitRoot]);

  const isLinguistGeneratedByCwdRelativePath = useMemo(() => {
    if (cwdRelativeToGitRoot == null || cwdRelativeToGitRoot === "") {
      return null;
    }

    return createLinguistGeneratedStateMatcher(
      cwdAttributesData?.contents ?? null,
    );
  }, [cwdAttributesData?.contents, cwdRelativeToGitRoot]);

  const cwdRelativeFallbackPaths = useMemo(() => {
    return getCwdRelativeFallbackPaths({
      ambiguousSlashPaths,
      normalizedCwd,
      normalizedGitRoot,
      existingCandidatePaths: existingAmbiguousPathCandidates,
    });
  }, [
    ambiguousSlashPaths,
    existingAmbiguousPathCandidates,
    normalizedCwd,
    normalizedGitRoot,
  ]);

  const isLinguistGeneratedPath = useMemo(
    () =>
      (path: string): boolean => {
        const normalizedPath = normalizePath(path);

        const cwdState = isLinguistGeneratedByCwdPath?.(normalizedPath) ?? null;
        if (cwdState != null) {
          return cwdState === "set";
        }

        if (
          shouldUseCwdRelativeMatcherFallback(
            normalizedPath,
            cwdRelativeToGitRoot,
            cwdRelativeFallbackPaths,
          )
        ) {
          const cwdRelativeState =
            isLinguistGeneratedByCwdRelativePath?.(normalizedPath) ?? null;
          if (cwdRelativeState != null) {
            return cwdRelativeState === "set";
          }
        }

        return isLinguistGeneratedByRootPath?.(normalizedPath) === "set";
      },
    [
      cwdRelativeToGitRoot,
      cwdRelativeFallbackPaths,
      isLinguistGeneratedByCwdPath,
      isLinguistGeneratedByCwdRelativePath,
      isLinguistGeneratedByRootPath,
    ],
  );

  return useMemo(() => {
    if (
      isLinguistGeneratedByRootPath == null &&
      isLinguistGeneratedByCwdPath == null &&
      isLinguistGeneratedByCwdRelativePath == null
    ) {
      return new Set<string>();
    }

    return new Set(paths.filter((path) => isLinguistGeneratedPath(path)));
  }, [
    isLinguistGeneratedByCwdPath,
    isLinguistGeneratedByCwdRelativePath,
    isLinguistGeneratedByRootPath,
    isLinguistGeneratedPath,
    paths,
  ]);
}

export function createLinguistGeneratedMatcher(
  gitattributesContents: string | null,
  options: { basePath?: string | null } = {},
): ((path: string) => boolean) | null {
  const matcher = createLinguistGeneratedStateMatcher(
    gitattributesContents,
    options,
  );

  if (!matcher) {
    return null;
  }

  return (path: string): boolean => matcher(path) === "set";
}

function createLinguistGeneratedStateMatcher(
  gitattributesContents: string | null,
  options: { basePath?: string | null } = {},
): ((path: string) => GitattributesLinguistGeneratedMatchState) | null {
  if (!gitattributesContents) {
    return null;
  }

  const basePath =
    options.basePath == null
      ? null
      : normalizePath(options.basePath).replace(/^\/+/, "").replace(/\/+$/, "");

  const rules = gitattributesContents
    .split(/\r?\n/)
    .map((line) => parseLinguistGeneratedRule(line))
    .filter((rule) => rule != null);
  if (rules.length === 0) {
    return null;
  }

  return (path: string): GitattributesLinguistGeneratedMatchState => {
    let state: GitattributesLinguistGeneratedMatchState = null;
    const normalizedPath = normalizePath(path);
    const relativePath = getPathRelativeToBase(normalizedPath, basePath);

    if (relativePath == null) {
      return null;
    }

    for (const rule of rules) {
      if (!rule.matches(relativePath)) {
        continue;
      }
      state = rule.state;
    }

    return state;
  };
}

function getPathRelativeToBase(
  path: string,
  basePath: string | null,
): string | null {
  if (basePath == null) {
    return path;
  }

  const pathPrefix = `${basePath}/`;
  if (path === basePath) {
    return "";
  }
  if (!path.startsWith(pathPrefix)) {
    return null;
  }

  return path.slice(pathPrefix.length);
}

function shouldUseCwdRelativeMatcherFallback(
  path: string,
  cwdRelativeToGitRoot: string | null,
  cwdRelativeFallbackPaths: ReadonlySet<string>,
): boolean {
  if (cwdRelativeToGitRoot == null || cwdRelativeToGitRoot === "") {
    return false;
  }

  if (path.includes("/")) {
    return cwdRelativeFallbackPaths.has(path);
  }

  return getPathRelativeToBase(path, cwdRelativeToGitRoot) == null;
}

function parseLinguistGeneratedRule(
  line: string,
): GitattributesLinguistGeneratedRule | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }
  if (trimmed.startsWith("[attr]")) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) {
    return null;
  }

  const matcher = createGitattributesPathMatcher(tokens[0]);
  if (!matcher) {
    return null;
  }

  const state = parseLinguistGeneratedState(tokens.slice(1));
  if (state == null) {
    return null;
  }

  return {
    matches: matcher,
    state,
  };
}

function parseLinguistGeneratedState(
  attrs: Array<string>,
): GitattributesLinguistGeneratedState | null {
  let state: GitattributesLinguistGeneratedState | null = null;

  for (const attr of attrs) {
    if (attr === "linguist-generated" || attr === "linguist-generated=true") {
      state = "set";
      continue;
    }
    if (attr === "-linguist-generated" || attr === "linguist-generated=false") {
      state = "unset";
      continue;
    }
    if (attr === "!linguist-generated") {
      state = "unspecified";
    }
  }

  return state;
}

function createGitattributesPathMatcher(
  rawPattern: string,
): ((path: string) => boolean) | null {
  if (!rawPattern) {
    return null;
  }

  const normalizedPattern = normalizePath(rawPattern)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (normalizedPattern.length === 0) {
    return null;
  }

  const isBasenamePattern = !normalizedPattern.includes("/");
  const bodyPattern = isBasenamePattern
    ? normalizedPattern
    : `^${globToPathRegexSource(normalizedPattern)}$`;
  const regex = isBasenamePattern
    ? new RegExp(`(^|/)${globToPathRegexSource(bodyPattern)}$`)
    : new RegExp(bodyPattern);

  return (path: string): boolean => regex.test(normalizePath(path));
}

function globToPathRegexSource(glob: string): string {
  let result = "";

  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      const nextChar = glob[index + 1];
      if (nextChar === "*") {
        const afterStarStar = glob[index + 2];
        if (afterStarStar === "/") {
          result += "(?:.*/)?";
          index += 2;
          continue;
        }
        result += ".*";
        index += 1;
        continue;
      }
      result += "[^/]*";
      continue;
    }

    if (char === "?") {
      result += "[^/]";
      continue;
    }

    result += escapeRegexChar(char);
  }

  return result;
}

function escapeRegexChar(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function useExistingPathsSet(paths: Array<string>): ReadonlySet<string> {
  const { data } = useFetchFromVSCode("paths-exist", {
    params: { paths },
    queryConfig: {
      enabled: paths.length > 0,
    },
  });

  return useMemo(
    () => new Set(data?.existingPaths.map((path) => normalizePath(path)) ?? []),
    [data?.existingPaths],
  );
}

function getNormalizedGitPathContext(
  gitRoot: string | null,
  cwd: string | null,
): NormalizedGitPathContext {
  const normalizedGitRoot = normalizePathForLookup(gitRoot);
  const normalizedCwd = normalizePathForLookup(cwd);

  return {
    normalizedGitRoot,
    normalizedCwd,
    cwdRelativeToGitRoot: getCwdRelativeToGitRoot(
      normalizedGitRoot,
      normalizedCwd,
    ),
  };
}

function normalizePathForLookup(path: string | null): string | null {
  if (path == null) {
    return null;
  }

  return normalizePath(path).replace(/\/+$/, "");
}

function getCwdRelativeToGitRoot(
  normalizedGitRoot: string | null,
  normalizedCwd: string | null,
): string | null {
  if (normalizedGitRoot == null || normalizedCwd == null) {
    return null;
  }
  if (normalizedCwd === normalizedGitRoot) {
    return "";
  }

  const rootPrefix = `${normalizedGitRoot}/`;
  if (!normalizedCwd.startsWith(rootPrefix)) {
    return null;
  }

  return normalizedCwd.slice(rootPrefix.length);
}

function getAmbiguousPathCandidates({
  ambiguousSlashPaths,
  normalizedCwd,
  normalizedGitRoot,
}: {
  ambiguousSlashPaths: Array<string>;
  normalizedCwd: string | null;
  normalizedGitRoot: string | null;
}): Array<string> {
  if (normalizedGitRoot == null || normalizedCwd == null) {
    return [];
  }

  return ambiguousSlashPaths.flatMap((path) => {
    const normalizedPath = normalizePath(path);
    return [
      joinRootAndPath(normalizedGitRoot, normalizedPath),
      joinRootAndPath(normalizedCwd, normalizedPath),
    ];
  });
}

function getCwdRelativeFallbackPaths({
  ambiguousSlashPaths,
  normalizedCwd,
  normalizedGitRoot,
  existingCandidatePaths,
}: {
  ambiguousSlashPaths: Array<string>;
  normalizedCwd: string | null;
  normalizedGitRoot: string | null;
  existingCandidatePaths: ReadonlySet<string>;
}): ReadonlySet<string> {
  if (normalizedGitRoot == null || normalizedCwd == null) {
    return new Set<string>();
  }

  return new Set(
    ambiguousSlashPaths.filter((path) => {
      const normalizedPath = normalizePath(path);
      const rootCandidate = normalizePath(
        joinRootAndPath(normalizedGitRoot, normalizedPath),
      );
      const cwdCandidate = normalizePath(
        joinRootAndPath(normalizedCwd, normalizedPath),
      );

      return (
        existingCandidatePaths.has(cwdCandidate) &&
        !existingCandidatePaths.has(rootCandidate)
      );
    }),
  );
}
