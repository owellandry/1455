import { usePlatform } from "@/hooks/use-platform";

export function useWindowsMenuBarEnabled(): boolean {
  const { platform } = usePlatform();

  return (
    platform === "windows" && window.electronBridge?.showApplicationMenu != null
  );
}
