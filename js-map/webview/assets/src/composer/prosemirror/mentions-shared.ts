import { keymap } from "prosemirror-keymap";
import type {
  EditorState,
  PluginKey,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export type MentionUiState = {
  active: boolean;
  anchorPos: number | null;
  query: string;
};

export type MentionPluginHandlers = {
  onSubmit?: () => void;
  onClose?: () => void;
};

type MentionPluginConfig = MentionPluginHandlers & {
  key: PluginKey<MentionUiState>;
  trigger: string;
  wordPattern: RegExp;
};

const initial: MentionUiState = { active: false, anchorPos: null, query: "" };
const scanBack = 50;

function wordBefore(
  state: EditorState,
  matcher: RegExp,
): { text: string; startPos: number } | null {
  const { $from } = state.selection as TextSelection;
  const parent = $from.parent;
  const offset = $from.parentOffset;
  const text = parent.textBetween(
    Math.max(0, offset - scanBack),
    offset,
    undefined,
    "\ufffc",
  );
  const match = matcher.exec(text);
  if (!match) {
    return null;
  }
  const startInParent = offset - match[2].length;
  const startPos = $from.start() + startInParent;
  return { text: match[2], startPos };
}

export function createMentionPlugins(
  config: MentionPluginConfig,
): Array<Plugin> {
  const {
    key,
    trigger,
    wordPattern,
    onSubmit = (): void => {},
    onClose = (): void => {},
  } = config;

  const core = new Plugin<MentionUiState>({
    key,
    state: {
      init: (): MentionUiState => initial,
      apply(
        tr: Transaction,
        prev: MentionUiState,
        _old: EditorState,
        state: EditorState,
      ): MentionUiState {
        let next = prev;
        const meta = tr.getMeta(key) as Partial<MentionUiState> | undefined;
        if (meta) {
          next = { ...next, ...meta };
        }
        if (tr.selectionSet || tr.docChanged) {
          const wb = wordBefore(state, wordPattern);
          if (wb && wb.text.startsWith(trigger)) {
            const query = wb.text.slice(trigger.length);
            const anchorPos = wb.startPos + trigger.length;
            next = { active: true, anchorPos, query };
          } else if (next.active) {
            onClose?.();
            next = initial;
          }
        }
        return next;
      },
    },
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        const st = key.getState(view.state);
        if (!st?.active) {
          return false;
        }

        if (event.key.length === 1 && /\w/.test(event.key)) {
          return false;
        }
        if (event.key === "Backspace") {
          return false;
        }
        return false;
      },
    },
  });

  const closers = keymap({
    Escape: (state, dispatch): boolean => {
      const st = key.getState(state);
      if (st?.active && dispatch !== undefined) {
        dispatch(state.tr.setMeta(key, initial));
        onClose();
        return true;
      }
      return false;
    },
  });

  const submitters = keymap({
    Tab: (state, dispatch): boolean => {
      const st = key.getState(state);
      if (st?.active && dispatch !== undefined) {
        dispatch(state.tr.setMeta(key, initial));
        onSubmit();
        return true;
      }
      return false;
    },
    Enter: (state, dispatch): boolean => {
      const st = key.getState(state);
      if (st?.active && dispatch !== undefined) {
        dispatch(state.tr.setMeta(key, initial));
        onSubmit();
        return true;
      }
      return false;
    },
  });

  return [core, closers, submitters];
}
