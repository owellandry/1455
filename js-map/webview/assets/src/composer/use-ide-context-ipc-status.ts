import { useEffect, useEffectEvent } from "react";

import { useWindowType } from "@/hooks/use-window-type";
import { useIdeContext } from "@/ide-context/ide-context";
import { registerIpcBroadcastHandler } from "@/ipc-broadcast";

export function useIdeContextIpcStatus(
  isAutoContextOn: boolean,
  setIsAutoContextOn: (on: boolean) => void,
): {
  status: "no-connection" | "connected" | "loading";
  refetch: () => void;
} {
  const windowType = useWindowType();
  const isElectron = windowType === "electron";
  const { isSuccess, isError, isFetching, refetch } = useIdeContext();

  const refetchEvent = useEffectEvent(refetch);
  useEffect(
    () =>
      registerIpcBroadcastHandler("client-status-changed", () =>
        refetchEvent(),
      ),
    [],
  );

  useEffect(() => {
    // If we failed to fetch IDE context, disable it.
    if (isAutoContextOn && isError) {
      setIsAutoContextOn(false);
    }
  }, [isAutoContextOn, isError, setIsAutoContextOn]);

  if (!isElectron) {
    return { status: "connected", refetch: (): void => {} };
  }
  if (isFetching) {
    return { status: "loading", refetch };
  }
  if (isSuccess) {
    return { status: "connected", refetch };
  }
  return { status: "no-connection", refetch };
}
