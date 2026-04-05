import type { Node as ProsemirrorNode, Schema } from "prosemirror-model";

import { formatSkillTitle } from "@/skills/format-skill-title";

import {
  appLinkName,
  getConversationIdFromAgentMentionPath,
  getRoleNameFromConfiguredAgentMentionPath,
  getMentionLabelText,
  getPromptLinkKind,
  isConfiguredAgentMentionPath,
  isAgentMentionPath,
} from "../mention-item";
import { unescapePromptLinkPath } from "./prompt-link-path";

const SERIALIZED_SKILL_MENTION_RE = /\[\$[^\]]+\]\((?:\\.|[^)])+\)/;
const SERIALIZED_PLUGIN_MENTION_RE = /\[@[^\]]+\]\((?:\\.|[^)])+\)/;
const SERIALIZED_AGENT_MENTION_RE = /\[@[^\]]+\]\((?:\\.|[^)])+\)/;
const SERIALIZED_FILE_MENTION_RE =
  /\[[^\]]+\]\((?:(?:\/|[A-Za-z]:\\\\|\\\\\\\\)(?:\\.|[^)])+|(?![A-Za-z][A-Za-z0-9+.-]*:)(?=[^)]*[\\/])(?:\\.|[^)])+)\)/;

export function hasSerializedPromptMentions(text: string): boolean {
  return (
    SERIALIZED_SKILL_MENTION_RE.test(text) ||
    SERIALIZED_PLUGIN_MENTION_RE.test(text) ||
    SERIALIZED_AGENT_MENTION_RE.test(text) ||
    SERIALIZED_FILE_MENTION_RE.test(text)
  );
}

export function plainTextToDoc({
  schema,
  text,
}: {
  schema: Schema;
  text: string;
}): ProsemirrorNode {
  const paragraph = schema.nodes.paragraph;
  const doc = schema.nodes.doc;
  if (!paragraph || !doc) {
    throw new Error("plainTextToDoc requires doc+paragraph nodes");
  }

  const lines = text.split("\n");
  const paragraphs = lines.map((line) =>
    paragraph.create(null, line === "" ? null : schema.text(line)),
  );

  return doc.create(
    null,
    paragraphs.length ? paragraphs : [paragraph.create()],
  );
}

function parseLinks(
  schema: Schema,
  line: string,
): Array<ProsemirrorNode> | null {
  const paragraph = schema.nodes.paragraph;
  const skillMention = schema.nodes.skillMention;
  const appMention = schema.nodes.appMention;
  const pluginMention = schema.nodes.pluginMention;
  const atMention = schema.nodes.atMention;
  const agentMention = schema.nodes.agentMention;

  if (!paragraph) {
    throw new Error("promptTextToDoc requires doc+paragraph nodes");
  }

  const nodes: Array<ProsemirrorNode> = [];
  let i = 0;
  let lastTextStart = 0;

  const flushText = (endExclusive: number): void => {
    if (endExclusive <= lastTextStart) {
      return;
    }
    nodes.push(schema.text(line.slice(lastTextStart, endExclusive)));
  };

  while (i < line.length) {
    const openBracket = line.indexOf("[", i);
    if (openBracket === -1) {
      break;
    }
    const closeBracket = line.indexOf("]", openBracket + 1);
    if (closeBracket === -1) {
      break;
    }
    if (line[closeBracket + 1] !== "(") {
      i = closeBracket + 1;
      continue;
    }

    // Scan path until an unescaped ')'.
    let j = closeBracket + 2;
    let path = "";
    let closed = false;
    while (j < line.length) {
      const ch = line[j];
      if (ch === "\\") {
        const next = line[j + 1];
        if (next) {
          path += `\\${next}`;
          j += 2;
          continue;
        }
      }
      if (ch === ")") {
        closed = true;
        break;
      }
      path += ch;
      j += 1;
    }
    if (!closed) {
      break;
    }

    const label = line.slice(openBracket + 1, closeBracket);
    const unescapedPath = unescapePromptLinkPath(path);

    flushText(openBracket);

    const promptLinkKind = getPromptLinkKind({
      href: unescapedPath,
      label,
    });
    const rawName = getMentionLabelText(label);
    if (pluginMention && unescapedPath.startsWith("plugin://")) {
      nodes.push(
        pluginMention.create({
          name: rawName,
          displayName: rawName,
          path: unescapedPath,
          description: "",
          iconSmall: "",
        }),
      );
    } else if (promptLinkKind === "app" || promptLinkKind === "skill") {
      const mentionName = label.startsWith("$") ? rawName : label;
      if (promptLinkKind === "app" && appMention) {
        nodes.push(
          appMention.create({
            name: appLinkName(mentionName),
            displayName: mentionName,
            path: unescapedPath,
            description: "",
            iconSmall: "",
          }),
        );
      } else if (promptLinkKind === "skill" && skillMention) {
        nodes.push(
          skillMention.create({
            name: mentionName,
            displayName: formatSkillTitle(mentionName),
            path: unescapedPath,
            description: "",
            iconSmall: "",
          }),
        );
      } else {
        nodes.push(schema.text(`[${label}](${unescapedPath})`));
      }
    } else if (
      (isAgentMentionPath(unescapedPath) ||
        isConfiguredAgentMentionPath(unescapedPath)) &&
      agentMention
    ) {
      const rawName = label.startsWith("@") ? label.slice(1) : label;
      const conversationId =
        getConversationIdFromAgentMentionPath(unescapedPath);
      const roleName = getRoleNameFromConfiguredAgentMentionPath(unescapedPath);
      if (conversationId != null || roleName != null) {
        nodes.push(
          agentMention.create({
            name: rawName,
            displayName: rawName,
            conversationId,
            path: unescapedPath,
          }),
        );
      } else {
        nodes.push(schema.text(`[@${rawName}](${unescapedPath})`));
      }
    } else if (atMention) {
      // Best-effort: persisted prompt format doesn't include fsPath, so use `path`.
      nodes.push(
        atMention.create({
          label,
          path: unescapedPath,
          fsPath: unescapedPath,
        }),
      );
    } else {
      // Unknown link type; keep as plain text.
      nodes.push(schema.text(`[${label}](${unescapedPath})`));
    }

    lastTextStart = j + 1;
    i = lastTextStart;
  }

  flushText(line.length);
  return nodes.length ? nodes : null;
}

/** Best-effort parser for our persisted prompt format -> PM doc (mentions + file mentions). */
export function promptTextToDoc({
  schema,
  text,
}: {
  schema: Schema;
  text: string;
}): ProsemirrorNode {
  const paragraph = schema.nodes.paragraph;
  const doc = schema.nodes.doc;
  if (!paragraph || !doc) {
    throw new Error("promptTextToDoc requires doc+paragraph nodes");
  }

  const lines = text.split("\n");
  const paragraphs = lines.map((line) => {
    const content = parseLinks(schema, line);
    return paragraph.create(null, content);
  });

  return doc.create(
    null,
    paragraphs.length ? paragraphs : [paragraph.create()],
  );
}
