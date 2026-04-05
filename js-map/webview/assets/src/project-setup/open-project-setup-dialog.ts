import { messageBus } from "@/message-bus";

export function openLocalProjectPicker(): void {
  messageBus.dispatchMessage("electron-add-new-workspace-root-option", {});
}

export function openCreateRemoteProjectModal({
  setActive,
}: {
  setActive?: boolean;
} = {}): void {
  messageBus.dispatchHostMessage({
    type: "open-create-remote-project-modal",
    setActive,
  });
}
