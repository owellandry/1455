import type { HostConfig } from "protocol";

export function getHostKey(hostConfig: HostConfig): string {
  return hostConfig.id;
}
