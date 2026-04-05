import type { Root } from "mdast";

import { splitMentions } from "./remark-mention-utils";

export const SKILL_MENTION_PATTERN = /\$(?:\[[^\]\n]+\]|[A-Za-z][\w-]*)/g;

/** Transforms `$Skill` tokens into inline code nodes so they render like mentions. */
export const remarkSkillMentions = function remarkSkillMentions(): (
  tree: Root,
) => void {
  return (tree: Root): void => {
    splitMentions(tree, SKILL_MENTION_PATTERN);
  };
};
