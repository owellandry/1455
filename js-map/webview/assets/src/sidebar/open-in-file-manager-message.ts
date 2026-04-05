import { defineMessages, type MessageDescriptor } from "react-intl";

export type OpenInFileManagerPlatform = "linux" | "macOS" | "windows";

export function getOpenInFileManagerMessage(
  platform: OpenInFileManagerPlatform,
): MessageDescriptor {
  switch (platform) {
    case "macOS":
      return messages.finder;
    case "windows":
      return messages.explorer;
    case "linux":
      return messages.fileManager;
  }
}

const messages = defineMessages({
  finder: {
    id: "sidebarElectron.openWorkspaceRootInFinder",
    defaultMessage: "Open in Finder",
    description: "Menu item to open a folder in Finder",
  },
  explorer: {
    id: "sidebarElectron.openWorkspaceRootInExplorer",
    defaultMessage: "Open in Explorer",
    description: "Menu item to open a folder in File Explorer",
  },
  fileManager: {
    id: "sidebarElectron.openWorkspaceRootInFileManager",
    defaultMessage: "Open in File Manager",
    description: "Menu item to open a folder in the system file manager",
  },
});
