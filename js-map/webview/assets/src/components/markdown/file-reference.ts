import { isAbsoluteFilesystemPath } from "protocol";

export type ParsedFileReference = {
  path: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
};

const FILE_REFERENCE_PATTERN = /(?:^|[\\/])[^\\/]+\.(?!\d+$)[^\\/.]+$/i;

/** By default, consider suffixes of 4 characters or less to be file extensions. */
const MAX_EXTENSION_LENGTH = 4;

/** Some extensions are allowed to be longer than the default. */
const LONG_EXTENSION_ALLOWLIST = new Set<string>([
  "7zipx",
  "accdb",
  "asarpack",
  "asciidoc",
  "backup",
  "backupdb",
  "bundle",
  "ccproj",
  "cdrdao",
  "code-workspace",
  "config",
  "debugin",
  "deploy",
  "design",
  "docbook",
  "dockerfile",
  "dockerignore",
  "editorconfig",
  "eslintignore",
  "gitattributes",
  "gitignore",
  "gitignore",
  "gitkeep",
  "gradle",
  "graphqls",
  "ignore",
  "ipynb",
  "keychain",
  "keynote",
  "licensee",
  "lockfile",
  "lockfile",
  "markdown",
  "markup",
  "matlab",
  "mkdocs",
  "models",
  "module",
  "msstyle",
  "notebook",
  "npmignore",
  "output",
  "packageinfo",
  "parquet",
  "pickle",
  "plistx",
  "policy",
  "postcssrc",
  "prettierignore",
  "projectfile",
  "python",
  "readme",
  "review",
  "robots",
  "schema",
  "search",
  "series",
  "settingsjson",
  "shader",
  "sqlite",
  "sqlite3",
  "storyboard",
  "styles",
  "system",
  "target",
  "terraform",
  "update",
  "vertex",
  "webapp",
  "webdoc",
  "webpackrc",
  "widget",
  "workspace",
  "xcodeproj",
  "yarnlock",
]);

export function parseFileReference(raw: string): ParsedFileReference {
  const text = raw.replace(/`/g, "").trim();
  const colonMatch = text.match(
    /^(.*?):(\d+)(?::(\d+))?(?:[-–](\d+)(?::(\d+))?)?$/,
  );
  if (colonMatch) {
    const [, path, line, column, endLine, endColumn] = colonMatch;
    return {
      path,
      line: Number.parseInt(line, 10),
      column: column ? Number.parseInt(column, 10) : undefined,
      endLine: endLine ? Number.parseInt(endLine, 10) : undefined,
      endColumn: endColumn ? Number.parseInt(endColumn, 10) : undefined,
    };
  }

  const hashMatch = text.match(
    /^(.*?)#L(\d+)(?:C(\d+))?(?:-L(\d+)(?:C(\d+))?)?$/,
  );
  if (hashMatch) {
    const [, path, line, column, endLine, endColumn] = hashMatch;
    return {
      path,
      line: Number.parseInt(line, 10),
      column: column ? Number.parseInt(column, 10) : undefined,
      endLine: endLine ? Number.parseInt(endLine, 10) : undefined,
      endColumn: endColumn ? Number.parseInt(endColumn, 10) : undefined,
    };
  }

  return { path: text };
}

export function formatFileReferenceLabel(
  reference: ParsedFileReference,
): string {
  const { path } = reference;
  const details = formatFileReferenceDetails(reference);

  if (details.length === 0) {
    return path;
  }

  return `${path} (${details.join(", ")})`;
}

export function formatFileReferenceDisplayLabel(
  reference: ParsedFileReference,
): string {
  const { path } = reference;
  const details = formatFileReferenceDetails(reference);
  const fileName = path.split(/[\\/]/).pop() ?? path;

  if (details.length === 0) {
    return fileName;
  }

  return `${fileName} (${details.join(", ")})`;
}

function formatFileReferenceDetails(
  reference: ParsedFileReference,
): Array<string> {
  const { line, column, endLine, endColumn } = reference;
  const details: Array<string> = [];

  if (line !== undefined) {
    if (endLine !== undefined && endLine !== line) {
      details.push(`lines ${line}-${endLine}`);
    } else {
      details.push(`line ${line}`);
    }
  } else if (endLine !== undefined) {
    details.push(`line ${endLine}`);
  }

  if (column !== undefined || endColumn !== undefined) {
    if (
      column !== undefined &&
      endColumn !== undefined &&
      endColumn !== column
    ) {
      details.push(`columns ${column}-${endColumn}`);
    } else if (column !== undefined) {
      details.push(`column ${column}`);
    } else if (endColumn !== undefined) {
      details.push(`column ${endColumn}`);
    }
  }

  return details;
}

export function isFileReference(text: string): boolean {
  const { path, line, column, endLine, endColumn } = parseFileReference(text);

  if (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(path) ||
    /^www\./i.test(path) ||
    /^(mailto|tel):/i.test(path)
  ) {
    return false;
  }

  if (
    line !== undefined ||
    column !== undefined ||
    endLine !== undefined ||
    endColumn !== undefined
  ) {
    return true;
  }

  if (!FILE_REFERENCE_PATTERN.test(path)) {
    return false;
  }

  const hasPathSeparator = /[\\/]/.test(path);
  const fileName = path.split(/[\\/]/).pop() ?? "";
  const extension = fileName.includes(".")
    ? (fileName.split(".").pop() ?? "")
    : "";

  if (!extension) {
    return false;
  }

  const hasLowercase = /[a-z]/.test(extension);
  const hasUppercaseAfterFirst = /[A-Z]/.test(extension.slice(1));
  if (!hasPathSeparator && hasLowercase && hasUppercaseAfterFirst) {
    return false;
  }

  if (!hasPathSeparator) {
    const normalizedExtension = extension.toLowerCase();
    if (
      normalizedExtension.length > MAX_EXTENSION_LENGTH &&
      !LONG_EXTENSION_ALLOWLIST.has(normalizedExtension)
    ) {
      return false;
    }
  }

  return true;
}

export function isAbsoluteFilesystemReference(text: string): boolean {
  const { path } = parseFileReference(text);
  return isAbsoluteFilesystemPath(path);
}
