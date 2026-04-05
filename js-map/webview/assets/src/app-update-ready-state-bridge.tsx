import { useSetAtom } from "jotai";

import { useMessage } from "@/message-bus";

import { aAppUpdateReady } from "./app-update-ready-atom";

export function AppUpdateReadyStateBridge(): null {
  const setIsAppUpdateReady = useSetAtom(aAppUpdateReady);

  useMessage(
    "app-update-ready-changed",
    (message): void => {
      setIsAppUpdateReady(message.isUpdateReady);
    },
    [setIsAppUpdateReady],
  );

  return null;
}
