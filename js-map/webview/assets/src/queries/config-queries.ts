import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import type { ConfigWriteResponse } from "app-server-types/v2";
import type { JsonValue, LocalCustomAgentMetadata } from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import type { McpServerConfig, McpServers } from "@/types/mcp";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

export type {
  McpServerBaseConfig,
  McpServerConfig,
  McpServers,
  McpServerStdioConfig,
  McpServerStreamableHttpConfig,
} from "@/types/mcp";

export const MCP_SERVERS_QUERY_KEY: Array<string> = [
  "config",
  "mcp",
  "servers",
];
export const USER_CONFIG_QUERY_KEY: Array<string> = ["config", "user"];
export const ANALYTICS_SETTING_QUERY_KEY: Array<string> = [
  "config",
  "analytics",
];
export const CONFIG_REQUIREMENTS_QUERY_KEY: Array<string> = [
  "config",
  "requirements",
];
export const EFFECTIVE_CONFIG_QUERY_KEY: Array<string> = [
  "config",
  "effective",
];
export const MCP_SERVERS_STATUS_QUERY_KEY: Array<string> = [
  "mcp",
  "servers",
  "status",
];

export type ConfigWriteTarget = {
  filePath: string;
  expectedVersion: string | null;
};

export type McpServersQueryData = {
  servers: McpServers;
  configWriteTarget: ConfigWriteTarget | null;
  serverOrigins: Record<string, AppServer.v2.ConfigLayerMetadata | null>;
};

export type UserConfigQueryData = {
  config: AppServer.v2.Config;
  configWriteTarget: ConfigWriteTarget | null;
};

export type EffectiveConfigQueryData = {
  config: AppServer.v2.Config;
  origins: AppServer.v2.ConfigReadResponse["origins"];
  layers: AppServer.v2.ConfigReadResponse["layers"];
};

export type ConfiguredAgentRolesQueryData = {
  roles: Array<LocalCustomAgentMetadata>;
};

const DEFAULT_APPS_CONFIG_ENTRY = {
  enabled: true,
  destructive_enabled: false,
  open_world_enabled: false,
  default_tools_approval_mode: null,
  default_tools_enabled: null,
  tools: null,
};

const DEFAULT_CONFIG: AppServer.v2.ConfigReadResponse = {
  config: {
    model: null,
    review_model: null,
    model_context_window: null,
    model_auto_compact_token_limit: null,
    model_provider: null,
    approval_policy: null,
    approvals_reviewer: null,
    sandbox_mode: null,
    sandbox_workspace_write: null,
    forced_chatgpt_workspace_id: null,
    forced_login_method: null,
    web_search: null,
    tools: null,
    profile: null,
    profiles: {},
    instructions: null,
    developer_instructions: null,
    compact_prompt: null,
    model_reasoning_effort: null,
    model_reasoning_summary: null,
    service_tier: null,
    model_verbosity: null,
    analytics: null,
    mcp_servers: {},
    apps: { _default: DEFAULT_APPS_CONFIG_ENTRY },
  },
  origins: {},
  layers: null,
};

export function useMcpServers(
  cwd: string | null,
  options?: {
    enabled?: boolean;
  },
): UseQueryResult<McpServersQueryData, Error> {
  const appServerManager = useDefaultAppServerManager();
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const resolvedCwd = cwd ?? workspaceRoots?.roots?.[0] ?? null;
  const enabled = options?.enabled ?? true;
  return useQuery<
    AppServer.v2.ConfigReadResponse,
    Error,
    McpServersQueryData,
    Array<string | null>
  >({
    queryKey: [...MCP_SERVERS_QUERY_KEY, resolvedCwd],
    queryFn: async (): Promise<AppServer.v2.ConfigReadResponse> => {
      try {
        return appServerManager.readConfig({
          includeLayers: true,
          cwd: resolvedCwd,
        });
      } catch (error) {
        logger.error(`Failed to load MCP servers`, {
          safe: {},
          sensitive: { error: error },
        });
        return DEFAULT_CONFIG;
      }
    },
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    enabled,
    select: ({ config, origins, layers }): McpServersQueryData => {
      const servers = extractMcpServers(config);
      return {
        servers,
        configWriteTarget: resolveConfigWriteTarget({
          layers,
          origins,
          keyPath: "mcp_servers",
        }),
        serverOrigins: resolveChildOrigins({
          origins,
          rootKey: "mcp_servers",
          childKeys: Object.keys(servers),
          probeFields: ["enabled", "command", "url"],
        }),
      };
    },
  });
}

