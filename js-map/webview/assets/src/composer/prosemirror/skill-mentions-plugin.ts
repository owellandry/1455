import type {
  Attrs,
  DOMOutputSpec,
  NodeSpec,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Plugin } from "prosemirror-state";
import { PluginKey } from "prosemirror-state";

import { renderInlineChipElement } from "@/components/inline-chip-dom";
import AppsIcon from "@/icons/apps.svg";
import { getSkillIcon } from "@/skills/get-skill-icon";

import { getSkillMentionIcon } from "../mention-icons";
import type { MentionPluginHandlers, MentionUiState } from "./mentions-shared";
import { createMentionPlugins } from "./mentions-shared";

export const skillMentionUiKey = new PluginKey<MentionUiState>(
  "skill-mention-ui",
);

function createMentionChipSpec(
  attributePrefix: "skill-mention" | "app-mention" | "plugin-mention",
): NodeSpec {
  const nameAttr = `${attributePrefix}-name`;
  const displayNameAttr = `${attributePrefix}-display-name`;
  const pathAttr = `${attributePrefix}-path`;
  const iconAttr = `${attributePrefix}-icon`;

  const fallbackIcon =
    attributePrefix === "plugin-mention" ? AppsIcon : getSkillMentionIcon();

  return {
    attrs: {
      name: { validate: "string" },
      displayName: { validate: "string", default: "" },
      path: { validate: "string" },
      description: { validate: "string" },
      iconSmall: { validate: "string", default: "" },
    },
    inline: true,
    group: "inline",
    draggable: false,
    selectable: false,
    toDOM: (node: ProsemirrorNode): DOMOutputSpec | HTMLElement => {
      const displayName = node.attrs.displayName || node.attrs.name;
      const isStale = node.attrs.path.length === 0;
      // `getSkillIcon` is a misleading name here: app/plugin mentions still
      // use it as a shared icon resolver, while $skill chips always use the
      // generic skill icon for consistency.
      const Icon =
        attributePrefix === "skill-mention"
          ? fallbackIcon
          : getSkillIcon(null, {
              iconSmall: node.attrs.iconSmall,
              basePath: node.attrs.path,
              smallOnly: true,
              alt: displayName,
              fallbackName: node.attrs.name,
              fallbackIcon,
            });
      return renderInlineChipElement({
        text: displayName,
        icon: Icon,
        interactive: true,
        // Gray out mentions whose skill could not be re-resolved in the
        // current environment, while leaving the chip in place for the user.
        className: isStale
          ? "bg-token-foreground/5 text-token-description-foreground opacity-60 hover:bg-token-foreground/5"
          : undefined,
        colorVariant: "success",
        dataAttributes: {
          [nameAttr]: node.attrs.name,
          [displayNameAttr]: displayName,
          [pathAttr]: node.attrs.path,
          [iconAttr]: node.attrs.iconSmall,
        },
      });
    },
    parseDOM: [
      {
        tag: `span[${nameAttr}][${pathAttr}]`,
        getAttrs: (node: HTMLElement): Attrs => {
          const name = node.getAttribute(nameAttr);
          const displayName = node.getAttribute(displayNameAttr) ?? name;
          const path = node.getAttribute(pathAttr);
          const description = node.getAttribute("title") ?? "";
          const iconSmall = node.getAttribute(iconAttr) ?? "";
          return { name, displayName, path, description, iconSmall };
        },
      },
    ],
  };
}

export const skillMentionSpec = createMentionChipSpec("skill-mention");
export const appMentionSpec = createMentionChipSpec("app-mention");
export const pluginMentionSpec = createMentionChipSpec("plugin-mention");

export type Options = MentionPluginHandlers;

export function skillMentionsPlugin(opts: Options = {}): Array<Plugin> {
  return createMentionPlugins({
    key: skillMentionUiKey,
    trigger: "$",
    wordPattern: /(^|\s)(\$[^\s$]*)$/,
    ...opts,
  });
}
