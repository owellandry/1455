import type { DiffModeEnum } from "protocol";

import { persistedSignal } from "@/utils/persisted-signal";

const DIFF_VIEW_MODE_STORAGE_KEY = "editorDiffViewMode";
const WRAP_CODE_DIFF_STORAGE_KEY = "wrapCodeDiff.2";
const WORD_DIFFS_ENABLED_STORAGE_KEY = "wordDiffsEnabled.2";
const RICH_PREVIEW_STORAGE_KEY = "diffRichPreview";

export const diffViewMode$ = persistedSignal<DiffModeEnum>(
  DIFF_VIEW_MODE_STORAGE_KEY,
  "unified",
);

export const wrapCodeDiff$ = persistedSignal<boolean>(
  WRAP_CODE_DIFF_STORAGE_KEY,
  false,
);

export const wordDiffsEnabled$ = persistedSignal<boolean>(
  WORD_DIFFS_ENABLED_STORAGE_KEY,
  false,
);

export const richDiffPreview$ = persistedSignal<boolean>(
  RICH_PREVIEW_STORAGE_KEY,
  false,
);
