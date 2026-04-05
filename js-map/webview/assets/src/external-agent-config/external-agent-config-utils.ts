import type * as AppServer from "app-server-types";
import sortBy from "lodash/sortBy";
import type { IntlShape } from "react-intl";

export function getExternalAgentConfigItemTitle(
  intl: IntlShape,
  item: AppServer.v2.ExternalAgentConfigMigrationItem,
): string {
  switch (item.itemType) {
    case "AGENTS_MD":
      return intl.formatMessage({
        id: "externalAgentConfig.itemType.agentsMd",
        defaultMessage: "AGENTS.md",
        description: "Label for AGENTS.md external agent config migration item",
      });
    case "CONFIG":
      return intl.formatMessage({
        id: "externalAgentConfig.itemType.config",
        defaultMessage: "Config",
        description: "Label for config external agent config migration item",
      });
    case "SKILLS":
      return intl.formatMessage({
        id: "externalAgentConfig.itemType.skills",
        defaultMessage: "Skills",
        description: "Label for skills external agent config migration item",
      });
    case "MCP_SERVER_CONFIG":
      return "";
  }
}

export function sortExternalAgentConfigItems(
  items: Array<AppServer.v2.ExternalAgentConfigMigrationItem>,
): Array<AppServer.v2.ExternalAgentConfigMigrationItem> {
  return sortBy(items, ({ itemType }) => {
    switch (itemType) {
      case "CONFIG":
        return 0;
      case "SKILLS":
        return 1;
      case "AGENTS_MD":
        return 2;
      case "MCP_SERVER_CONFIG":
        return 3;
    }
  });
}
