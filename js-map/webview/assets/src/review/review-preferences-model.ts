import { signal } from "maitai";

import type { SplitViewLayoutMode } from "@/components/split-view-layout";
import { AppScope } from "@/scopes/app-scope";
import { persistedSignal } from "@/utils/persisted-signal";

export const reviewLayoutMode$ = signal<typeof AppScope, SplitViewLayoutMode>(
  AppScope,
  "collapsed",
);

export const reviewShowFileTree$ = persistedSignal<boolean>(
  "file-tree-open",
  true,
);

export const reviewShowFileTreeInCollapsedReview$ = persistedSignal<boolean>(
  "file-tree-open-in-collapsed-review",
  false,
);

export const reviewLoadFullFiles$ = persistedSignal<boolean>(
  "load-full-files",
  true,
);

export const reviewSkipRevertConfirmation$ = persistedSignal<boolean>(
  "skip-revert-confirmation",
  false,
);
