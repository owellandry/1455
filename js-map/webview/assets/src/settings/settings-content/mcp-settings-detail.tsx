import isEqual from "lodash/isEqual";
import type React from "react";
import { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tabs } from "@/components/tabs";
import { CODEX_MCP_URL } from "@/constants/links";
import { SettingsEditRowType } from "@/constants/settings-sections";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import TrashIcon from "@/icons/trash.svg";
import { LoadingPage } from "@/loading-page/loading-page";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsEditRow } from "@/settings/settings-edit-row";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsSurface } from "@/settings/settings-surface";
import type {
  McpServerConfig,
  McpServerStdioConfig,
  McpServerStreamableHttpConfig,
} from "@/types/mcp";

type McpTransportType = "stdio" | "streamable_http";
type SettingsEditRowPair = { key: string; value: string };

type McpSettingsFormState = {
  base: Partial<McpServerConfig>;
  label: string;
  transportType: McpTransportType;
  stdio: {
    command: string;
    args: Array<string>;
    env: Array<SettingsEditRowPair>;
    envVars: Array<string>;
    cwd: string;
  };
  http: {
    url: string;
    bearerTokenEnvVar: string;
    httpHeaders: Array<SettingsEditRowPair>;
    envHttpHeaders: Array<SettingsEditRowPair>;
  };
};

function formatMcpServerName(name: string | undefined): string {
  if (!name) {
    return "";
  }
  if (name.trim().length === 0) {
    return name;
  }
  if (name === name.toLowerCase()) {
    return `${name[0]?.toUpperCase() ?? ""}${name.slice(1)}`;
  }
  return name;
}

