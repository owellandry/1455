import mime from "mime-types";
import type { ComponentType } from "react";

import AlignmentLeftIcon from "@/icons/alignment-left.svg";
import CPlusIcon from "@/icons/c-plus.svg";
import CodeIcon from "@/icons/code.svg";
import DocumentIcon from "@/icons/document.svg";
import DollarIcon from "@/icons/dollar.svg";
import FileIcon from "@/icons/file.svg";
import FolderIcon from "@/icons/folder.svg";
import HashtagIcon from "@/icons/hashtag.svg";
import HeartIcon from "@/icons/heart.svg";
import HtmlIcon from "@/icons/html.svg";
import ImageIcon from "@/icons/image-square.svg";
import JavaIcon from "@/icons/java.svg";
import JavaScriptIcon from "@/icons/javascript.svg";
import JsonIcon from "@/icons/json.svg";
import MarkdownIcon from "@/icons/markdown.svg";
import NotebookIcon from "@/icons/notebook.svg";
import PhpIcon from "@/icons/php.svg";
import PythonIcon from "@/icons/python.svg";
import ReactIcon from "@/icons/react.svg";
import RustIcon from "@/icons/rust.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import TerminalIcon from "@/icons/terminal.svg";
import TypeScriptIcon from "@/icons/typescript.svg";

export type FileIconKey =
  | "code"
  | "document"
  | "file"
  | "css"
  | "cplusplus"
  | "folder"
  | "html"
  | "java"
  | "javascript"
  | "image"
  | "json"
  | "yaml"
  | "markdown"
  | "notebook"
  | "php"
  | "python"
  | "react"
  | "rust"
  | "shell"
  | "build"
  | "hashes"
  | "terminal"
  | "typescript"
  | "toml";

type IconComponent = ComponentType<{ className?: string }>;

export const fileIconComponents: Record<FileIconKey, IconComponent> = {
  code: CodeIcon,
  document: DocumentIcon,
  file: FileIcon,
  css: HashtagIcon,
  cplusplus: CPlusIcon,
  folder: FolderIcon,
  html: HtmlIcon,
  java: JavaIcon,
  javascript: JavaScriptIcon,
  image: ImageIcon,
  yaml: FileIcon,
  json: JsonIcon,
  markdown: MarkdownIcon,
  notebook: NotebookIcon,
  php: PhpIcon,
  python: PythonIcon,
  react: ReactIcon,
  rust: RustIcon,
  shell: DollarIcon,
  build: HeartIcon,
  hashes: AlignmentLeftIcon,
  terminal: TerminalIcon,
  typescript: TypeScriptIcon,
  toml: SettingsCogIcon,
};

const extensionIconMap: Record<string, FileIconKey> = Object.fromEntries(
  (
    [
      { key: "typescript", extensions: ["ts"] },
      { key: "react", extensions: ["tsx", "jsx"] },
      { key: "javascript", extensions: ["js", "mjs", "cjs", "hs"] },
      { key: "python", extensions: ["py"] },
      { key: "java", extensions: ["java"] },
      { key: "rust", extensions: ["rs"] },
      { key: "php", extensions: ["php"] },
      { key: "css", extensions: ["css", "scss", "less", "sass"] },
      {
        key: "cplusplus",
        extensions: ["cpp", "cxx", "cc", "c", "hpp", "hh", "h"],
      },
      {
        key: "code",
        extensions: ["rb", "go", "kt", "swift", "m", "mm", "cs", "sql"],
      },
      { key: "json", extensions: ["json", "jsonc"] },
      {
        key: "markdown",
        extensions: ["md", "mdx", "markdown", "mkd", "mdown"],
      },
      { key: "html", extensions: ["html", "htm"] },
      { key: "yaml", extensions: ["yaml", "yml"] },
      { key: "toml", extensions: ["toml"] },
      { key: "document", extensions: ["xml"] },
      { key: "notebook", extensions: ["ipynb"] },
      { key: "shell", extensions: ["sh", "bash", "zsh", "fish", "ps1"] },
      { key: "terminal", extensions: ["dockerfile"] },
      { key: "document", extensions: ["env", "dotenv", "gitignore", "lock"] },
      {
        key: "image",
        extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"],
      },
      {
        key: "build",
        extensions: [
          "build",
          "bazel",
          "bzl",
          "ninja",
          "gradle",
          "mk",
          "makefile",
        ],
      },
      {
        key: "hashes",
        extensions: ["sha", "sha1", "sha256", "md5", "checksum", "sum"],
      },
      { key: "document", extensions: ["pdf"] },
      { key: "folder", extensions: ["zip", "gz", "tgz", "tar"] },
    ] as Array<{ key: FileIconKey; extensions: Array<string> }>
  ).flatMap(({ key, extensions }) =>
    extensions.map<[string, FileIconKey]>((extension) => [extension, key]),
  ),
);

const mimeIconPrefixes: Array<{ prefix: string; key: FileIconKey }> = [
  { prefix: "image/", key: "image" },
  { prefix: "text/", key: "document" },
  { prefix: "application/pdf", key: "document" },
  { prefix: "application/zip", key: "folder" },
  { prefix: "application/gzip", key: "folder" },
];

function extensionFromPath(path: string): string | null {
  const normalizedPath = path.toLowerCase();
  const lastSlash = Math.max(
    normalizedPath.lastIndexOf("/"),
    normalizedPath.lastIndexOf("\\"),
  );
  const filename =
    lastSlash >= 0 ? normalizedPath.slice(lastSlash + 1) : normalizedPath;
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0 && lastDot < filename.length - 1) {
    return filename.slice(lastDot + 1);
  }
  if (lastDot === 0 && filename.length > 1) {
    return filename.slice(1);
  }
  if (lastDot === -1) {
    return filename;
  }
  return null;
}

/** Picks a file icon key using extension first, then mime type. */
export function getFileIconKey(
  path: string | undefined,
  mimeType?: string,
): FileIconKey {
  if (!path && !mimeType) {
    return "file";
  }
  if (path) {
    const extension = extensionFromPath(path);
    if (extension) {
      const byExtension = extensionIconMap[extension];
      if (byExtension) {
        return byExtension;
      }
    }
  }
  const inferredMime = mimeType ?? (path ? mime.lookup(path) : false);
  if (typeof inferredMime === "string") {
    const byMime = mimeIconPrefixes.find(({ prefix }) =>
      inferredMime.startsWith(prefix),
    );
    if (byMime) {
      return byMime.key;
    }
  }
  return "file";
}

export function getFileIcon(
  path: string | undefined,
  mimeType?: string,
): IconComponent {
  return fileIconComponents[getFileIconKey(path, mimeType)];
}
