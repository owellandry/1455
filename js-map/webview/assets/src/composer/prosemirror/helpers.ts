import {
  chainCommands,
  createParagraphNear,
  joinBackward,
  liftEmptyBlock,
  splitBlock,
} from "prosemirror-commands";
import type { Node } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";

import { escapePromptLinkPath } from "./prompt-link-path";

export interface ContentToSend {
  content: string;
  metadata?: Record<string, unknown>;
}

export function nodeToPlainText(parentNode: Node | Fragment): ContentToSend {
  let textContent = "";
  let lastNodeParagraph = false;

  function handleNode(node: Node): boolean | undefined {
    lastNodeParagraph = false;
    if (node.type.name === "paragraph") {
      // For paragraph node, manually iterate on all descendants, then append newline
      // Return false below to ensure this happens properly
      node.descendants((n) => handleNode(n));
      textContent += "\n";
      lastNodeParagraph = true;
      return false;
    } else if (node.isText && node.text !== undefined) {
      textContent += node.text;
    } else if (node.type.name === "atMention") {
      textContent += `[${node.attrs.label}](${escapePromptLinkPath(
        node.attrs.path,
      )})`;
    } else if (node.type.name === "agentMention") {
      const displayName =
        typeof node.attrs.displayName === "string" &&
        node.attrs.displayName.length > 0
          ? node.attrs.displayName
          : node.attrs.name;
      textContent += `[@${displayName}](${escapePromptLinkPath(
        node.attrs.path,
      )})`;
    } else if (
      node.type.name === "skillMention" ||
      node.type.name === "appMention" ||
      node.type.name === "pluginMention"
    ) {
      // A stale skill mention stays in the editor, but without a resolved path
      // it should not be emitted into the prompt we send to the model.
      if (
        node.type.name === "skillMention" &&
        typeof node.attrs.path === "string" &&
        node.attrs.path.length === 0
      ) {
        return;
      }
      const prefix = node.type.name === "pluginMention" ? "@" : "$";
      const fallbackName =
        node.type.name === "appMention"
          ? "app"
          : node.type.name === "pluginMention"
            ? "plugin"
            : "skill";
      const mentionName =
        typeof node.attrs.name === "string" ? node.attrs.name : fallbackName;
      textContent += `[${prefix}${mentionName}](${escapePromptLinkPath(
        node.attrs.path,
      )})`;
    }
  }

  parentNode.descendants((node) => handleNode(node));

  // Trim single trailing \n since we always append after parsing a p tag
  if (lastNodeParagraph && textContent.endsWith("\n")) {
    textContent = textContent.slice(0, -1);
  }

  return {
    content: textContent,
    metadata: {},
  };
}

export function prosemirrorToPlainText(view: EditorView): ContentToSend {
  return nodeToPlainText(view.state.doc);
}

export const createLineBreak = chainCommands(
  createParagraphNear,
  liftEmptyBlock,
  splitBlock,
);

export async function insertMultiLineText(
  editorView: EditorView,
  text: string,
): Promise<void> {
  const { schema } = editorView.state;

  // Handle text line-by-line
  const lines = text.split("\n");

  // Step 1. Delete any currently selected text, as we're pasting over it
  editorView.dispatch(editorView.state.tr.deleteSelection());

  // Step 2. Insert first line with insertText to keep it inline with any existing text
  // (i.e. if we're pasting into a promptarea that already has text)
  editorView.dispatch(editorView.state.tr.insertText(lines[0]));

  // Step 3. If we have multiple lines...
  if (lines.length > 1) {
    // Step 3a. Insert newline to handle edge case of pasting leading newline
    createLineBreak(editorView.state, editorView.dispatch);

    // Step 3b. Insert the lines as new lines in a big fragment for perf
    // We don't need to worry about inline positioning here w.r.t. existing lines
    // since we've handled that for first lines
    // We'll clean up positioning of last line at the end
    const linesToInsert = lines.slice(1);

    const fragment = Fragment.fromArray(
      linesToInsert.map((line) =>
        // Errors if we call .text with empty string
        schema.nodes.paragraph.create(
          null,
          line === "" ? null : schema.text(line),
        ),
      ),
    );

    const fragmentSlice = new Slice(fragment, 0, 0);
    editorView.dispatch(editorView.state.tr.replaceSelection(fragmentSlice));

    // Step 3c. Make sure existing text is on same line
    // If we paste inside of a word, i.e. hello^world, this prevents the "world" from being dumped to a new line
    joinBackward(editorView.state, editorView.dispatch, editorView);
  }
}
