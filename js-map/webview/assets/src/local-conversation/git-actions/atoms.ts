import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

export const aIncludeUnstagedChanges = atomFamily((_cwd: string) => atom(true));
