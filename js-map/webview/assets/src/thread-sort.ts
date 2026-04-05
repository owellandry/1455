import type { ThreadSortKey } from "app-server-types/v2";

import { persistedAtom } from "@/utils/persisted-atom";

export const DEFAULT_THREAD_SORT_KEY: ThreadSortKey = "updated_at";

export const aThreadSortKey = persistedAtom<ThreadSortKey>(
  "thread-sort-key",
  DEFAULT_THREAD_SORT_KEY,
);
