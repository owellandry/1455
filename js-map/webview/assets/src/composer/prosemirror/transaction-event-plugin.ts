import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export const transactionEventKey = new PluginKey("transactionEventPlugin");

type TransactionEventState = {
  eventTarget: EventTarget;
};

export const transactionEventName = "prosemirrorDispatchTransaction";

export function addTransactionListener(view: EditorView, fn: () => void) {
  const { eventTarget } = transactionEventKey.getState(
    view.state,
  ) as TransactionEventState;
  eventTarget.addEventListener(transactionEventName, fn);

  return (): void => {
    eventTarget.removeEventListener(transactionEventName, fn);
  };
}

// Supports creating listener for transaction events
export function transactionEventPlugin(eventTarget: EventTarget): Plugin {
  return new Plugin({
    key: transactionEventKey,
    state: {
      init(): TransactionEventState {
        return {
          eventTarget,
        };
      },
      apply(_tr, value): TransactionEventState {
        return value;
      },
    },
  });
}
