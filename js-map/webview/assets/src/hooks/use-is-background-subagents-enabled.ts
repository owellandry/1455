import { useGate } from "@/statsig/statsig";

export function useIsBackgroundSubagentsEnabled(): boolean {
  return useGate(__statsigName("codex-app-multiagent-ui"));
}
