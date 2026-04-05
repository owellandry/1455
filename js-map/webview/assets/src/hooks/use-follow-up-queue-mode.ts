import { ConfigurationKeys } from "protocol";
import { useEffect } from "react";

import { useConfiguration } from "@/hooks/use-configuration";

export function useFollowUpQueueMode(): {
  mode: "queue" | "steer";
  isQueueingEnabled: boolean;
  setMode: (mode: "queue" | "steer") => Promise<void>;
  isLoading: boolean;
} {
  const {
    data: followUpQueueMode,
    setData,
    isLoading,
  } = useConfiguration(ConfigurationKeys.FOLLOW_UP_QUEUE_MODE);
  const mode =
    followUpQueueMode === "interrupt"
      ? "steer"
      : (followUpQueueMode ?? "queue");

  useEffect(() => {
    if (followUpQueueMode !== "interrupt") {
      return;
    }
    void setData("steer");
  }, [followUpQueueMode, setData]);

  return {
    mode,
    isQueueingEnabled: mode === "queue",
    setMode: setData,
    isLoading,
  };
}
