import type { SharedObjectKey, SharedObjectValue } from "protocol";
import { useCallback, useEffect, useState } from "react";

import { messageBus, useMessage } from "@/message-bus";
import { useStableRef } from "@/utils/use-stable-ref";

type SetStateAction<T> = T | ((prev: T) => T);

export function useSharedObject<K extends SharedObjectKey>(
  key: K,
): [
  SharedObjectValue<K> | undefined,
  (updater: SetStateAction<SharedObjectValue<K> | undefined>) => void,
] {
  const [value, setValue] = useState<SharedObjectValue<K> | undefined>(
    undefined,
  );
  useMessage("shared-object-updated", (message) => {
    if (message.key === key) {
      setValue(message.value as SharedObjectValue<K> | undefined);
    }
  });

  useEffect((): (() => void) => {
    messageBus.dispatchMessage("shared-object-subscribe", { key });
    return (): void => {
      messageBus.dispatchMessage("shared-object-unsubscribe", { key });
    };
  }, [key]);

  const valueRef = useStableRef(value);
  const setSharedObject = useCallback(
    (updater: SetStateAction<SharedObjectValue<K> | undefined>) => {
      const next =
        typeof updater === "function" ? updater(valueRef.current) : updater;
      messageBus.dispatchMessage("shared-object-set", { key, value: next });
      setValue(next);
    },
    [key, valueRef],
  );

  return [value, setSharedObject];
}
