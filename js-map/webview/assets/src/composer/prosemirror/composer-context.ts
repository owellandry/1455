import { createContext } from "react";

import type { ProseMirrorComposerController } from "./composer-controller";

export const ComposerControllerContext =
  createContext<ProseMirrorComposerController | null>(null);
