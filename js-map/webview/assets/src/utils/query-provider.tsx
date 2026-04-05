import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";

import { useWindowType } from "@/hooks/use-window-type";
import { messageBus, useMessage } from "@/message-bus";
import { codexQueryClientConfig } from "@/utils/query-client";
import { QueryDevtoolsPanel } from "@/utils/query-devtools-panel";

export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const windowType = useWindowType();
  const [isDevtoolsOpen, setIsDevtoolsOpen] = useState(false);
  useMessage(
    "toggle-query-devtools",
    (): void => {
      setIsDevtoolsOpen((prev): boolean => !prev);
    },
    [],
  );
  const [client] = useState(() => new QueryClient(codexQueryClientConfig));

  useEffect(() => {
    focusManager.setEventListener((setFocused) => {
      if (windowType === "electron") {
        messageBus.dispatchMessage("electron-window-focus-request", {});
        const unsubscribe = messageBus.subscribe(
          "electron-window-focus-changed",
          (message) => {
            setFocused(message.isFocused);
          },
        );
        return (): void => {
          unsubscribe();
        };
      }

      const handleFocus = (): void => {
        setFocused(true);
      };
      const handleBlur = (): void => {
        setFocused(false);
      };
      const handleVisibilityChange = (): void => {
        setFocused(!document.hidden);
      };

      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return (): void => {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };
    });
  }, [windowType]);

  return (
    <QueryClientProvider client={client}>
      {children}
      {__DEV__ ? <QueryDevtoolsPanel isOpen={isDevtoolsOpen} /> : null}
    </QueryClientProvider>
  );
}
