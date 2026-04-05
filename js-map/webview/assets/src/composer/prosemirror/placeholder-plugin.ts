import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import "./placeholder-plugin.css";

export const placeholderKey = new PluginKey("placeholderPlugin");

export function placeholderPlugin(placeholderText: string): Plugin {
  return new Plugin({
    key: placeholderKey,
    state: {
      init(): { placeholder: string } {
        return { placeholder: placeholderText };
      },
      apply(tr, value): { placeholder: string } {
        if (tr.getMeta(placeholderKey)) {
          return { placeholder: tr.getMeta(placeholderKey).placeholder };
        }
        return value;
      },
    },
    props: {
      decorations(state): DecorationSet | null {
        const { doc } = state;
        const isDocEmpty =
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock === true &&
          doc.firstChild.content.size === 0;
        if (isDocEmpty) {
          const decorations: Array<Decoration> = [];
          const { placeholder } = placeholderKey.getState(state);

          doc.descendants((node, pos) => {
            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, {
                class: "placeholder",
                "data-placeholder": placeholder,
              }),
            );
          });

          return DecorationSet.create(doc, decorations);
        }
        return null;
      },
    },
  });
}
