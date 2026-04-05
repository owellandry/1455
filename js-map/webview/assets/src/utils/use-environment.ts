import { useAtomValue } from "jotai";
import type { CodeEnvironment } from "protocol";

import { persistedAtom } from "./persisted-atom";

export const aEnvironmentAtom = persistedAtom<CodeEnvironment | null>(
  "environment",
  null,
);

export const useEnvironment = (): CodeEnvironment | null => {
  return useAtomValue(aEnvironmentAtom);
};
