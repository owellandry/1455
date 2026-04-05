import type * as AppServer from "app-server-types";
import { z } from "zod";

const mcpToolCallPersistModeSchema = z.enum(["session", "always"]);
const mcpToolCallPersistSchema = z
  .union([
    mcpToolCallPersistModeSchema,
    z.array(mcpToolCallPersistModeSchema).min(1).max(2),
  ])
  .optional();

const toolSuggestionBaseMetaShape = {
  codex_approval_kind: z.literal("tool_suggestion"),
  suggest_type: z.enum(["install", "enable"]),
  suggest_reason: z.string(),
  tool_id: z.string(),
  tool_name: z.string(),
};

const connectorToolSuggestionMetaSchema = z
  .object({
    ...toolSuggestionBaseMetaShape,
    tool_type: z.literal("connector"),
    install_url: z.string(),
  })
  .passthrough();

const pluginToolSuggestionMetaSchema = z
  .object({
    ...toolSuggestionBaseMetaShape,
    tool_type: z.literal("plugin"),
    install_url: z.string().optional(),
  })
  .passthrough();

const toolSuggestionMetaSchema = z.discriminatedUnion("tool_type", [
  connectorToolSuggestionMetaSchema,
  pluginToolSuggestionMetaSchema,
]);

const mcpToolCallMetaSchema = z
  .object({
    codex_approval_kind: z.literal("mcp_tool_call"),
    connector_id: z.string(),
    connector_name: z.string().optional(),
    tool_params: z.record(z.string(), z.json()),
    persist: mcpToolCallPersistSchema,
  })
  .passthrough();

const mcpServerElicitationMetaSchema = z.discriminatedUnion(
  "codex_approval_kind",
  [toolSuggestionMetaSchema, mcpToolCallMetaSchema],
);

export type ToolSuggestionMeta = z.infer<typeof toolSuggestionMetaSchema>;
export type McpToolCallPersistMode = z.infer<
  typeof mcpToolCallPersistModeSchema
>;
export type McpToolCallMeta = z.infer<typeof mcpToolCallMetaSchema>;

export type McpServerElicitation =
  | {
      kind: "toolSuggestion";
      suggestion: ToolSuggestionMeta;
    }
  | {
      kind: "mcpToolCall";
      message: string;
      approval: McpToolCallMeta;
    }
  | {
      kind: "generic";
      message: string;
      serverName: string;
      metadata: AppServer.v2.McpServerElicitationRequestParams["_meta"];
      persist?: McpToolCallMeta["persist"];
      requestedSchema: unknown;
      toolParams: McpToolCallMeta["tool_params"] | null;
    };

export function getMcpServerElicitation(
  params: AppServer.v2.McpServerElicitationRequestParams,
): McpServerElicitation | null {
  if (params.mode !== "form") {
    return null;
  }

  const parsed = mcpServerElicitationMetaSchema.safeParse(params._meta);
  if (parsed.success) {
    switch (parsed.data.codex_approval_kind) {
      case "tool_suggestion":
        return {
          kind: "toolSuggestion",
          suggestion: parsed.data,
        };
      case "mcp_tool_call":
        return {
          kind: "mcpToolCall",
          message: params.message,
          approval: parsed.data,
        };
    }
  }

  const persist = getGenericPersist(params._meta);
  return {
    kind: "generic",
    message: params.message,
    serverName: params.serverName,
    metadata: getGenericMetadata(params._meta),
    ...(persist != null ? { persist } : {}),
    requestedSchema: getRequestedSchema(params),
    toolParams: getGenericToolParams(params._meta),
  };
}

export function buildMcpServerElicitationResponse(
  action: AppServer.v2.McpServerElicitationRequestResponse["action"],
  _meta: AppServer.v2.McpServerElicitationRequestResponse["_meta"] = null,
): AppServer.v2.McpServerElicitationRequestResponse {
  switch (action) {
    case "accept":
      return {
        action,
        content: {},
        _meta,
      };
    case "decline":
    case "cancel":
      return {
        action,
        content: null,
        _meta,
      };
  }
}

function getRequestedSchema(
  params: AppServer.v2.McpServerElicitationRequestParams,
): unknown {
  if ("requestedSchema" in params) {
    return params.requestedSchema;
  }
  return null;
}

function getGenericToolParams(
  meta: AppServer.v2.McpServerElicitationRequestParams["_meta"],
): McpToolCallMeta["tool_params"] | null {
  const parsed = z
    .object({
      tool_params: z.record(z.string(), z.json()),
    })
    .safeParse(meta);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.tool_params;
}

function getGenericMetadata(
  meta: AppServer.v2.McpServerElicitationRequestParams["_meta"],
): AppServer.v2.McpServerElicitationRequestParams["_meta"] {
  if (meta == null || Array.isArray(meta) || typeof meta !== "object") {
    return meta;
  }
  const { persist: _persist, tool_params: _toolParams, ...rest } = meta;
  return Object.keys(rest).length > 0 ? rest : null;
}

function getGenericPersist(
  meta: AppServer.v2.McpServerElicitationRequestParams["_meta"],
): McpToolCallMeta["persist"] {
  const parsed = z
    .object({
      persist: mcpToolCallPersistSchema,
    })
    .safeParse(meta);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data.persist;
}
