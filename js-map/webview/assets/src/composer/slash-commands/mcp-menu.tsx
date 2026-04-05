import type * as AppServer from "app-server-types";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useIntl, type IntlShape } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import type { McpServers } from "@/types/mcp";

const MICRO_HIDE_CLASS = "max-[220px]:hidden";
const AUTH_HIDE_CLASS = "max-[350px]:hidden";

export function McpMenu({
  serverStatuses,
  serverConfigs,
  isLoading,
  errorMessage,
  onClose,
}: {
  serverStatuses: Array<AppServer.v2.McpServerStatus>;
  serverConfigs: McpServers | null;
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const serverEnabledByName = buildServerEnabledMap(serverConfigs);

  const lines: Array<{
    key: string;
    name: string;
    status: ReactNode | null;
    auth: ReactNode | null;
    spacer?: boolean;
  }> = [];

  const addLine = (
    name: string,
    status: ReactNode | null,
    auth: ReactNode | null,
  ): void => {
    lines.push({
      key: `${lines.length}-line`,
      name,
      status,
      auth,
    });
  };

  if (isLoading) {
    addLine(
      "",
      <div className="flex w-full justify-center">
        <Spinner className="icon-xxs text-token-description-foreground" />
      </div>,
      null,
    );
  } else if (errorMessage) {
    addLine(
      intl.formatMessage({
        id: "composer.mcpStatus.errorLabel",
        defaultMessage: "Status:",
        description: "Label for the MCP error row",
      }),
      errorMessage,
      null,
    );
  } else if (serverStatuses.length === 0) {
    addLine(
      intl.formatMessage({
        id: "composer.mcpStatus.emptyLabel",
        defaultMessage: "Servers:",
        description: "Label for the empty MCP server list",
      }),
      intl.formatMessage({
        id: "composer.mcpStatus.emptyValue",
        defaultMessage: "No MCP servers configured",
        description: "Value shown when there are no MCP servers",
      }),
      null,
    );
  } else {
    const sortedStatuses = [...serverStatuses].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    sortedStatuses.forEach((status) => {
      const enabledLabel = formatEnabledStatus(
        serverEnabledByName[status.name] ?? true,
        intl,
      );
      const authLabel = formatAuthStatus(status.authStatus, intl);
      addLine(status.name, enabledLabel, authLabel);
    });
  }

  return (
    <div className="px-3">
      <div className="flex w-full flex-col gap-3 rounded-t-xl border-x border-t border-token-border bg-token-input-background px-3 py-2 text-sm [text-wrap:pretty] text-token-foreground lg:mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1">
            <span className={clsx("font-semibold", MICRO_HIDE_CLASS)}>
              {intl.formatMessage({
                id: "composer.mcpStatus.heading",
                defaultMessage: "MCP",
                description: "Heading label for the MCP status menu",
              })}
            </span>
          </div>
          <Button size="composerSm" color="ghost" onClick={onClose}>
            {intl.formatMessage({
              id: "composer.mcpStatus.close",
              defaultMessage: "Close",
              description: "Button label to close the MCP status menu",
            })}
          </Button>
        </div>
        <div className="max-h-[200px] overflow-y-auto font-mono text-[11px] leading-relaxed">
          <div className="grid grid-cols-[fit-content(50%)_minmax(0,1fr)] gap-x-4 gap-y-1">
            {lines.map((line) => (
              <div key={line.key} className="contents">
                <div
                  className={clsx(
                    "text-token-description-foreground break-words text-left",
                  )}
                >
                  {line.name}
                </div>
                <div className="text-left text-token-foreground">
                  {renderStatusCell(line.status, line.auth)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAuthStatus(
  status: AppServer.v2.McpAuthStatus,
  intl: IntlShape,
): string {
  if (status === "unsupported") {
    return intl.formatMessage({
      id: "composer.mcpStatus.authUnsupported",
      defaultMessage: "STDIO",
      description: "Auth label when an MCP server uses STDIO transport",
    });
  }
  if (status === "notLoggedIn") {
    return intl.formatMessage({
      id: "composer.mcpStatus.authLoggedOut",
      defaultMessage: "Not authenticated",
      description: "Auth label when the MCP server is not authenticated",
    });
  }
  if (status === "bearerToken") {
    return intl.formatMessage({
      id: "composer.mcpStatus.authToken",
      defaultMessage: "Authenticated (API key)",
      description: "Auth label when using a token-based MCP login",
    });
  }
  return intl.formatMessage({
    id: "composer.mcpStatus.authOauth",
    defaultMessage: "Authenticated (OAuth)",
    description: "Auth label when using OAuth for MCP",
  });
}

function formatEnabledStatus(isEnabled: boolean, intl: IntlShape): string {
  if (isEnabled) {
    return intl.formatMessage({
      id: "composer.mcpStatus.enabled",
      defaultMessage: "Enabled",
      description: "Label when an MCP server is enabled",
    });
  }
  return intl.formatMessage({
    id: "composer.mcpStatus.disabled",
    defaultMessage: "Disabled",
    description: "Label when an MCP server is disabled",
  });
}

function buildServerEnabledMap(
  serverConfigs: McpServers | null,
): Record<string, boolean> {
  const enabledByName: Record<string, boolean> = {};
  if (!serverConfigs) {
    return enabledByName;
  }
  Object.entries(serverConfigs).forEach(([key, config]) => {
    const isEnabled = config.enabled !== false;
    const displayName = config.name ?? key;
    enabledByName[key] = isEnabled;
    enabledByName[displayName] = isEnabled;
  });
  return enabledByName;
}

function renderValueWithMetadata(value: string | null): React.ReactNode {
  if (!value) {
    return null;
  }
  const match = value.match(/^(.*?)(\s*\(.+\))$/);
  if (!match) {
    return value;
  }
  const mainPart = match[1].trimEnd();
  const metadata = match[2].trim();
  return (
    <>
      {mainPart}
      {mainPart && metadata ? " " : null}
      <span
        className="text-token-description-foreground"
        data-chromatic="ignore"
      >
        {metadata}
      </span>
    </>
  );
}

function renderLineValue(value: ReactNode | null): React.ReactNode {
  if (value == null) {
    return renderValueWithMetadata(null);
  }
  if (typeof value === "string") {
    return renderValueWithMetadata(value);
  }
  return value;
}

function renderStatusCell(
  status: ReactNode | null,
  auth: ReactNode | null,
): React.ReactNode {
  if (auth == null) {
    return renderLineValue(status);
  }
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <span className={clsx("min-w-0 truncate", AUTH_HIDE_CLASS)}>
        {renderLineValue(auth)}
      </span>
      <span className="ml-auto shrink-0 text-right">
        {renderLineValue(status)}
      </span>
    </div>
  );
}
