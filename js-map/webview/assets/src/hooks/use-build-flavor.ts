import type { BuildFlavor } from "protocol";

export function useBuildFlavor(): BuildFlavor {
  return window.electronBridge?.getBuildFlavor?.() || "prod";
}
