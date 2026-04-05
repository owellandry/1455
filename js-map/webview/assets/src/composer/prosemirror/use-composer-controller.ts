import { useContext, useSyncExternalStore } from "react";

import { ComposerControllerContext } from "./composer-context";
import type { ProseMirrorComposerController } from "./composer-controller";
import { addTransactionListener } from "./transaction-event-plugin";

export const useComposerController = (): ProseMirrorComposerController => {
  const controller = useContext(ComposerControllerContext);
  if (!controller) {
    throw new Error(
      "useComposerController must be used within a ComposerControllerScope",
    );
  }
  return controller;
};

/**
 * This must stay a top-level hook. React Compiler treats
 * `composerController.useState(...)` as a dynamic hook call and will not
 * optimize it.
 */
export const useComposerControllerState = <T>(
  composerController: ProseMirrorComposerController,
  selector: (controller: ProseMirrorComposerController) => T,
): T => {
  return useSyncExternalStore(
    // TODO: Maybe need to subscribe to diff events for prosemirror?
    (subscriptionFn) =>
      addTransactionListener(composerController.view, subscriptionFn),
    () => selector(composerController),
    () => selector(composerController),
  );
};
