import { scope } from "maitai";
import type { HostConfig } from "protocol";

import { getHostKey } from "@/git-rpc/host-config-utils";
import { ThreadScope } from "@/scopes/thread-scope";

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};

type ScopeJsonPrimitive = boolean | null | number | string;
type ScopeJsonValue = ScopeJsonPrimitive | ScopeJsonObject | ScopeJsonArray;
type ScopeJsonObject = { [key: string]: ScopeJsonValue };
type ScopeJsonArray = Array<ScopeJsonValue>;

export type ThreadRouteHostConfig = RemoveIndexSignature<HostConfig> & {
  [key: string]: ScopeJsonValue;
};

export type ThreadRouteScopeValue = {
  cwd: string | null;
  hostId: string;
  hostConfig: ThreadRouteHostConfig;
  hostKey: string;
  codexHome: string | null;
};

export const ThreadRouteScope = scope<
  "ThreadRouteScope",
  ThreadRouteScopeValue,
  typeof ThreadScope
>("ThreadRouteScope", {
  parent: ThreadScope,
});

export function createThreadRouteScopeValue({
  codexHome,
  cwd,
  hostConfig,
  hostId,
}: {
  codexHome: string | null;
  cwd: string | null;
  hostConfig: HostConfig;
  hostId: string;
}): ThreadRouteScopeValue {
  return {
    codexHome,
    cwd,
    hostConfig: hostConfig as ThreadRouteHostConfig,
    hostId,
    hostKey: getHostKey(hostConfig),
  };
}
