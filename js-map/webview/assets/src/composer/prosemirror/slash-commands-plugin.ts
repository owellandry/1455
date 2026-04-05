import type { Plugin } from "prosemirror-state";
import { PluginKey } from "prosemirror-state";

import type { MentionPluginHandlers, MentionUiState } from "./mentions-shared";
import { createMentionPlugins } from "./mentions-shared";

export const slashCommandUiKey = new PluginKey<MentionUiState>(
  "slash-command-ui",
);

export type Options = MentionPluginHandlers;

export function slashCommandsPlugin(opts: Options = {}): Array<Plugin> {
  return createMentionPlugins({
    key: slashCommandUiKey,
    trigger: "/",
    wordPattern: /(^|\s)(\/[^\s/]*)$/,
    ...opts,
  });
}