export function useUserConfig(): UseQueryResult<UserConfigQueryData, Error> {
  const appServerManager = useDefaultAppServerManager();

  return useQuery<
    AppServer.v2.ConfigReadResponse,
    Error,
    UserConfigQueryData,
    Array<string>
  >({
    queryKey: USER_CONFIG_QUERY_KEY,
    queryFn: async (): Promise<AppServer.v2.ConfigReadResponse> => {
      try {
        return await appServerManager.readConfig({
          includeLayers: true,
          // Settings panel shows global config, not project-layered overrides,
          // so we'll pass null for cwd here.
          // If we change this in the future, we'll need to decide how edits should
          // be applied (e.g. to project layer vs. user layer).
          cwd: null,
        });
      } catch (error) {
        logger.error(`Failed to load config`, {
          safe: {},
          sensitive: { error: error },
        });
        return DEFAULT_CONFIG;
      }
    },
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    select: ({ config, layers }): UserConfigQueryData => ({
      config,
      configWriteTarget: resolveUserConfigWriteTarget(layers),
    }),
  });
}

export function useAnalyticsEnabled(
  enabled = true,
): UseQueryResult<boolean, Error> {
  const appServerManager = useDefaultAppServerManager();

  return useQuery({
    queryKey: ANALYTICS_SETTING_QUERY_KEY,
    queryFn: (): Promise<AppServer.v2.ConfigReadResponse> =>
      appServerManager.readConfig({ includeLayers: false, cwd: null }),
    staleTime: Infinity,
    enabled,
    // `analytics.enabled` is nullable; treat null/undefined as "default enabled".
    // Only an explicit `false` disables analytics.
    select: ({ config }) => config.analytics?.enabled !== false,
  });
}

export function useEffectiveConfig(
  cwd?: string | null,
  options?: {
    appServerManager?: AppServerManager;
    // Most callers want null cwd to fall back to the active local workspace.
    // Some override flows, like remote draft permissions resolution, need null
    // to stay unresolved so we do not accidentally query config for the local
    // workspace under a remote manager.
    cwdMode?: "fallback-to-workspace" | "preserve-null";
    enabled?: boolean;
  },
): UseQueryResult<EffectiveConfigQueryData, Error> {
  const defaultAppServerManager = useDefaultAppServerManager();
  const appServerManager = options?.appServerManager ?? defaultAppServerManager;
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const resolvedCwd =
    options?.cwdMode === "preserve-null"
      ? (cwd ?? null)
      : (cwd ?? workspaceRoots?.roots?.[0] ?? null);

  return useQuery<
    AppServer.v2.ConfigReadResponse,
    Error,
    EffectiveConfigQueryData,
    Array<string | null>
  >({
    queryKey: [
      ...EFFECTIVE_CONFIG_QUERY_KEY,
      appServerManager.getHostId(),
      resolvedCwd,
    ],
    queryFn: async (): Promise<AppServer.v2.ConfigReadResponse> => {
      try {
        return await appServerManager.readConfig({
          includeLayers: true,
          cwd: resolvedCwd,
        });
      } catch (error) {
        logger.error(`Failed to load effective config`, {
          safe: {},
          sensitive: { error },
        });
        return DEFAULT_CONFIG;
      }
    },
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    enabled: options?.enabled ?? true,
    select: ({ config, origins, layers }): EffectiveConfigQueryData => ({
      config,
      origins,
      layers,
    }),
  });
}

