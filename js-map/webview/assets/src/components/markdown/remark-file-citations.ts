import type { Parent, Text } from "mdast";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

import { WHAM_FILE_DIRECTIVE_NAME } from "../../markdown-directives/codex-remark-directive";

const FILE_CITATION_REGEX = /【(F:[^†]+)†L(\d+)(?:-L(\d+))?】/g;
const SKIP_PARENT_TYPES = new Set<Parent["type"]>([
  "code",
  "inlineCode",
  "link",
]);

type RemarkTransformer = (tree: Node) => void;
type RemarkPlugin = (options?: { enabled?: boolean }) => RemarkTransformer;

type ReplacementOperation = {
  index: number;
  parent: Parent;
  replacementNodes: Array<FileCitationDirectiveNode | Text>;
};

type FileCitationDirectiveNode = Node & {
  type: "leafDirective";
  name: typeof WHAM_FILE_DIRECTIVE_NAME;
  attributes: {
    path: string;
    line_range_start: string;
    line_range_end?: string;
  };
  children: [];
};

function createTextNode(value: string): Text {
  return {
    type: "text",
    value,
  };
}

function createFileCitationDirectiveNode(
  path: string,
  lineRangeStart: number,
  lineRangeEnd: number | undefined,
): FileCitationDirectiveNode {
  return {
    type: "leafDirective",
    name: WHAM_FILE_DIRECTIVE_NAME,
    attributes: {
      path,
      line_range_start: String(lineRangeStart),
      ...(lineRangeEnd != null && lineRangeEnd !== lineRangeStart
        ? { line_range_end: String(lineRangeEnd) }
        : {}),
    },
    children: [],
  };
}

const remarkFileCitations: RemarkPlugin = (options) => {
  return (tree) => {
    if (options?.enabled !== true) {
      return;
    }

    const operations: Array<ReplacementOperation> = [];

    visit(tree, "text", (node, index, parent) => {
      const parentNode = parent as Parent | undefined;
      if (parentNode == null || index == null) {
        return;
      }

      if (SKIP_PARENT_TYPES.has(parentNode.type)) {
        return;
      }

      const textNode = node as Text;
      const replacementNodes: Array<FileCitationDirectiveNode | Text> = [];
      let lastIndex = 0;

      for (const match of textNode.value.matchAll(FILE_CITATION_REGEX)) {
        const fullMatch = match[0];
        const citationId = match[1];
        const startOffset = match.index ?? -1;
        if (!citationId.startsWith("F:") || startOffset < 0) {
          continue;
        }

        if (startOffset > lastIndex) {
          replacementNodes.push(
            createTextNode(textNode.value.slice(lastIndex, startOffset)),
          );
        }

        replacementNodes.push(
          createFileCitationDirectiveNode(
            citationId.slice(2),
            Number.parseInt(match[2], 10),
            match[3] ? Number.parseInt(match[3], 10) : undefined,
          ),
        );
        lastIndex = startOffset + fullMatch.length;
      }

      if (replacementNodes.length === 0) {
        return;
      }

      if (lastIndex < textNode.value.length) {
        replacementNodes.push(createTextNode(textNode.value.slice(lastIndex)));
      }

      operations.push({
        index,
        parent: parentNode,
        replacementNodes,
      });
    });

    for (const operation of operations.reverse()) {
      operation.parent.children.splice(
        operation.index,
        1,
        ...operation.replacementNodes,
      );
    }
  };
};

export { remarkFileCitations };
