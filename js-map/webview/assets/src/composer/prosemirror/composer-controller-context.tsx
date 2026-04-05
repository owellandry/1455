import type { PropsWithChildren, ReactElement } from "react";
import { useLayoutEffect, useMemo } from "react";

import { useEnterBehavior } from "@/hooks/use-enter-behavior";

import { ComposerControllerContext } from "./composer-context";
import { createComposerController } from "./composer-controller";

export function ComposerControllerScope({
  children,
  defaultText,
}: PropsWithChildren<{ defaultText?: string }>): ReactElement {
  const { enterBehavior } = useEnterBehavior();
  const composerController = useMemo(() => {
    return createComposerController(defaultText);
  }, [defaultText]);

  useLayoutEffect((): void => {
    composerController.setEnterBehavior(enterBehavior);
  }, [composerController, enterBehavior]);

  return (
    <ComposerControllerContext.Provider value={composerController}>
      {children}
    </ComposerControllerContext.Provider>
  );
}
