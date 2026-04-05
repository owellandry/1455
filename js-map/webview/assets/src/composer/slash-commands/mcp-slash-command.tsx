import { useState } from "react";
import { useIntl } from "react-intl";

import McpIcon from "@/icons/mcp.svg";
import {
  useListMcpServersStatus,
  useMcpServers,
} from "@/queries/config-queries";

import { McpMenu } from "./mcp-menu";
import { useProvideSlashCommand } from "./slash-command";

export function McpSlashCommand(): React.ReactElement | null {
  const intl = useIntl();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    data: serverStatusResponse,
    isLoading,
    error,
  } = useListMcpServersStatus();
  const { data: serverConfigResponse } = useMcpServers(null);

  useProvideSlashCommand({
    id: "mcp",
    title: intl.formatMessage({
      id: "composer.mcpSlashCommand.title",
      defaultMessage: "MCP",
      description: "Title for the MCP slash command",
    }),
    description: intl.formatMessage({
      id: "composer.mcpSlashCommand.description",
      defaultMessage: "Show MCP server status",
      description: "Description for the MCP slash command",
    }),
    requiresEmptyComposer: false,
    Icon: McpIcon,
    onSelect: async (): Promise<void> => {
      setIsMenuOpen(true);
    },
  });

  if (!isMenuOpen) {
    return null;
  }

  const serverStatuses = serverStatusResponse?.data ?? [];
  const serverConfigs = serverConfigResponse?.servers ?? null;
  const errorMessage =
    error != null
      ? intl.formatMessage({
          id: "composer.mcpStatus.errorValue",
          defaultMessage: "Unable to load MCP status",
          description: "Value shown when MCP status loading fails",
        })
      : null;

  return (
    <McpMenu
      serverStatuses={serverStatuses}
      serverConfigs={serverConfigs}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onClose={() => {
        setIsMenuOpen(false);
      }}
    />
  );
}