export function useConfigRequirements(options?: {
  appServerManager?: AppServerManager;
}): UseQueryResult<AppServer.v2.ConfigRequirementsReadResponse, Error> {
  const defaultAppServerManager = useDefaultAppServerManager();
  const appServerManager = options?.appServerManager ?? defaultAppServerManager;

  return useQuery<
    AppServer.v2.ConfigRequirementsReadResponse,
    Error,
    AppServer.v2.ConfigRequirementsReadResponse,
    Array<string>
  >({
    queryKey: [...CONFIG_REQUIREMENTS_QUERY_KEY, appServerManager.getHostId()],
    queryFn: async (): Promise<AppServer.v2.ConfigRequirementsReadResponse> => {
      try {
        return await appServerManager.getConfigRequirements();
      } catch (error) {
        logger.error(`Failed to load config requirements`, {
          safe: {},
          sensitive: {
            error: error,
          },
        });
        // We fail open here and have CLI handle invalid sandbox and approval configs on conversation events.
        return {
          requirements: null,
        };
      }
    },
    staleTime: QUERY_STALE_TIME.INFINITE,
  });
}

export function useConfiguredAgentRoles(
  rootsOverride?: Array<string> | null,
  enabled = true,
): UseQueryResult<ConfiguredAgentRolesQueryData, Error> {
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const roots = rootsOverride ?? workspaceRoots?.roots ?? [];

  return useFetchFromVSCode("local-custom-agents", {
    params: { roots },
    queryConfig: {
      enabled,
      staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    },
    select: (data): ConfiguredAgentRolesQueryData => ({
      roles: data.agents,
    }),
  });
}

export function useAddMcpServer(): UseMutationResult<
  ConfigWriteResponse,
  Error,
  {
    filePath: string | null;
    expectedVersion: string | null;
    edits: Array<AppServer.v2.ConfigEdit>;
  }
> {
  const appServerManager = useDefaultAppServerManager();

  return useMutation({
    mutationFn: ({
      filePath,
      expectedVersion,
      edits,
    }: {
      filePath: string | null;
      expectedVersion: string | null;
      edits: Array<AppServer.v2.ConfigEdit>;
    }) => {
      try {
        return appServerManager.batchWriteConfigValue({
          edits: edits.map((edit) => ({
            ...edit,
            mergeStrategy: edit.mergeStrategy ?? "upsert",
          })),
          filePath,
          expectedVersion,
        });
      } catch (error) {
        logger.error(`Failed to add MCP server`, {
          safe: {},
          sensitive: { error: error },
        });
        throw error;
      }
    },
  });
}

export function useUpdateMcpServerEnabled(): UseMutationResult<
  ConfigWriteResponse,
  Error,
  { key: string; enabled: boolean }
> {
  const appServerManager = useDefaultAppServerManager();

  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => {
      try {
        return appServerManager.writeConfigValue({
          keyPath: `mcp_servers.${key}.enabled`,
          value: enabled,
          mergeStrategy: "upsert",
          filePath: null,
          expectedVersion: null,
        });
      } catch (error) {
        logger.error(`Failed to update MCP server enabled state`, {
          safe: {},
          sensitive: {
            error: error,
          },
        });
        throw error;
      }
    },
  });
}

export function useListMcpServersStatus(
  enabled = true,
): UseQueryResult<AppServer.v2.ListMcpServerStatusResponse, Error> {
  const appServerManager = useDefaultAppServerManager();
  return useQuery<
    AppServer.v2.ListMcpServerStatusResponse,
    Error,
    AppServer.v2.ListMcpServerStatusResponse,
    Array<string>
  >({
    queryKey: MCP_SERVERS_STATUS_QUERY_KEY,
    queryFn: async (): Promise<AppServer.v2.ListMcpServerStatusResponse> =>
      appServerManager.listMcpServers({
        cursor: null,
        limit: 100,
      }),
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    enabled,
  });
}

export function getFilePathForLayerSource(
  source: AppServer.v2.ConfigLayerSource,
): string | null {
  if (
    source.type === "user" ||
    source.type === "system" ||
    source.type === "legacyManagedConfigTomlFromFile"
  ) {
    return source.file;
  }
  if (source.type === "project") {
    return `${source.dotCodexFolder}/config.toml`;
  }

  return null;
}

export function isManagedConfigLayerSource(
  source: AppServer.v2.ConfigLayerSource | null | undefined,
): boolean {
  if (source == null) {
    return false;
  }

  return (
    source.type === "mdm" ||
    source.type === "sessionFlags" ||
    source.type === "legacyManagedConfigTomlFromFile" ||
    source.type === "legacyManagedConfigTomlFromMdm"
  );
}

