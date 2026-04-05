import { toString } from "mdast-util-to-string";
// https://github.com/openai/openai/blob/master/chatgpt/web/src/components/wham/citations/remark-directive-wham.tsx
import type { Node } from "unist";
import { visit } from "unist-util-visit";

type Transformer = (tree: Node) => void;

export const WHAM_TASK_STUB_DIRECTIVE_NAME = "task-stub";
// TODO: there is no render for the directives below yet but parsing them prevents them from being rendered in an ugly way.
export const WHAM_FILE_DIRECTIVE_NAME = "codex-file-citation";
export const WHAM_TERMINAL_DIRECTIVE_NAME = "codex-terminal-citation";
export const WHAM_IMAGE_DIRECTIVE_NAME = "codex-image-citation";
export const APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME = "inbox-item";
export const APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME = "archive-thread";
export const CODE_COMMENT_DIRECTIVE_NAME = "code-comment";
export const AUTOMATION_UPDATE_DIRECTIVE_NAME = "automation-update";
export const GITHUB_DETAILS_DIRECTIVE_NAME = "github-details";
export const GIT_STAGE_DIRECTIVE_NAME = "git-stage";
export const GIT_COMMIT_DIRECTIVE_NAME = "git-commit";
export const GIT_CREATE_BRANCH_DIRECTIVE_NAME = "git-create-branch";
export const GIT_PUSH_DIRECTIVE_NAME = "git-push";
export const GIT_CREATE_PR_DIRECTIVE_NAME = "git-create-pr";

export type DirectiveNode = {
  name: string;
  attributes?: Record<string, unknown>;
  children: Array<Node>;
  data?: {
    [key: string]: unknown;
    hName?: string;
    hProperties?: Record<string, unknown>;
    hChildren?: Array<Node>;
  };
} & Node;

function isDirectiveNode(node: Node): node is DirectiveNode {
  return (
    (node.type === "containerDirective" ||
      node.type === "textDirective" ||
      node.type === "leafDirective") &&
    "name" in node
  );
}

/**
 * Takes a markdown directive rendered by getOutputTextFromAssistantTurn and turns it into a node
 * with data.hName = WHAM_FILE_DIRECTIVE_NAME (or equivalent)
 */
export const codexRemarkDirective = (): Transformer => {
  return (tree: Node) => {
    visit(tree, (node) => {
      if (!isDirectiveNode(node)) {
        return;
      }

      const data = node.data ?? (node.data = {});

      switch (node.name) {
        case WHAM_FILE_DIRECTIVE_NAME: {
          data.hName = WHAM_FILE_DIRECTIVE_NAME;
          const lineRangeStart = parseInt(
            (node.attributes?.line_range_start as string) ?? "0",
            10,
          );
          const lineRangeEnd = parseInt(
            (node.attributes?.line_range_end as string | undefined) ??
              (node.attributes?.line_range_start as string) ??
              "0",
            10,
          );
          data.hProperties = {
            path: node.attributes?.path,
            lineRangeStart,
            lineRangeEnd,
            gitUrl: node.attributes?.git_url,
          };
          break;
        }
        case WHAM_TERMINAL_DIRECTIVE_NAME: {
          data.hName = WHAM_TERMINAL_DIRECTIVE_NAME;
          const lineRangeStart = parseInt(
            (node.attributes?.line_range_start as string) ?? "0",
            10,
          );
          const lineRangeEnd = parseInt(
            (node.attributes?.line_range_end as string | undefined) ??
              (node.attributes?.line_range_start as string) ??
              "0",
            10,
          );
          data.hProperties = {
            chunkId: node.attributes?.terminal_chunk_id,
            lineRangeStart,
            lineRangeEnd,
          };
          break;
        }
        case WHAM_TASK_STUB_DIRECTIVE_NAME: {
          const prompt = toString({
            type: "root",
            children: node.children as unknown as Array<Node>,
          });
          data.hName = WHAM_TASK_STUB_DIRECTIVE_NAME;
          data.hProperties = {
            title: node.attributes?.title,
            prompt,
          };
          break;
        }
        case WHAM_IMAGE_DIRECTIVE_NAME: {
          data.hName = WHAM_IMAGE_DIRECTIVE_NAME;
          data.hProperties = {
            assetPointer: node.attributes?.asset_pointer,
          };
          break;
        }
        case APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME: {
          data.hName = APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME;
          data.hChildren = [];
          node.children = [];
          data.hProperties = node.attributes ?? {};
          break;
        }
        case APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME: {
          data.hName = APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME;
          data.hChildren = [];
          node.children = [];
          data.hProperties = {};
          break;
        }
        case CODE_COMMENT_DIRECTIVE_NAME:
        case AUTOMATION_UPDATE_DIRECTIVE_NAME:
        case GIT_STAGE_DIRECTIVE_NAME:
        case GIT_COMMIT_DIRECTIVE_NAME:
        case GIT_CREATE_BRANCH_DIRECTIVE_NAME:
        case GIT_PUSH_DIRECTIVE_NAME:
        case GIT_CREATE_PR_DIRECTIVE_NAME: {
          data.hName = node.name;
          data.hChildren = [];
          node.children = [];
          data.hProperties = node.attributes ?? {};
          break;
        }
        case GITHUB_DETAILS_DIRECTIVE_NAME: {
          data.hName = GITHUB_DETAILS_DIRECTIVE_NAME;
          data.hProperties = node.attributes ?? {};
          break;
        }
        default: {
          break;
        }
      }
    });
  };
};
