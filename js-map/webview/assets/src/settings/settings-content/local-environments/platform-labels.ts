import { defineMessages } from "react-intl";

export const platformLabels = defineMessages({
  darwin: {
    id: "settings.localEnvironments.actions.item.platforms.macos",
    defaultMessage: "macOS",
    description: "Label for macOS platform toggle",
  },
  linux: {
    id: "settings.localEnvironments.actions.item.platforms.linux",
    defaultMessage: "Linux",
    description: "Label for Linux platform toggle",
  },
  win32: {
    id: "settings.localEnvironments.actions.item.platforms.windows",
    defaultMessage: "Windows",
    description: "Label for Windows platform toggle",
  },
});
