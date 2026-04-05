import { useMessage } from "@/message-bus";

/** Listens for the electron Cmd/Ctrl+J menu accelerator to toggle the terminal panel. */
export function useElectronTerminalShortcut(onToggle: () => void): void {
  useMessage(
    "toggle-terminal",
    () => {
      if (__WINDOW_TYPE__ !== "electron") {
        return;
      }
      onToggle();
    },
    [onToggle],
  );
}

/** Listens for the electron Cmd/Ctrl+Alt+B accelerator to toggle the diff panel. */
export function useElectronDiffShortcut(
  onToggle: (open?: boolean) => void,
): void {
  useMessage(
    "toggle-diff-panel",
    (payload) => {
      if (__WINDOW_TYPE__ !== "electron") {
        return;
      }
      onToggle(payload.open);
    },
    [onToggle],
  );
}
