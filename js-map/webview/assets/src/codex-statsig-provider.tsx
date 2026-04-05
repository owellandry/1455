import {
  StatsigProvider,
  useClientAsyncInit,
  type StatsigClient,
  type StatsigUser,
} from "@statsig/react-bindings";
import isEqual from "lodash/isEqual";
import type { BuildFlavor, HttpMethod } from "protocol";
import { useEffect, useMemo, useState } from "react";

import type { AuthContextValue } from "./auth/auth-context";
import { useAuth } from "./auth/use-auth";
import { useCurrentAccount } from "./codex-api";
import { isCompactWindowContextFromWindow } from "./compact-window/is-compact-window-context";
import { useWindowType } from "./hooks/use-window-type";
import { AppPreloader } from "./loading-page/app-preloader";
import { useSharedObject } from "./shared-objects/use-shared-object";
import { buildFeatureOverrides } from "./statsig/feature-overrides";
import { StatsigClientProviderContext } from "./statsig/statsig";
import { logger } from "./utils/logger";
import { QUERY_STALE_TIME } from "./utils/query-stale-times";
import { useFetchFromVSCode } from "./vscode-api";
import { FetchError, WebFetchWrapper } from "./web-fetch-wrapper";

/**
 * This is a client key and it is safe to store as a publicly visible const.
 * https://docs.statsig.com/client/javascript-sdk/react/#setup
 */
const STATSIG_CLIENT_KEY = "client-sYWqzCYMRkUg4DqqiZcR5DGTNl2iD7zNJY0HoeDLzxR";

export function CodexStatsigProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const auth = useAuth();
  const shouldLoadExtensionInfo = !isCompactWindowContextFromWindow();
  const { data: extensionInfo, isLoading: isExtensionInfoLoading } =
    useFetchFromVSCode("extension-info", {
      queryConfig: {
        staleTime: QUERY_STALE_TIME.INFINITE,
        enabled: shouldLoadExtensionInfo,
      },
    });
  const appVersion = extensionInfo?.version;
  const hostBuildFlavor = extensionInfo?.buildFlavor ?? undefined;

  const { data: currentAccount } = useCurrentAccount();
  const plan = currentAccount?.plan_type ?? auth.planAtLogin;

  if (auth.isLoading) {
    return <AppPreloader />;
  }
  if (shouldLoadExtensionInfo) {
    if (isExtensionInfoLoading) {
      return <AppPreloader />;
    }
  }

  return (
    <CodexStatsigProviderImpl
      auth={auth}
      appVersion={appVersion}
      hostBuildFlavor={hostBuildFlavor}
      plan={plan}
    >
      {children}
    </CodexStatsigProviderImpl>
  );
}

function CodexStatsigProviderImpl({
  auth,
  appVersion,
  hostBuildFlavor,
  plan,
  children,
}: {
  auth: AuthContextValue;
  appVersion: string | undefined;
  hostBuildFlavor: BuildFlavor | undefined;
  plan: string | null;
  children: React.ReactNode;
}): React.ReactElement {
  const windowType = useWindowType();
  const appSessionId = window.electronBridge?.getAppSessionId?.();
  // https://docs.statsig.com/concepts/user/
  const user: StatsigUser = useMemo(
    () => ({
      email: auth.email ?? undefined,
      userID: auth.userId ?? undefined,
      customIDs: {
        account_id: auth.accountId ?? undefined,
      },
      appVersion,
      custom: {
        auth_method: auth.authMethod ?? undefined,
        account_id: auth.accountId ?? undefined,
        plan_type: plan ?? undefined,
        codex_window_type: windowType,
        codex_build_flavor: hostBuildFlavor,
        codex_app_session_id: appSessionId ?? undefined,
      },
    }),
    [
      appVersion,
      auth.accountId,
      auth.authMethod,
      auth.email,
      auth.userId,
      appSessionId,
      hostBuildFlavor,
      plan,
      windowType,
    ],
  );
  const { client, isLoading } = useClientAsyncInit(STATSIG_CLIENT_KEY, user, {
    networkConfig: {
      api: "https://ab.chatgpt.com/v1",
      networkOverrideFunc: statsigNetworkOverride,
    },
  });

  useEffect(() => {
    if (client == null) {
      return;
    }

    try {
      const current = client.getContext().user;
      if (!isEqual(current, user)) {
        void client.updateUserAsync(user);
      }
    } catch (e) {
      logger.error(`Statsig: error while checking/updating user`, {
        safe: {},
        sensitive: {
          error: e,
        },
      });
    }
  }, [client, user]);

  if (isLoading) {
    return <AppPreloader />;
  }

  return (
    <StatsigClientProviderContext.Provider value={true}>
      <StatsigProvider client={client}>
        <StatsigFeaturesPublisher client={client} />
        {children}
      </StatsigProvider>
    </StatsigClientProviderContext.Provider>
  );
}

