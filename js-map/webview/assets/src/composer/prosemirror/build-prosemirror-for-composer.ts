import { baseKeymap, selectAll } from "prosemirror-commands";
import { gapCursor } from "prosemirror-gapcursor";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { ComposerEnterBehavior } from "protocol";

import { atMentionsPlugin, mentionUiKey } from "./at-mentions-plugin";
import { customKeymapPlugin } from "./custom-keymap-plugin";
import {
  createLineBreak,
  insertMultiLineText,
  nodeToPlainText,
} from "./helpers";
import { placeholderPlugin } from "./placeholder-plugin";
import { promptTextToDoc } from "./prompt-text";
import { plainTextSchema } from "./schema";
import {
  skillMentionUiKey,
  skillMentionsPlugin,
} from "./skill-mentions-plugin";
import {
  slashCommandUiKey,
  slashCommandsPlugin,
} from "./slash-commands-plugin";
import {
  transactionEventName,
  transactionEventPlugin,
} from "./transaction-event-plugin";

export class PromptEventEmitter {
  private listeners: Map<string, Set<(eventData?: unknown) => void>> =
    new Map();

  emit(event: string, eventData?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(eventData));
  }

  addListener(event: string, listener: (eventData?: unknown) => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
  }

  removeListener(event: string, listener: (eventData?: unknown) => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.delete(listener);
    this.listeners.set(event, set);
  }
}

export type ProsemirrorComposerEnterBehavior =
  | ComposerEnterBehavior
  | "newline";

export function buildProsemirrorForComposer(
  defaultText: string | null = null,
  {
    defaultTextKind = "plain",
    enableFileMentions = true,
    enableSkillMentions = true,
    enterBehavior = "enter",
  }: {
    defaultTextKind?: "plain" | "prompt";
    enableFileMentions?: boolean;
    enableSkillMentions?: boolean;
    enterBehavior?: ProsemirrorComposerEnterBehavior;
  } = {},
): {
  view: EditorView;
  eventEmitter: PromptEventEmitter;
  setEnterBehavior: (behavior: ProsemirrorComposerEnterBehavior) => void;
} {
  const eventTarget = new EventTarget();
  const eventEmitter = new PromptEventEmitter();
  let currentEnterBehavior: ProsemirrorComposerEnterBehavior = enterBehavior;

  const view = new EditorView(null, {
    state: EditorState.create({
      schema: plainTextSchema,
      doc:
        defaultText != null && defaultTextKind === "prompt"
          ? promptTextToDoc({ schema: plainTextSchema, text: defaultText })
          : undefined,
      plugins: [
        // Note: the order of these plugins is important, as plugins earlier in
        // this list will consume events before plugins later in the list.
        history(),
        customKeymapPlugin(),
        // Must stay before keymap to intercept tab/enter
        ...(enableFileMentions
          ? atMentionsPlugin({
              onSubmit() {
                eventEmitter.emit("mention-ui-submit");
              },
              onClose() {
                eventEmitter.emit("mention-ui-close");
              },
            })
          : []),
        ...(enableSkillMentions
          ? skillMentionsPlugin({
              onSubmit() {
                eventEmitter.emit("skill-mention-ui-submit");
              },
              onClose() {
                eventEmitter.emit("skill-mention-ui-close");
              },
            })
          : []),
        ...slashCommandsPlugin({
          onSubmit() {
            eventEmitter.emit("slash-command-ui-submit");
          },
          onClose() {
            eventEmitter.emit("slash-command-ui-close");
          },
        }),
        keymap({
          ...baseKeymap,
          ArrowDown: (state): boolean => {
            // Prevent arrow down from moving the cursor to the end of placeholder text.
            const doc = state.doc;
            const firstChild = doc.firstChild;
            return (
              doc.childCount === 1 &&
              firstChild != null &&
              firstChild.isTextblock &&
              firstChild.content.size === 0
            );
          },
          "Shift-Enter": (state, dispatch): boolean => {
            return createLineBreak(state, dispatch);
          },
          "Alt-Enter": (state, dispatch): boolean => {
            return createLineBreak(state, dispatch);
          },
          Enter: (state, dispatch): boolean => {
            const mentionState = mentionUiKey.getState(state);
            const skillMentionState = skillMentionUiKey.getState(state);
            const slashCommandState = slashCommandUiKey.getState(state);
            if (
              mentionState?.active ||
              skillMentionState?.active ||
              slashCommandState?.active
            ) {
              return true;
            }

            if (currentEnterBehavior === "newline") {
              return createLineBreak(state, dispatch);
            }

            const isMultiline = state.doc.childCount > 1;
            if (currentEnterBehavior === "cmdIfMultiline" && isMultiline) {
              return createLineBreak(state, dispatch);
            }

            eventEmitter.emit("submit");
            return true;
          },
          "Mod-Enter": (): boolean => {
            eventEmitter.emit("submit");
            return true;
          },
          "Mod-a": selectAll,
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-Shift-z": redo,
        }),
        transactionEventPlugin(eventTarget),
        placeholderPlugin(""),
        gapCursor(),
      ],
    }),
    dispatchTransaction(transaction): void {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
      // Notify listeners subscribed via transactionEventPlugin
      eventTarget.dispatchEvent(new Event(transactionEventName));
    },

    // Base prosemirror collapses newlines / eats leading spaces
    // This helps us handle that
    handlePaste(view, event): boolean {
      if (event.defaultPrevented) {
        return true;
      }

      const dt = event.clipboardData;
      const imageFiles = Array.from(dt?.items ?? [])
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter((file): file is File => file != null);
      if (imageFiles.length > 0) {
        eventEmitter.emit("pasted-images", imageFiles);
        return true;
      }

      const text = dt?.getData("text/plain");
      if (text == null) {
        return false;
      }

      void insertMultiLineText(view, text);
      return true;
    },
    clipboardTextSerializer(content): string {
      return nodeToPlainText(content.content).content;
    },
  });

  if (
    defaultText != null &&
    defaultTextKind === "plain" &&
    view.state.doc.textContent.trim().length === 0
  ) {
    const tr = view.state.tr.insertText(defaultText);
    tr.setSelection(TextSelection.create(tr.doc, defaultText.length + 1));
    view.dispatch(tr);
  }

  if (defaultText != null && defaultTextKind === "prompt") {
    view.dispatch(
      view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)),
    );
  }

  return {
    view,
    eventEmitter,
    setEnterBehavior: (behavior): void => {
      currentEnterBehavior = behavior;
    },
  };
}
