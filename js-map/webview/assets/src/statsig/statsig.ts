import {
  useGateValue,
  useStatsigClient as useStatsigClientBindings,
  type DynamicConfigEvaluationOptions,
  type ExperimentEvaluationOptions,
  type LayerEvaluationOptions,
  type StatsigClient,
} from "@statsig/react-bindings";
import { createContext, useCallback, useContext } from "react";

import type {
  StatsigDynamicConfigName,
  StatsigExperimentName,
  StatsigFeatureGateName,
  StatsigLayerName,
} from "./types";

export const StatsigClientProviderContext = createContext(false);

export function useStatsigLoading(): boolean {
  return useStatsigClient().isLoading;
}

export type StatsigNameObfuscated<T extends string> = T & {
  __statsigNameObfuscated: true;
};

export function checkGate(
  client: StatsigClient,
  gate: StatsigNameObfuscated<StatsigFeatureGateName>,
): boolean {
  return client.checkGate(gate);
}

export function useGate(
  gate: StatsigNameObfuscated<StatsigFeatureGateName>,
): boolean {
  useEnsureStatsigClientProvider();
  return useGateValue(gate);
}

type StatsigDynamicConfigReturn = ReturnType<StatsigClient["getDynamicConfig"]>;
type StatsigExperimentReturn = ReturnType<StatsigClient["getExperiment"]>;
type StatsigLayerReturn = ReturnType<StatsigClient["getLayer"]>;
type StatsigClientHook = ReturnType<typeof useStatsigClientBindings>;
type StatsigEvaluationClient = ReturnType<
  typeof useStatsigClientBindings
>["client"];

export function useStatsigClient(): StatsigClientHook {
  useEnsureStatsigClientProvider();
  return useStatsigClientBindings();
}

export function useStatsigEvaluationClient(): StatsigEvaluationClient {
  return useStatsigClient().client;
}

export function useDynamicConfig(
  config: StatsigNameObfuscated<StatsigDynamicConfigName>,
  options?: DynamicConfigEvaluationOptions,
): StatsigDynamicConfigReturn {
  const client = useStatsigClient();
  return client.getDynamicConfig(config, options);
}

export function useExperiment(
  experiment: StatsigNameObfuscated<StatsigExperimentName>,
  options?: ExperimentEvaluationOptions,
): StatsigExperimentReturn {
  const { client } = useStatsigClient();
  return getStatsigExperiment(client, experiment, options);
}

export function useStatsigDynamicConfig(
  config: StatsigNameObfuscated<StatsigDynamicConfigName>,
  options?: DynamicConfigEvaluationOptions,
): StatsigDynamicConfigReturn {
  return useDynamicConfig(config, options);
}

export function useStatsigExperiment(
  experiment: StatsigNameObfuscated<StatsigExperimentName>,
  options?: ExperimentEvaluationOptions,
): StatsigExperimentReturn {
  return useExperiment(experiment, options);
}

export function getStatsigExperiment(
  client: StatsigEvaluationClient,
  experiment: StatsigNameObfuscated<StatsigExperimentName>,
  options?: ExperimentEvaluationOptions,
): StatsigExperimentReturn {
  return client.getExperiment(experiment, options);
}

export function useStatsigLayer(
  layer: StatsigNameObfuscated<StatsigLayerName>,
  options?: LayerEvaluationOptions,
): StatsigLayerReturn {
  const client = useStatsigClient();
  return client.getLayer(layer, options);
}

export type StatsigEventProperties = Record<string, string | number | boolean>;

function createStringCoercedProperties(
  eventProperties: StatsigEventProperties,
): Record<string, string> {
  const stringCoercedProperties = {} as Record<string, string>;
  Object.entries(eventProperties).forEach(([key, value]) => {
    if (
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      stringCoercedProperties[key] = String(value);
    }
  });
  return stringCoercedProperties;
}

function getBaseMetadata(
  client: StatsigClientForEvents,
): StatsigEventProperties {
  const appVersion = client.getContext().user?.appVersion;
  return {
    origin: "codex_vscode",
    ...(appVersion ? { app_version: appVersion } : {}),
  };
}

export type StatsigLogEventOptions = {
  value?: string | number;
  metadata?: StatsigEventProperties;
};

type StatsigClientContext = {
  user?: {
    appVersion?: string;
  } | null;
};

type StatsigClientForEvents = {
  logEvent: StatsigClient["logEvent"];
  getContext: () => StatsigClientContext;
};

export function logValueEventWithStatsig(
  client: StatsigClientForEvents,
  eventName: string,
  { value, metadata }: StatsigLogEventOptions = {},
): void {
  const eventProperties = {
    ...getBaseMetadata(client),
    ...metadata,
  };

  // Statsig expects string metadata values, coerce numbers/booleans to strings.
  const stringCoercedProperties =
    createStringCoercedProperties(eventProperties);

  client.logEvent(eventName, value, stringCoercedProperties);
}

export function logEventWithStatsig(
  client: StatsigClientForEvents,
  eventName: string,
  metadata?: StatsigEventProperties,
): void {
  logValueEventWithStatsig(client, eventName, { metadata });
}

export function useStatsigEventLogger(): {
  logEventWithStatsig: (
    eventName: string,
    metadata?: StatsigEventProperties,
  ) => void;
  logValueEventWithStatsig: (
    eventName: string,
    options?: StatsigLogEventOptions,
  ) => void;
} {
  const { client } = useStatsigClient();

  const logEvent = useCallback(
    (eventName: string, metadata?: StatsigEventProperties) =>
      logEventWithStatsig(client, eventName, metadata),
    [client],
  );

  const logValueEvent = useCallback(
    (eventName: string, options?: StatsigLogEventOptions) =>
      logValueEventWithStatsig(client, eventName, options),
    [client],
  );

  return {
    logEventWithStatsig: logEvent,
    logValueEventWithStatsig: logValueEvent,
  };
}

function useEnsureStatsigClientProvider(): void {
  const hasStatsigClientProvider = useContext(StatsigClientProviderContext);
  if (!__DEV__ || hasStatsigClientProvider) {
    return;
  }

  throw new Error(
    "Statsig was used above the StatsigClient provider. Wrap the component tree in <CodexStatsigProvider>.",
  );
}
