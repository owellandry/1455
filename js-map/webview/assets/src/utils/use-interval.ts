import { useEffect, useEffectEvent } from "react";

export function useInterval(callback: () => void, delay: number | null): void {
  const onTickEvent = useEffectEvent(callback);

  useEffect(() => {
    if (delay == null) {
      return;
    }

    const id = window.setInterval(() => {
      onTickEvent();
    }, delay);

    return (): void => {
      window.clearInterval(id);
    };
  }, [delay]);
}
