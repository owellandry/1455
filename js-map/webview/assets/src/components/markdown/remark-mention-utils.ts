import type { Content, InlineCode, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/** Splits text nodes by a mention pattern and replaces matches with inline code nodes. */
export function splitMentions(tree: Root, pattern: RegExp): void {
  visit(
    tree,
    "text",
    (node: Text, index?: number | null, parent?: Parent | null): void => {
      if (parent == null || index == null) {
        return;
      }
      const value = node.value;
      if (!pattern.test(value)) {
        return;
      }
      const segments: Array<Content> = [];
      let lastIndex = 0;
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(value)) != null) {
        if (match.index > lastIndex) {
          segments.push({
            type: "text",
            value: value.slice(lastIndex, match.index),
          });
        }
        const mention: InlineCode = {
          type: "inlineCode",
          value: match[0],
        };
        segments.push(mention);
        lastIndex = match.index + match[0].length;
      }
      if (segments.length === 0) {
        return;
      }
      if (lastIndex < value.length) {
        segments.push({
          type: "text",
          value: value.slice(lastIndex),
        });
      }
      parent.children.splice(index, 1, ...segments);
    },
  );
}
