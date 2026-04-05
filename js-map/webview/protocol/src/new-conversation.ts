import type * as AppServer from "app-server-types";

import type { PermissionsConfig } from "./permissions-config";
import {
  APPROVALS_REVIEWER_USER,
  getSandboxModeForPolicy,
} from "./permissions-config";
import type { JsonValue } from "./types/json-value";

export type CodexConfig = { [key in string]?: JsonValue };
export type FetchCodexConfig = () => Promise<CodexConfig | null>;

export const COPILOT_MODEL_PROVIDER_ID = "codex_vscode_copilot";
export const COPILOT_MODEL_PROVIDER_PRESENTATION_NAME = "Copilot";

/**
 * `workspaceRoots` must contain at least one entry or `cwd` will be invalid.
 *
 * Further, `workspaceRoots` should be derived from `getActiveWorkspaceRoots()` or
 * the `"active-workspace-roots"` fetch handler to ensure proper WSL path conversion.
 */
export async function buildNewConversationParams(
  model: string | null,
  serviceTier: AppServer.ServiceTier | null | undefined,
  fetchProxyConfig: () => Promise<{
    baseUrl: string;
    /** Value of the API key. */
    secret: string;
  } | null>,
  cwd: string,
  perms: PermissionsConfig,
  fetchCodexConfig?: FetchCodexConfig,
  personality?: AppServer.Personality | null,
  approvalsReviewer: AppServer.v2.ApprovalsReviewer = APPROVALS_REVIEWER_USER,
): Promise<AppServer.v2.ThreadStartParams> {
  const config: { [key in string]?: JsonValue } = {};
  const proxyConfig = await fetchProxyConfig();
  let modelProvider: string | null;
  if (proxyConfig != null) {
    modelProvider = COPILOT_MODEL_PROVIDER_ID;
    const { baseUrl, secret } = proxyConfig;
    config.model_provider = COPILOT_MODEL_PROVIDER_ID;
    config[`model_providers.${COPILOT_MODEL_PROVIDER_ID}`] = {
      name: COPILOT_MODEL_PROVIDER_PRESENTATION_NAME,
      base_url: baseUrl,
      experimental_bearer_token: secret,
      wire_api: "responses",
    };
  } else {
    modelProvider = null;
  }

  if (fetchCodexConfig) {
    const codexConfig = await fetchCodexConfig();
    if (codexConfig) {
      for (const [key, value] of Object.entries(codexConfig)) {
        config[key] = value;
      }
    }
  }

  return {
    cwd,
    model,
    modelProvider,
    ...(serviceTier !== undefined ? { serviceTier } : {}),
    approvalsReviewer,
    config,
    approvalPolicy: perms.approvalPolicy,
    baseInstructions: null,
    developerInstructions: null,
    sandbox: getSandboxModeForPolicy(perms.sandboxPolicy),
    personality: personality ?? null,
    ephemeral: null,
    mockExperimentalField: null,
    experimentalRawEvents: false,
    dynamicTools: null,
    persistExtendedHistory: false,
  };
}
