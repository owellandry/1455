import type {
  Attrs,
  DOMOutputSpec,
  NodeSpec,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import { PluginKey } from "prosemirror-state";

import { renderInlineChipElement } from "@/components/inline-chip-dom";
import { getAgentMentionColorCssValueForSessionId } from "@/local-conversation/items/multi-agent-mentions";

import { getFileMentionIcon } from "../mention-icons";
import { isConfiguredAgentMentionPath } from "../mention-item";
import type { MentionPluginHandlers, MentionUiState } from "./mentions-shared";
import { createMentionPlugins } from "./mentions-shared";

export const mentionUiKey = new PluginKey<MentionUiState>("mention-ui");

export const atMentionSpec = {
  // TODO: Generalize this to allow for different types of mentions
  attrs: {
    label: { validate: "string" },
    path: { validate: "string" },
    fsPath: { validate: "string" },
  },
  inline: true,
  group: "inline",
  draggable: false,
  selectable: false,

  toDOM: (node: ProsemirrorNode): DOMOutputSpec | HTMLElement => {
    const path =
      typeof node.attrs.path === "string" ? node.attrs.path : undefined;
    return renderInlineChipElement({
      text: node.attrs.label,
      icon: getFileMentionIcon(path),
      interactive: true,
      dataAttributes: {
        "at-mention-label": node.attrs.label,
        "at-mention-path": node.attrs.path,
        "at-mention-fs-path": node.attrs.fsPath,
      },
    });
  },
  parseDOM: [
    {
      tag: "span[at-mention-label][at-mention-path][at-mention-fs-path]",
      getAttrs: (node: HTMLElement): Attrs => {
        const label = node.getAttribute("at-mention-label");
        const path = node.getAttribute("at-mention-path");
        const fsPath = node.getAttribute("at-mention-fs-path");
        return { label, path, fsPath };
      },
    },
  ],
};

export const agentMentionSpec: NodeSpec = {
  attrs: {
    name: { validate: "string" },
    displayName: { validate: "string", default: "" },
    conversationId: { default: null },
    path: { validate: "string" },
  },
  inline: true,
  group: "inline",
  draggable: false,
  selectable: false,
  toDOM: (node: ProsemirrorNode): DOMOutputSpec | HTMLElement => {
    const displayName = node.attrs.displayName || node.attrs.name;
    const conversationId =
      typeof node.attrs.conversationId === "string"
        ? node.attrs.conversationId
        : null;
    const mentionColor =
      conversationId == null
        ? null
        : getAgentMentionColorCssValueForSessionId(conversationId);
    return renderInlineChipElement({
      text: `@${displayName}`,
      interactive: true,
      className: "hover:opacity-90",
      colorVariant:
        conversationId == null && isConfiguredAgentMentionPath(node.attrs.path)
          ? "link"
          : undefined,
      style:
        mentionColor == null
          ? undefined
          : {
              color: mentionColor,
              backgroundColor: `color-mix(in srgb, ${mentionColor} 16%, transparent)`,
            },
      dataAttributes: {
        "agent-mention-name": node.attrs.name,
        "agent-mention-display-name": displayName,
        "agent-mention-path": node.attrs.path,
        ...(conversationId == null
          ? {}
          : {
              "agent-mention-conversation-id": conversationId,
            }),
      },
    });
  },
  parseDOM: [
    {
      tag: "span[agent-mention-name][agent-mention-path]",
      getAttrs: (node: HTMLElement): Attrs => {
        const name = node.getAttribute("agent-mention-name");
        const displayName =
          node.getAttribute("agent-mention-display-name") ?? name;
        const conversationId = node.getAttribute(
          "agent-mention-conversation-id",
        );
        const path = node.getAttribute("agent-mention-path");
        return { name, displayName, conversationId, path };
      },
    },
  ],
};

export type Options = MentionPluginHandlers;

export function atMentionsPlugin(opts: Options = {}): Array<Plugin> {
  return createMentionPlugins({
    key: mentionUiKey,
    trigger: "@",
    wordPattern: /(^|\s)(@[^\s@]*)$/,
    ...opts,
  });
}