export function McpSettingsDetail({
  config,
  initialKey,
  onSave,
  onCancel,
  onUninstall,
}: {
  config: McpServerConfig;
  initialKey: string | null;
  onSave: (config: McpServerConfig, label: string) => void | Promise<void>;
  onCancel: () => void;
  onUninstall?: (label: string) => void | Promise<void>;
}): React.ReactElement {
  const initialState = useMemo<McpSettingsFormState>(
    () => buildInitialState(config, initialKey),
    [config, initialKey],
  );
  const [formState, setFormState] =
    useState<McpSettingsFormState>(initialState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const intl = useIntl();
  const labelTrimmed = formState.label.trim();
  const isDirty = !isEqual(formState, initialState);
  const isRequiredFieldEmpty =
    formState.transportType === "streamable_http"
      ? formState.http.url.trim().length === 0
      : formState.stdio.command.trim().length === 0;

  const handleSave = async (): Promise<void> => {
    if (labelTrimmed.length === 0 || isRequiredFieldEmpty) {
      return;
    }
    setIsLoading(true);
    try {
      const next = buildConfigFromState(formState);
      await onSave(next, formState.label);
    } finally {
      setIsLoading(false);
    }
  };

  const isExistingConfig = config.name && config.name.trim().length > 0;
  const handleUninstall = async (): Promise<void> => {
    if (!onUninstall) {
      return;
    }
    setIsLoading(true);
    try {
      await onUninstall(formState.label);
    } finally {
      setIsLoading(false);
    }
  };

  const title = isExistingConfig ? (
    <FormattedMessage
      id="settings.mcp.detail.titleExisting"
      defaultMessage="Update {name} MCP"
      description="Title for the MCP server detail view when editing an existing server"
      values={{ name: formatMcpServerName(config.name) }}
    />
  ) : (
    <FormattedMessage
      id="settings.mcp.detail.titleNew"
      defaultMessage="Connect to a custom MCP"
      description="Title for the MCP server detail view when adding a new server"
    />
  );

  return (
    <SettingsContentLayout
      backSlot={
        <Button
          color="ghost"
          size="toolbar"
          onClick={(): void => {
            onCancel();
          }}
        >
          <ArrowLeftIcon className="icon-2xs" />
          <FormattedMessage
            id="settings.mcp.detail.back"
            defaultMessage="Back"
            description="Button label to go back to MCP settings"
          />
        </Button>
      }
      title={title}
      subtitle={
        !isExistingConfig ? (
          <a
            className="inline-flex items-center gap-1 text-sm text-token-text-secondary hover:text-token-text-primary"
            href={CODEX_MCP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={intl.formatMessage({
              id: "settings.mcp.detail.docs",
              defaultMessage: "Open MCP documentation",
              description: "Aria label for MCP docs link in detail header",
            })}
          >
            <FormattedMessage
              id="settings.mcp.detail.docs.link"
              defaultMessage="Docs"
              description="Tooltip link label for MCP docs on add page"
            />
            <LinkExternalIcon className="icon-xxs" />
          </a>
        ) : null
      }
      action={
        onUninstall && formState.label.trim().length > 0 ? (
          <Button
            color="danger"
            size="toolbar"
            disabled={isLoading}
            onClick={(): void => {
              void handleUninstall();
            }}
          >
            <TrashIcon className="icon-2xs" />
            <FormattedMessage
              id="settings.mcp.detail.uninstall"
              defaultMessage="Uninstall"
              description="Button label to uninstall an MCP server"
            />
          </Button>
        ) : null
      }
    >
      <div className="relative">
        {isLoading ? <LoadingPage overlay /> : null}
        <SettingsGroup>
          <SettingsGroup.Content>
            {isExistingConfig ? (
              <p className="text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.mcp.detail.switchTransportNotice"
                  defaultMessage="If you would like to switch MCP server type, please uninstall first."
                  description="Notice explaining how to change MCP transport type"
                />
              </p>
            ) : (
              <SettingsSurface>
                <SettingsEditRow
                  title={
                    <FormattedMessage
                      id="settings.mcp.detail.name"
                      defaultMessage="Name"
                      description="Name for MCP server display name"
                    />
                  }
                  value={formState.label}
                  placeHolderValue="MCP server name"
                  inputType={SettingsEditRowType.String}
                  onEdit={(next): void => {
                    setFormState((prev) => ({
                      ...prev,
                      label: next,
                    }));
                  }}
                />
                <Tabs
                  tabs={[
                    {
                      key: "stdio",
                      name: (
                        <FormattedMessage
                          id="settings.mcp.detail.transport.stdio"
                          defaultMessage="STDIO"
                          description="Label for stdio transport toggle"
                        />
                      ),
                    },
                    {
                      key: "streamable_http",
                      name: (
                        <FormattedMessage
                          id="settings.mcp.detail.transport.http"
                          defaultMessage="Streamable HTTP"
                          description="Label for HTTP transport toggle"
                        />
                      ),
                    },
                  ]}
                  selectedKey={formState.transportType}
                  onSelect={(key): void => {
                    setFormState((prev) => ({
                      ...prev,
                      transportType: key as McpTransportType,
                    }));
                  }}
                />
              </SettingsSurface>
            )}

            <SettingsSurface>
              {formState.transportType === "stdio" ? (
                <>
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.command"
                        defaultMessage="Command to launch"
                        description="Label for MCP stdio command"
                      />
                    }
                    value={formState.stdio.command}
                    placeHolderValue="openai-dev-mcp serve-sqlite"
                    inputType={SettingsEditRowType.String}
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        stdio: {
                          ...prev.stdio,
                          command: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.args"
                        defaultMessage="Arguments"
                        description="Label for MCP stdio arguments"
                      />
                    }
                    value={formState.stdio.args}
                    placeHolderValue={[]}
                    inputType={SettingsEditRowType.Array}
                    addLabel={
                      <FormattedMessage
                        id="settings.mcp.detail.addArgument"
                        defaultMessage="Add argument"
                        description="Add button label for MCP stdio arguments"
                      />
                    }
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        stdio: {
                          ...prev.stdio,
                          args: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.envVars"
                        defaultMessage="Environment variables"
                        description="Label for MCP stdio environment variables"
                      />
                    }
                    value={formState.stdio.env}
                    placeHolderValue={[]}
                    inputType={SettingsEditRowType.Record}
                    addLabel={
                      <FormattedMessage
                        id="settings.mcp.detail.addEnvVar"
                        defaultMessage="Add environment variable"
                        description="Add button label for MCP stdio environment variables"
                      />
                    }
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        stdio: {
                          ...prev.stdio,
                          env: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.envVarPassthrough"
                        defaultMessage="Environment variable passthrough"
                        description="Label for MCP stdio env var passthrough"
                      />
                    }
                    value={formState.stdio.envVars}
                    placeHolderValue={[]}
                    inputType={SettingsEditRowType.Array}
                    addLabel={
                      <FormattedMessage
                        id="settings.mcp.detail.addEnvVarPassthrough"
                        defaultMessage="Add variable"
                        description="Add button label for MCP stdio env var passthrough"
                      />
                    }
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        stdio: {
                          ...prev.stdio,
                          envVars: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.cwd"
                        defaultMessage="Working directory"
                        description="Label for MCP stdio working directory"
                      />
                    }
                    value={formState.stdio.cwd}
                    placeHolderValue="~/code"
                    inputType={SettingsEditRowType.String}
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        stdio: {
                          ...prev.stdio,
                          cwd: next,
                        },
                      }));
                    }}
                  />
                </>
              ) : (
                <>
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.http.url"
                        defaultMessage="URL"
                        description="Label for MCP HTTP URL"
                      />
                    }
                    value={formState.http.url}
                    placeHolderValue="https://mcp.example.com/mcp"
                    inputType={SettingsEditRowType.String}
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        http: {
                          ...prev.http,
                          url: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.http.bearerToken"
                        defaultMessage="Bearer token env var"
                        description="Label for MCP HTTP bearer token env var"
                      />
                    }
                    value={formState.http.bearerTokenEnvVar}
                    placeHolderValue="MCP_BEARER_TOKEN"
                    inputType={SettingsEditRowType.String}
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        http: {
                          ...prev.http,
                          bearerTokenEnvVar: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.http.headers"
                        defaultMessage="Headers"
                        description="Label for MCP HTTP headers"
                      />
                    }
                    value={formState.http.httpHeaders}
                    placeHolderValue={[]}
                    inputType={SettingsEditRowType.Record}
                    addLabel={
                      <FormattedMessage
                        id="settings.mcp.detail.http.addHeader"
                        defaultMessage="Add header"
                        description="Add button label for MCP HTTP headers"
                      />
                    }
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        http: {
                          ...prev.http,
                          httpHeaders: next,
                        },
                      }));
                    }}
                  />
                  <SettingsEditRow
                    title={
                      <FormattedMessage
                        id="settings.mcp.detail.http.envHeaders"
                        defaultMessage="Headers from environment variables"
                        description="Label for MCP HTTP env headers"
                      />
                    }
                    value={formState.http.envHttpHeaders}
                    placeHolderValue={[]}
                    inputType={SettingsEditRowType.Record}
                    addLabel={
                      <FormattedMessage
                        id="settings.mcp.detail.http.addEnvHeader"
                        defaultMessage="Add variable"
                        description="Add button label for MCP HTTP env headers"
                      />
                    }
                    onEdit={(next): void => {
                      setFormState((prev) => ({
                        ...prev,
                        http: {
                          ...prev.http,
                          envHttpHeaders: next,
                        },
                      }));
                    }}
                  />
                </>
              )}
            </SettingsSurface>
            <div className="flex justify-end">
              <Button
                color="primary"
                size="toolbar"
                disabled={
                  labelTrimmed.length === 0 ||
                  !isDirty ||
                  isLoading ||
                  isRequiredFieldEmpty
                }
                onClick={handleSave}
              >
                <FormattedMessage
                  id="settings.mcp.detail.save"
                  defaultMessage="Save"
                  description="Save button label on MCP server detail view"
                />
              </Button>
            </div>
          </SettingsGroup.Content>
        </SettingsGroup>
      </div>
    </SettingsContentLayout>
  );
}

