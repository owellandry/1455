import { useGate } from "@/statsig/statsig";

export function useIsThreadSearchEnabled(): boolean {
  return useGate(__statsigName("codex-app-command-menu-thread-search"));
}
