import { atom, useAtom } from "jotai";

import { useOsInfo } from "@/hooks/use-os-info";
import { useWindowsSandboxRequirement } from "@/hooks/use-windows-sandbox-requirement";

const aShowWindowsSandboxBanner = atom<boolean>(false);

export function useShowWindowsSandboxBanner(): [
  boolean,
  (showBanner: boolean) => void,
] {
  const { data: environmentInfo } = useOsInfo();
  const { isRequired } = useWindowsSandboxRequirement();
  const [showWindowsSandboxBanner, setShowWindowsSandboxBanner] = useAtom(
    aShowWindowsSandboxBanner,
  );
  const shouldShowBanner =
    environmentInfo?.platform === "win32" &&
    (showWindowsSandboxBanner || isRequired);
  return [shouldShowBanner, setShowWindowsSandboxBanner];
}
