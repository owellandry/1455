import { useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useEffect } from "react";

import { useAppServerRegistry } from "./app-server/app-server-manager-hooks";
import { FatalErrorPage } from "./components/fatal-error-page/fatal-error-page";
import { aFatalError } from "./fatal-error-atom";
import { messageBus } from "./message-bus";

export function FatalErrorGate({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const fatalError = useAtomValue(aFatalError);
  const setFatalError = useSetAtom(aFatalError);
  const appServerRegistry = useAppServerRegistry();

  useEffect((): (() => void) => {
    return (): void => {
      setFatalError(null);
    };
  }, [setFatalError]);

  if (fatalError) {
    return (
      <FatalErrorPage
        fatalError={fatalError}
        onReset={() => {
          setFatalError(null);
          appServerRegistry.getAll().forEach((manager) => {
            messageBus.dispatchMessage("codex-app-server-restart", {
              hostId: manager.getHostId(),
              errorMessage: null,
            });
          });
        }}
      />
    );
  }

  return <>{children}</>;
}