export function resolveKeyOrigin(
  origins: AppServer.v2.ConfigReadResponse["origins"],
  keyPath: string,
  probeFields: Array<string> = [],
): AppServer.v2.ConfigLayerMetadata | null {
  const directOrigin = origins?.[keyPath] ?? null;
  if (directOrigin != null) {
    return directOrigin;
  }

  for (const probeField of probeFields) {
    const probedOrigin = origins?.[`${keyPath}.${probeField}`];
    if (probedOrigin != null) {
      return probedOrigin;
    }
  }

  return null;
}

export function resolveUserConfigWriteTarget(
  layers: AppServer.v2.ConfigReadResponse["layers"],
): ConfigWriteTarget | null {
  const userLayer = layers?.find((layer) => layer.name.type === "user") ?? null;
  if (!userLayer) {
    return null;
  }

  const filePath = getFilePathForLayerSource(userLayer.name);
  if (!filePath) {
    return null;
  }

  return {
    filePath,
    expectedVersion: userLayer.version,
  };
}

export function resolveConfigWriteTarget({
  layers,
  origins,
  keyPath,
  probeFields = [],
}: {
  layers: AppServer.v2.ConfigReadResponse["layers"];
  origins: AppServer.v2.ConfigReadResponse["origins"];
  keyPath: string;
  probeFields?: Array<string>;
}): ConfigWriteTarget | null {
  const userLayer = layers?.find((layer) => layer.name.type === "user") ?? null;
  if (userLayer) {
    const filePath = getFilePathForLayerSource(userLayer.name);
    if (!filePath) {
      return null;
    }
    return {
      filePath,
      expectedVersion: userLayer.version,
    };
  }

  const origin = resolveKeyOrigin(origins, keyPath, probeFields);
  if (origin) {
    if (isManagedConfigLayerSource(origin.name)) {
      return null;
    }

    if (origin.name.type === "system") {
      return resolveUserConfigWriteTarget(layers);
    }

    const filePath = getFilePathForLayerSource(origin.name);
    if (!filePath) {
      return resolveUserConfigWriteTarget(layers);
    }
    return {
      filePath,
      expectedVersion: origin.version,
    };
  }

  const fallbackLayer = layers?.[0] ?? null;
  if (fallbackLayer) {
    const filePath = getFilePathForLayerSource(fallbackLayer.name);
    if (!filePath) {
      return null;
    }
    return {
      filePath,
      expectedVersion: fallbackLayer.version,
    };
  }

  return null;
}

function resolveChildOrigins({
  origins,
  rootKey,
  childKeys,
  probeFields,
}: {
  origins: AppServer.v2.ConfigReadResponse["origins"];
  rootKey: string;
  childKeys: Array<string>;
  probeFields: Array<string>;
}): Record<string, AppServer.v2.ConfigLayerMetadata | null> {
  const resolved: Record<string, AppServer.v2.ConfigLayerMetadata | null> = {};
  childKeys.forEach((childKey) => {
    const baseKeyPath = `${rootKey}.${childKey}`;
    const origin =
      origins?.[baseKeyPath] ??
      probeFields
        .map((field) => origins?.[`${baseKeyPath}.${field}`])
        .find(Boolean) ??
      null;
    resolved[childKey] = origin ?? null;
  });
  return resolved;
}

function extractMcpServers(config: JsonValue): McpServers {
  if (config == null || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  const configRecord = config as Record<string, unknown>;
  const mcpServers =
    configRecord.mcp_servers ??
    // Fallback for potential camel-cased configs.
    configRecord.mcpServers;

  if (
    mcpServers == null ||
    typeof mcpServers !== "object" ||
    Array.isArray(mcpServers)
  ) {
    return {};
  }

  const entries = Object.entries(mcpServers as Record<string, unknown>);
  const result: McpServers = {};
  entries.forEach(([key, value]) => {
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      const configValue = value as McpServerConfig;
      result[key] = {
        ...configValue,
        name:
          typeof configValue.name === "string" && configValue.name.length > 0
            ? configValue.name
            : key,
      };
      return;
    }

    result[key] = { name: key } as McpServerConfig;
  });

  return result;
}
