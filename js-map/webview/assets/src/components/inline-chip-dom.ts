import type { ComponentProps } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { InlineChip } from "@/components/inline-chip";

/** Renders an InlineChip to an HTMLElement for ProseMirror toDOM. */
export function renderInlineChipElement(
  props: ComponentProps<typeof InlineChip>,
): HTMLElement {
  const markup = renderToStaticMarkup(createElement(InlineChip, props));
  const wrapper = document.createElement("span");
  wrapper.innerHTML = markup;
  let candidate = wrapper.firstElementChild as HTMLElement | null;
  while (candidate?.tagName === "LINK") {
    candidate = candidate.nextElementSibling as HTMLElement | null;
  }
  if (candidate != null) {
    return candidate;
  }
  return wrapper;
}
