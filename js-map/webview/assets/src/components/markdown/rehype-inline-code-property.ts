import type { Element, Root } from "hast";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

type CodeElement = Element & { properties: { inline?: boolean } };

// react-remark no longer supports the `inline` property on `code` elements as of v9,
// but we use it, so re-add it
// adapted from pseudocode @ https://github.com/remarkjs/react-markdown/issues/776
function isNodeElement(node: Node): node is Element {
  return node.type === "element";
}

function isNodeCodeElement(node: Node): node is CodeElement {
  if (!isNodeElement(node)) {
    return false;
  }
  return node.tagName === "code";
}

export function rehypeInlineCodeProperty(): (tree: Root) => undefined {
  return function (tree: Root): undefined {
    visit(tree, "element", function (node, _index, parent) {
      if (!isNodeCodeElement(node)) {
        return;
      }
      if (parent && isNodeElement(parent) && parent.tagName === "pre") {
        node.properties.inline = false;
      } else {
        node.properties.inline = true;
      }
    });
  };
}