function buildInitialState(
  config: McpServerConfig,
  initialKey: string | null,
): McpSettingsFormState {
  const transportType: McpTransportType =
    "command" in config ? "stdio" : "streamable_http";

  return {
    base: {
      enabled: config.enabled,
      startup_timeout_sec: config.startup_timeout_sec,
      startup_timeout_ms: config.startup_timeout_ms,
      tool_timeout_sec: config.tool_timeout_sec,
      enabled_tools: config.enabled_tools,
      disabled_tools: config.disabled_tools,
    },
    label: initialKey ?? config.name ?? "",
    transportType,
    stdio: {
      command: "command" in config ? config.command : "",
      args:
        "command" in config && config.args && config.args.length > 0
          ? config.args
          : [],
      env: "command" in config && config.env ? recordToPairs(config.env) : [],
      envVars:
        "command" in config && config.env_vars && config.env_vars.length > 0
          ? config.env_vars
          : [],
      cwd: "command" in config && config.cwd ? config.cwd : "",
    },
    http: {
      url: "url" in config ? config.url : "",
      bearerTokenEnvVar:
        "url" in config && config.bearer_token_env_var
          ? config.bearer_token_env_var
          : "",
      httpHeaders:
        "url" in config && config.http_headers
          ? recordToPairs(config.http_headers)
          : [],
      envHttpHeaders:
        "url" in config && config.env_http_headers
          ? recordToPairs(config.env_http_headers)
          : [],
    },
  };
}

function buildConfigFromState(state: McpSettingsFormState): McpServerConfig {
  const base = state.base;

  if (state.transportType === "streamable_http") {
    const httpHeaders = pairsToRecord(state.http.httpHeaders);
    const envHttpHeaders = pairsToRecord(state.http.envHttpHeaders);
    const httpConfig: McpServerStreamableHttpConfig = {
      ...base,
      url: state.http.url,
      bearer_token_env_var:
        state.http.bearerTokenEnvVar.trim().length > 0
          ? state.http.bearerTokenEnvVar.trim()
          : undefined,
      http_headers:
        Object.keys(httpHeaders).length > 0 ? httpHeaders : undefined,
      env_http_headers:
        Object.keys(envHttpHeaders).length > 0 ? envHttpHeaders : undefined,
    };
    return httpConfig;
  }

  const env = pairsToRecord(state.stdio.env);
  const envVars = state.stdio.envVars
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const args = state.stdio.args
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  const stdioConfig: McpServerStdioConfig = {
    ...base,
    command: state.stdio.command,
    args: args.length > 0 ? args : undefined,
    env: Object.keys(env).length > 0 ? env : undefined,
    env_vars: envVars.length > 0 ? envVars : undefined,
    cwd: state.stdio.cwd.trim().length > 0 ? state.stdio.cwd.trim() : undefined,
  };
  return stdioConfig;
}

function recordToPairs(
  record: Record<string, string>,
): Array<SettingsEditRowPair> {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return [{ key: "", value: "" }];
  }
  return entries.map(([key, value]) => ({ key, value }));
}

function pairsToRecord(
  entries: Array<SettingsEditRowPair>,
): Record<string, string> {
  const result: Record<string, string> = {};
  entries.forEach(({ key, value }) => {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (trimmedKey.length === 0 || trimmedValue.length === 0) {
      return;
    }
    result[trimmedKey] = trimmedValue;
  });
  return result;
}
