export type FileIconKind =
  | "c-plus"
  | "code"
  | "document"
  | "file"
  | "html"
  | "image"
  | "java"
  | "javascript"
  | "json"
  | "notebook"
  | "php"
  | "presentation"
  | "python"
  | "react"
  | "rust"
  | "spreadsheet"
  | "typescript";

const FILE_NAME_KIND_MAP = new Map<string, FileIconKind>([
  [".env", "code"],
  [".env.example", "code"],
  [".env.local", "code"],
  [".gitignore", "code"],
  [".npmrc", "code"],
  [".prettierignore", "code"],
  [".prettierrc", "json"],
  ["cargo.lock", "rust"],
  ["cargo.toml", "rust"],
  ["changelog", "document"],
  ["dockerfile", "code"],
  ["license", "document"],
  ["license.md", "document"],
  ["makefile", "code"],
  ["package-lock.json", "json"],
  ["package.json", "json"],
  ["readme", "document"],
  ["readme.md", "document"],
  ["requirements.txt", "python"],
  ["tsconfig.json", "json"],
  ["yarn.lock", "json"],
]);

const EXTENSION_KIND_MAP = new Map<string, FileIconKind>([
  ["adoc", "document"],
  ["asciidoc", "document"],
  ["avif", "image"],
  ["bash", "code"],
  ["bmp", "image"],
  ["c", "c-plus"],
  ["cc", "c-plus"],
  ["cfg", "code"],
  ["conf", "code"],
  ["cpp", "c-plus"],
  ["csv", "spreadsheet"],
  ["css", "code"],
  ["cxx", "c-plus"],
  ["doc", "document"],
  ["docx", "document"],
  ["gif", "image"],
  ["go", "code"],
  ["h", "c-plus"],
  ["har", "json"],
  ["heic", "image"],
  ["heif", "image"],
  ["hh", "c-plus"],
  ["hpp", "c-plus"],
  ["htm", "html"],
  ["html", "html"],
  ["hxx", "c-plus"],
  ["ico", "image"],
  ["ini", "code"],
  ["ipynb", "notebook"],
  ["java", "java"],
  ["jpeg", "image"],
  ["jpg", "image"],
  ["js", "javascript"],
  ["json", "json"],
  ["json5", "json"],
  ["jsonl", "json"],
  ["jsx", "react"],
  ["key", "presentation"],
  ["less", "code"],
  ["lock", "json"],
  ["log", "document"],
  ["m", "c-plus"],
  ["markdown", "document"],
  ["md", "document"],
  ["mdx", "document"],
  ["mjs", "javascript"],
  ["mts", "typescript"],
  ["numbers", "spreadsheet"],
  ["ods", "spreadsheet"],
  ["odt", "document"],
  ["odp", "presentation"],
  ["pages", "document"],
  ["parquet", "spreadsheet"],
  ["pdf", "document"],
  ["php", "php"],
  ["phtml", "php"],
  ["png", "image"],
  ["ppt", "presentation"],
  ["pptx", "presentation"],
  ["ps1", "code"],
  ["psd", "image"],
  ["py", "python"],
  ["pyi", "python"],
  ["rb", "code"],
  ["rs", "rust"],
  ["rst", "document"],
  ["rtf", "document"],
  ["sass", "code"],
  ["scss", "code"],
  ["sh", "code"],
  ["sql", "code"],
  ["svg", "image"],
  ["tex", "document"],
  ["tif", "image"],
  ["tiff", "image"],
  ["toml", "code"],
  ["ts", "typescript"],
  ["tsv", "spreadsheet"],
  ["tsx", "react"],
  ["txt", "document"],
  ["vue", "react"],
  ["webmanifest", "json"],
  ["webp", "image"],
  ["xls", "spreadsheet"],
  ["xlsx", "spreadsheet"],
  ["xhtml", "html"],
  ["xml", "code"],
  ["yaml", "code"],
  ["yml", "code"],
  ["zsh", "code"],
]);

export function getFileIconKind(path: string): FileIconKind {
  const basename = path.split(/[\\/]/).pop()?.toLowerCase() ?? "";

  if (FILE_NAME_KIND_MAP.has(basename)) {
    return FILE_NAME_KIND_MAP.get(basename)!;
  }

  const extension = getFileExtension(basename);
  if (extension.length === 0) {
    return "file";
  }

  return EXTENSION_KIND_MAP.get(extension) ?? "file";
}

function getFileExtension(basename: string): string {
  const extensionStart = basename.lastIndexOf(".");
  if (extensionStart <= 0) {
    return "";
  }

  return basename.slice(extensionStart + 1);
}
