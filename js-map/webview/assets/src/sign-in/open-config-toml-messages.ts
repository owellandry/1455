import { defineMessages } from "react-intl";

export const openConfigTomlMessages = defineMessages({
  openConfigToml: {
    id: "codex.profileDropdown.openConfigToml",
    defaultMessage: "Open config.toml",
    description: "Action to open the MCP configuration file",
  },
  openConfigTomlWsl: {
    id: "codex.profileDropdown.openConfigToml.wsl",
    defaultMessage: "Open config.toml in WSL environment",
    description:
      "Action to open the MCP configuration file inside Windows Subsystem for Linux",
  },
});
