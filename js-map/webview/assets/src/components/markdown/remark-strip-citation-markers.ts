import type { Text } from "mdast";
import type { Node, Parent } from "unist";
import { visit } from "unist-util-visit";

const CITATION_MARKER_REGEX = /\uE200cite\uE202[^\uE201]+\uE201/g;
const SKIP_PARENT_TYPES = new Set(["code", "inlineCode"]);

type RemarkTransformer = (tree: Node) => void;
type RemarkPlugin = () => RemarkTransformer;

const stripCitationMarkers = (value: string): string => {
  return value.replace(CITATION_MARKER_REGEX, "");
};

const remarkStripCitationMarkers: RemarkPlugin = () => {
  return (tree) => {
    visit(tree, "text", (node, _index, parent) => {
      if (parent && SKIP_PARENT_TYPES.has((parent as Parent).type)) {
        return;
      }

      const textNode = node as Text;
      const updatedValue = stripCitationMarkers(textNode.value);
      if (updatedValue !== textNode.value) {
        textNode.value = updatedValue;
      }
    });
  };
};

export { remarkStripCitationMarkers, stripCitationMarkers };
