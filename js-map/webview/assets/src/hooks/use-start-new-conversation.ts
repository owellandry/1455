import { useCallback } from "react";
import { useNavigate } from "react-router";

import type { HomeLocationState } from "@/home-page";
import { initialRoute } from "@/initial-route-atom";
import { messageBus } from "@/message-bus";

/**
 * Returns a handler that opens a new conversation, dispatching the VS Code command when embedded.
 */
export function useStartNewConversation(): (
  state?: Omit<HomeLocationState, "focusComposerNonce">,
  options?: { startInSidebar?: boolean },
) => void {
  const navigate = useNavigate();

  return useCallback(
    (stateOverrides, options) => {
      const state: HomeLocationState = {
        ...stateOverrides,
        focusComposerNonce: Date.now(),
      };
      if (initialRoute) {
        if (options?.startInSidebar) {
          messageBus.dispatchMessage("open-vscode-command", {
            command: "chatgpt.newChat",
          });
          if (state.prefillPrompt?.trim()) {
            messageBus.dispatchMessage("shared-object-set", {
              key: "composer_prefill",
              value: {
                text: state.prefillPrompt,
                cwd: state.prefillCwd ?? null,
              },
            });
          }
        } else {
          messageBus.dispatchMessage("open-vscode-command", {
            command: "chatgpt.newCodexPanel",
          });
        }
        return;
      }
      void navigate("/", { state });
    },
    [navigate],
  );
}
