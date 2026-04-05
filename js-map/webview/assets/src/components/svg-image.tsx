import { useMemo, type FC, type HTMLAttributes } from "react";

import { dataUrlFromSvg } from "@/utils/data-url-from-svg";

// Uses the browser’s HTML parser to "heal" a possibly‑truncated SVG/HTML
// fragment (e.g. "<svg><path d='…'><g") and returns a well‑formed XML
// string.
function healHTML(html: string): string {
  if (typeof document === "undefined") {
    throw new Error("not supported in SSR");
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  return template.innerHTML;
}

// This component handles untrusted, partial SVG strings.
export const PartialSVGImage: FC<
  { svgString: string } & HTMLAttributes<HTMLImageElement>
> = ({ svgString, ...props }) => {
  const healedSVG = useMemo(() => healHTML(svgString), [svgString]);
  if (!healedSVG) {
    return null;
  }
  return <img src={dataUrlFromSvg(healedSVG)} {...props} />;
};
