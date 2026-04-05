import type { StatsigClient } from "@statsig/react-bindings";
import { stripFeatureOverrideKeyPrefix } from "protocol";

import { checkGate } from "./statsig";

const FEATURE_OVERRIDES_PARAM = "feature_overrides";
/**
 * Statsig feature gates to read for rollout overrides.
 * Rollout gates only enable features; they do not disable them.
 *
 * More detailed instructions here:
 * https://www.notion.so/openai/Codex-Local-Releases-Runbook-24d8e50b62b080cd9f80c7bb7ad3eb51?source=copy_link#2ff8e50b62b080aa9143f5a849d9674a
 */
const ROLLOUT_GATES = [
  {
    gateName: __statsigName("codex_rollout_enable_request_compression"),
    featureKey: "enable_request_compression",
  },
  {
    gateName: __statsigName("codex_rollout_unified_exec"),
    featureKey: "unified_exec",
  },
  {
    gateName: __statsigName("codex_rollout_shell_snapshot"),
    featureKey: "shell_snapshot",
  },
  {
    gateName: __statsigName("codex_rollout_remote_models"),
    featureKey: "remote_models",
  },
  {
    gateName: __statsigName("codex_rollout_responses_websockets"),
    featureKey: "responses_websockets",
  },
  {
    gateName: __statsigName("codex_rollout_responses_websockets_v2"),
    featureKey: "responses_websockets_v2",
  },
  // exp: https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/experiments/codex-vsce-collaboration-mode/setup
  // gate: https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/gates/codex_rollout_collaboration_modes
  {
    gateName: __statsigName("codex_rollout_collaboration_modes"),
    featureKey: "collaboration_modes",
  },
  {
    gateName: __statsigName("codex_rollout_default_mode_request_user_input"),
    featureKey: "default_mode_request_user_input",
  },
  // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/gates/codex_rollout_personality
  {
    gateName: __statsigName("codex_rollout_personality"),
    featureKey: "personality",
  },
  // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/gates/codex_rollout_request_rule
  {
    gateName: __statsigName("codex_rollout_request_rule"),
    featureKey: "request_rule",
  },
  {
    gateName: __statsigName("codex_rollout_fast_mode"),
    featureKey: "fast_mode",
  },
  {
    gateName: __statsigName("codex_rollout_image_gen"),
    featureKey: "image_generation",
  },
  // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/gates/codex_rollout_image_detail_original
  {
    gateName: __statsigName("codex_rollout_image_detail_original"),
    featureKey: "image_detail_original",
  },
  {
    gateName: __statsigName("codex_rollout_sqlite"),
    featureKey: "sqlite",
  },
  // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/gates/codex_rollout_codex_git_commit
  {
    gateName: __statsigName("codex_rollout_codex_git_commit"),
    featureKey: "codex_git_commit",
  },
  // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/gates/codex_rollout_guardian_approval
  {
    gateName: __statsigName("codex_rollout_guardian_approval"),
    featureKey: "guardian_approval",
  },
] as const;

// Statsig layers and params to use for experiment overrides
// Exclude employees from experiment via layer override
// Warning: a user can end up receiving experiment treatments from different layers

// More detailed instructions here:
// https://www.notion.so/openai/Codex-Local-Releases-Runbook-24d8e50b62b080cd9f80c7bb7ad3eb51?source=copy_link#2ff8e50b62b080aa9143f5a849d9674a
const EXPERIMENT_LAYERS: Array<{
  name: string;
  param: string;
  featureAllowlist: Set<string>;
}> = [
  {
    // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/layers/codex_feature_overrides_exp_layer
    name: __statsigName("codex_feature_overrides_exp_layer"),
    param: FEATURE_OVERRIDES_PARAM,
    featureAllowlist: new Set<string>([
      "shell_snapshot",
      "unified_exec",
      "responses_websockets",
      "responses_websockets_v2",
      "memories",
      "fast_mode",
      "default_mode_request_user_input",
    ]),
  },
  {
    // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/layers/codex-vscode-collab-mode
    name: __statsigName("codex-vscode-collab-mode"),
    param: FEATURE_OVERRIDES_PARAM,
    featureAllowlist: new Set<string>(["collaboration_modes"]),
  },
];

const EXPERIMENT_PARAM_LAYERS = [
  {
    featureKeys: ["apps", "plugins"],
    layerName: __statsigName("codex_plugins"),
    param: "enable_plugins",
  },
  {
    featureKeys: ["tool_search"],
    layerName: __statsigName("codex_plugins"),
    param: "enable_tool_search",
  },
  {
    featureKeys: ["tool_suggest"],
    layerName: __statsigName("codex_plugins"),
    param: "enable_tool_suggest",
  },
  {
    featureKeys: ["tool_call_mcp_elicitation"],
    layerName: __statsigName("codex_plugins"),
    param: "enable_tool_call_mcp_elicitation",
  },
] as const;

export function buildFeatureOverrides(
  client: StatsigClient,
): Record<string, boolean> {
  const rolloutOverrides = resolveRolloutOverrides(client);
  const experimentOverrides = resolveExperimentOverrides(client);
  // Deploy mode per feature should be rollout or experiment; experiments win.
  return {
    ...rolloutOverrides,
    ...experimentOverrides, // experiment overrides win
  };
}

function normalizeFeatures(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: Record<string, boolean> = {};
  for (const [key, maybeValue] of entries) {
    if (typeof maybeValue === "boolean") {
      const featureKey = stripFeatureOverrideKeyPrefix(key);
      normalized[featureKey] = maybeValue;
    }
  }
  return normalized;
}

function resolveRolloutOverrides(
  client: StatsigClient,
): Record<string, boolean> {
  const overrides: Record<string, boolean> = {};
  for (const gate of ROLLOUT_GATES) {
    const isEnabled = checkGate(client, gate.gateName);
    // Rollout gates only enable features; they do not disable them.
    // Missing/false gates mean no override.
    if (isEnabled) {
      overrides[gate.featureKey] = true;
    }
  }
  return overrides;
}

function resolveExperimentOverrides(
  client: StatsigClient,
): Record<string, boolean> {
  const overrides: Record<string, boolean> = {};
  for (const layer of EXPERIMENT_LAYERS) {
    const normalized = normalizeFeatures(
      client.getLayer(layer.name).get(layer.param, {}),
    );
    for (const [featureKey, value] of Object.entries(normalized)) {
      if (layer.featureAllowlist.has(featureKey)) {
        overrides[featureKey] = value;
      }
    }
  }
  for (const layer of EXPERIMENT_PARAM_LAYERS) {
    const value = client.getLayer(layer.layerName).get(layer.param, null);
    if (typeof value !== "boolean") {
      continue;
    }
    for (const featureKey of layer.featureKeys) {
      overrides[featureKey] = value;
    }
  }
  return overrides;
}
