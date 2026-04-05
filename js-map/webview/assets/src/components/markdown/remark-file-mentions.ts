import type { Root } from "mdast";

import { splitMentions } from "./remark-mention-utils";

export const FILE_MENTION_PATTERN = /@[A-Za-z0-9][\w.-]*[\\/][\w./-]*/g;

/** Transforms `@path` tokens into inline code nodes so they render like mentions. */
export const remarkFileMentions = function remarkFileMentions(): (
  tree: Root,
) => void {
  return (tree: Root): void => {
    splitMentions(tree, FILE_MENTION_PATTERN);
  };
};
