import { useFetchFromVSCode } from "@/vscode-api";

export type OsInfo = {
  platform: string;
  hasWsl: boolean;
  isVsCodeRunningInsideWsl: boolean;
};

export function useOsInfo(): {
  data: OsInfo | undefined;
  isLoading: boolean;
} {
  const queryResult = useFetchFromVSCode("os-info");

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
  };
}
