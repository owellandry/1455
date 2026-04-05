import type { Node } from "unist";
import { visit } from "unist-util-visit";

import {
  AUTOMATION_UPDATE_DIRECTIVE_NAME,
  CODE_COMMENT_DIRECTIVE_NAME,
  GITHUB_DETAILS_DIRECTIVE_NAME,
  WHAM_FILE_DIRECTIVE_NAME,
  WHAM_IMAGE_DIRECTIVE_NAME,
  WHAM_TASK_STUB_DIRECTIVE_NAME,
  WHAM_TERMINAL_DIRECTIVE_NAME,
} from "./codex-remark-directive";

interface TextDirectiveNode extends Node {
  name: string;
  value: string;
}

/**
 * Fallback: Render unhandled directives as plain text.
 * https://github.com/openai/openai/blob/master/chatgpt/web/src/components/formatted-text/plugins.ts#L154
 */
export function fallbackDirective() {
  return (tree: Node): void => {
    visit(tree, "textDirective", (node: TextDirectiveNode): void => {
      if (
        node.name === WHAM_TASK_STUB_DIRECTIVE_NAME ||
        node.name === WHAM_FILE_DIRECTIVE_NAME ||
        node.name === WHAM_TERMINAL_DIRECTIVE_NAME ||
        node.name === WHAM_IMAGE_DIRECTIVE_NAME ||
        node.name === AUTOMATION_UPDATE_DIRECTIVE_NAME ||
        node.name === CODE_COMMENT_DIRECTIVE_NAME ||
        node.name === GITHUB_DETAILS_DIRECTIVE_NAME
      ) {
        return;
      }
      node.type = "text";
      node.value = `:${node.name}`;
    });
  };
}
