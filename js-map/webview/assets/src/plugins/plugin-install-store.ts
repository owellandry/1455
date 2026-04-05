import type * as AppServer from "app-server-types";
import { atom, useAtom } from "jotai";

import type { InstalledPlugin } from "./use-plugins";

export type PluginRequiredAppStatus =
  | "pending"
  | "launching"
  | "waitingForCallback"
  | "connected";

export type PluginInstallSession =
  | {
      kind: "closed";
    }
  | {
      kind: "details";
      plugin: InstalledPlugin;
    }
  | {
      kind: "needsApps";
      plugin: InstalledPlugin;
      requiredApps: Array<{
        app: AppServer.v2.AppSummary;
        status: PluginRequiredAppStatus;
      }>;
    };

const aPluginInstallSession = atom<PluginInstallSession>({
  kind: "closed",
});

export function usePluginInstallStore(): {
  closePluginInstall: () => void;
  markRequiredAppStatus: (params: {
    appId: string;
    status: PluginRequiredAppStatus;
  }) => void;
  openPluginInstall: (plugin: InstalledPlugin) => void;
  session: PluginInstallSession;
  setPluginInstallNeedsApps: (apps: Array<AppServer.v2.AppSummary>) => void;
} {
  const [session, setSession] = useAtom(aPluginInstallSession);

  const openPluginInstall = (plugin: InstalledPlugin): void => {
    setSession({
      kind: "details",
      plugin,
    });
  };

  const closePluginInstall = (): void => {
    setSession({
      kind: "closed",
    });
  };

  const setPluginInstallNeedsApps = (
    apps: Array<AppServer.v2.AppSummary>,
  ): void => {
    setSession((current) => {
      if (current.kind === "closed") {
        return current;
      }

      return {
        kind: "needsApps",
        plugin: current.plugin,
        requiredApps: apps.map((app) => ({
          app,
          status: "pending",
        })),
      };
    });
  };

  const markRequiredAppStatus = ({
    appId,
    status,
  }: {
    appId: string;
    status: PluginRequiredAppStatus;
  }): void => {
    setSession((current) => {
      if (current.kind !== "needsApps") {
        return current;
      }

      return {
        ...current,
        requiredApps: current.requiredApps.map((requiredApp) => {
          if (requiredApp.app.id !== appId) {
            return requiredApp;
          }

          return {
            ...requiredApp,
            status,
          };
        }),
      };
    });
  };

  return {
    closePluginInstall,
    markRequiredAppStatus,
    openPluginInstall,
    session,
    setPluginInstallNeedsApps,
  };
}
