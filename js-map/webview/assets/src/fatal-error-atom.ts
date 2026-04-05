import { atom } from "jotai";
import type { CodexAppServerFatalError } from "protocol";

export const aFatalError = atom<CodexAppServerFatalError | null>(null);
