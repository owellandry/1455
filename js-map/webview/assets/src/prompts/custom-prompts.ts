import { atom, useAtomValue, useSetAtom } from "jotai";
import type { CustomPromptTemplate } from "protocol";

import { useMessage } from "@/message-bus";

export const aCustomPrompts = atom<Array<CustomPromptTemplate>>([]);

export function useCustomPrompts(): Array<CustomPromptTemplate> {
  const setPrompts = useSetAtom(aCustomPrompts);

  useMessage(
    "custom-prompts-updated",
    (payload) => {
      setPrompts(payload.prompts);
    },
    [setPrompts],
  );

  return useAtomValue(aCustomPrompts);
}
