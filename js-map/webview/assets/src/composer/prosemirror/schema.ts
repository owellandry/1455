import { Schema } from "prosemirror-model";

import { agentMentionSpec, atMentionSpec } from "./at-mentions-plugin";
import {
  appMentionSpec,
  pluginMentionSpec,
  skillMentionSpec,
} from "./skill-mentions-plugin";

export const plainTextSchema = new Schema({
  nodes: {
    doc: {
      content: "paragraph+",
    },
    paragraph: {
      // Allow text and any inline node (e.g., atMention)
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM(): [string, number] {
        return ["p", 0];
      },
    },
    text: {
      group: "inline",
    },
    atMention: atMentionSpec,
    agentMention: agentMentionSpec,
    skillMention: skillMentionSpec,
    appMention: appMentionSpec,
    pluginMention: pluginMentionSpec,
  },
  marks: {},
});
