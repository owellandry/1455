import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export const customKeymapPluginKey = new PluginKey("customKeymapPlugin");

type KeyboardEventHandlerWithBool = (e: KeyboardEvent) => boolean;
export type CustomKeymapPluginState = {
  handlerSubscriptions: Record<
    string,
    Partial<Record<string, KeyboardEventHandlerWithBool>>
  >;
  handlers: Partial<Record<string, KeyboardEventHandlerWithBool>>;
};

type CustomKeymapPluginMeta =
  | {
      type: "addHandlers";
      subscriptionId: string;
      handlers: Partial<Record<string, KeyboardEventHandlerWithBool>>;
    }
  | {
      type: "removeHandlers";
      subscriptionId: string;
    };

let nextCustomKeymapSubscriptionId = 0;

function buildHandlers(
  handlerSubscriptions: Record<
    string,
    Partial<Record<string, KeyboardEventHandlerWithBool>>
  >,
): Partial<Record<string, KeyboardEventHandlerWithBool>> {
  const combinedHandlers: Partial<
    Record<string, KeyboardEventHandlerWithBool>
  > = {};

  for (const subscriptionHandlers of Object.values(handlerSubscriptions)) {
    if (!subscriptionHandlers) {
      continue;
    }

    for (const [key, handler] of Object.entries(subscriptionHandlers)) {
      if (!handler) {
        continue;
      }

      combinedHandlers[key] = handler;
    }
  }

  return combinedHandlers;
}

/**
 * @returns an unsubscribe function
 */
export function setCustomKeymapHandlers(
  editorView: EditorView,
  handlers: Partial<Record<string, KeyboardEventHandlerWithBool>>,
): () => void {
  const subscriptionId = `custom-keymap-subscription-${nextCustomKeymapSubscriptionId}`;
  nextCustomKeymapSubscriptionId += 1;

  editorView.dispatch(
    editorView.state.tr.setMeta(customKeymapPluginKey, {
      handlers,
      subscriptionId,
      type: "addHandlers",
    } satisfies CustomKeymapPluginMeta),
  );

  let isSubscribed = true;

  return () => {
    if (!isSubscribed) {
      return;
    }

    isSubscribed = false;

    const pluginState = customKeymapPluginKey.getState(editorView.state) as
      | CustomKeymapPluginState
      | undefined;

    if (!pluginState?.handlerSubscriptions[subscriptionId]) {
      return;
    }

    editorView.dispatch(
      editorView.state.tr.setMeta(customKeymapPluginKey, {
        subscriptionId,
        type: "removeHandlers",
      } satisfies CustomKeymapPluginMeta),
    );
  };
}

export function customKeymapPlugin(
  initState: Partial<CustomKeymapPluginState> = {},
): Plugin {
  return new Plugin({
    key: customKeymapPluginKey,
    state: {
      init(): CustomKeymapPluginState {
        return {
          handlerSubscriptions: {},
          handlers: {},
          ...initState,
        };
      },
      apply(tr, currentPluginState): CustomKeymapPluginState {
        const meta = tr.getMeta(customKeymapPluginKey) as
          | CustomKeymapPluginMeta
          | undefined;

        if (meta?.type === "addHandlers") {
          const handlerSubscriptions = {
            ...currentPluginState.handlerSubscriptions,
            [meta.subscriptionId]: meta.handlers,
          };

          return {
            handlerSubscriptions,
            handlers: buildHandlers(handlerSubscriptions),
          };
        }

        if (meta?.type === "removeHandlers") {
          if (!currentPluginState.handlerSubscriptions[meta.subscriptionId]) {
            return currentPluginState;
          }

          const { [meta.subscriptionId]: _removed, ...remainingSubscriptions } =
            currentPluginState.handlerSubscriptions;

          return {
            handlerSubscriptions: remainingSubscriptions,
            handlers: buildHandlers(remainingSubscriptions),
          };
        }

        return currentPluginState;
      },
    },
    props: {
      handleKeyDown(view, event): boolean {
        const pluginState: CustomKeymapPluginState =
          customKeymapPluginKey.getState(view.state);

        const handler = pluginState.handlers[event.key];
        return handler ? handler(event) : false;
      },
    },
  });
}
