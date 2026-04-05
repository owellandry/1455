import { useQueryClient } from "@tanstack/react-query";

import { getQueryKey, useFetchFromVSCode } from "@/vscode-api";

export function useRefetchIsCopilotApiAvailable(): () => void {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: getQueryKey("is-copilot-api-available"),
    });
  };
}

export function useIsCopilotApiAvailable(): boolean {
  const { data } = useFetchFromVSCode("is-copilot-api-available");
  return data?.available ?? false;
}
