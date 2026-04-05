import { remark } from "remark";
import remarkDirective from "remark-directive";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

import { logger } from "@/utils/logger";

export type ParsedDirective = {
  name: string;
  attributes: Record<string, string>;
};

const DIRECTIVE_LINE_REGEX = /^::[a-zA-Z0-9-]+.*$/gm;

type DirectiveNode = {
  name?: string;
  attributes?: Record<string, unknown>;
  type?: string;
} & Node;

function isDirectiveNode(node: Node): node is DirectiveNode {
  if (typeof (node as { type?: unknown }).type !== "string") {
    return false;
  }
  return (
    node.type === "containerDirective" ||
    node.type === "textDirective" ||
    node.type === "leafDirective"
  );
}

function normalizeAttributes(
  attributes: Record<string, unknown>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  Object.entries(attributes).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      normalized[key] = String(value);
      return;
    }
    const serialized = JSON.stringify(value);
    if (serialized != null) {
      normalized[key] = serialized;
    }
  });
  return normalized;
}

/** Parse remark directives out of markdown so callers can route them to hosts. */
export function extractDirectives(markdown: string): Array<ParsedDirective> {
  const directives: Array<ParsedDirective> = [];
  const tree = remark().use(remarkDirective).parse(markdown);

  visit(tree, (node) => {
    if (!isDirectiveNode(node) || !node.name) {
      return;
    }

    directives.push({
      name: node.name,
      attributes: normalizeAttributes(node.attributes ?? {}),
    });
  });

  logger.debug("[parseDirectives] directives found", {
    safe: {
      directiveCount: directives.length,
      directiveNames: directives.map((directive) => directive.name).join(","),
    },
    sensitive: {},
  });

  return directives;
}

/** Strip directive lines from markdown for user-facing summaries. */
export function stripDirectiveLines(markdown: string): string {
  const withoutDirectives = markdown.replace(DIRECTIVE_LINE_REGEX, "");
  return withoutDirectives.replace(/\n{3,}/g, "\n\n").trim();
}