function StatsigFeaturesPublisher({ client }: { client: StatsigClient }): null {
  const [, setSharedObject] = useSharedObject(
    "statsig_default_enable_features",
  );
  const [merged, setMerged] = useState(() => buildFeatureOverrides(client));

  useEffect(() => {
    // The Statsig client updates evaluations in place, so subscribe to its
    // change event and republish feature overrides when those values refresh.
    const handleValuesUpdated = (): void => {
      setMerged((prev) => {
        const next = buildFeatureOverrides(client);
        return isEqual(prev, next) ? prev : next;
      });
    };

    handleValuesUpdated();
    client.on("values_updated", handleValuesUpdated);
    return (): void => {
      client.off("values_updated", handleValuesUpdated);
    };
  }, [client]);

  useEffect(() => {
    setSharedObject((prev) => {
      if (prev && isEqual(prev, merged)) {
        return prev;
      }
      const enabledFeatures = Object.entries(merged)
        .filter(([, value]) => value)
        .map(([key]) => key);
      if (enabledFeatures.length > 0) {
        logger.info("Features enabled", {
          safe: { enabledFeatures: enabledFeatures.join(", ") },
          sensitive: {},
        });
      }
      return merged;
    });
  }, [merged, setSharedObject]);

  return null;
}

async function statsigNetworkOverride(
  url: string,
  args: RequestInit,
): Promise<Response> {
  const fetchWrapper = WebFetchWrapper.getInstance();
  const method = (args.method as HttpMethod) ?? "GET";
  const { body, isBase64 } = await prepareRequestBody(args.body);
  const headers = Object.fromEntries(new Headers(args.headers).entries());
  const headersWithContentType = {
    "content-type": "application/json",
    ...headers,
    ...(isBase64 ? { "x-codex-base64": "1" } : {}),
  };

  try {
    const response = await fetchWrapper.sendRequest<unknown>(method, url, {
      body,
      headers:
        Object.keys(headersWithContentType).length > 0
          ? headersWithContentType
          : undefined,
      signal: args.signal ?? undefined,
    });
    // CODEX-3488
    if (response.status === 204) {
      return new Response(null, {
        status: response.status,
      });
    }

    let responseHeaders: Headers | undefined = undefined;
    if (response.headers?.length) {
      responseHeaders = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        responseHeaders.set(key, value);
      }
    }

    const responseBody = response.body;
    const serializedBody =
      typeof responseBody === "string"
        ? responseBody
        : responseBody == null
          ? null
          : JSON.stringify(responseBody);

    return new Response(serializedBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof FetchError) {
      return new Response(error.message, {
        status: error.status,
      });
    }

    throw error;
  }
}

async function prepareRequestBody(
  body: RequestInit["body"],
): Promise<{ body: string | undefined; isBase64: boolean }> {
  if (body == null) {
    return { body: undefined, isBase64: false };
  }

  if (typeof body === "string") {
    return { body, isBase64: false };
  }

  if (body instanceof URLSearchParams) {
    return { body: body.toString(), isBase64: false };
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return { body: await body.text(), isBase64: false };
  }

  if (body instanceof ArrayBuffer) {
    return { body: arrayBufferToBase64(body), isBase64: true };
  }

  if (ArrayBuffer.isView(body)) {
    return { body: arrayBufferToBase64(body), isBase64: true };
  }

  return {
    body: typeof body === "string" ? body : (JSON.stringify(body) ?? ""),
    isBase64: false,
  };
}

function arrayBufferToBase64(data: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
