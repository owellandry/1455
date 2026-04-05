import type { FC, ReactNode, SVGProps } from "react";

import CPlusIcon from "@/icons/c-plus.svg";
import CodeIcon from "@/icons/code.svg";
import FileDocumentIcon from "@/icons/file-document.svg";
import GenericFileIcon from "@/icons/file.svg";
import HtmlIcon from "@/icons/html.svg";
import ImageSquareIcon from "@/icons/image-square.svg";
import JavaIcon from "@/icons/java.svg";
import JavascriptIcon from "@/icons/javascript.svg";
import JsonIcon from "@/icons/json.svg";
import NotebookIcon from "@/icons/notebook.svg";
import PhpIcon from "@/icons/php.svg";
import PresentationIcon from "@/icons/presentation.svg";
import PythonIcon from "@/icons/python.svg";
import ReactIcon from "@/icons/react.svg";
import RustIcon from "@/icons/rust.svg";
import TypescriptIcon from "@/icons/typescript.svg";

import { getFileIconKind, type FileIconKind } from "./file-icon-kind";

const ICON_BY_KIND: Record<FileIconKind, FC<SVGProps<SVGSVGElement>>> = {
  "c-plus": CPlusIcon,
  code: CodeIcon,
  document: FileDocumentIcon,
  file: GenericFileIcon,
  html: HtmlIcon,
  image: ImageSquareIcon,
  java: JavaIcon,
  javascript: JavascriptIcon,
  json: JsonIcon,
  notebook: NotebookIcon,
  php: PhpIcon,
  presentation: PresentationIcon,
  python: PythonIcon,
  react: ReactIcon,
  rust: RustIcon,
  spreadsheet: FileDocumentIcon,
  typescript: TypescriptIcon,
};

export function FileIcon({ path }: { path: string }): ReactNode {
  const kind = getFileIconKind(path);
  const Icon = ICON_BY_KIND[kind];
  return (
    <Icon aria-hidden className="h-5 w-5 shrink-0 text-token-text-tertiary" />
  );
}
