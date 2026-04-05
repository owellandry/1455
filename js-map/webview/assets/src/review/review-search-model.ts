import { derived } from "maitai";

import { getActiveMatch } from "@/content-search/search-helpers";
import {
  contentSearchActiveDiffResult$,
  contentSearchActiveIndex$,
} from "@/content-search/search-model";
import { selectDiffSearchFilter } from "@/content-search/selectors";
import type { DiffSearchFilter } from "@/content-search/selectors";
import type { SearchMatch } from "@/content-search/types";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

export const reviewDiffSearchFilter$ = derived(
  ThreadRouteScope,
  ({ get }): DiffSearchFilter => {
    return selectDiffSearchFilter(get(contentSearchActiveDiffResult$));
  },
);

export const reviewActiveDiffSearchMatch$ = derived(
  ThreadRouteScope,
  ({ get }): SearchMatch | null => {
    return getActiveMatch(
      get(contentSearchActiveDiffResult$),
      get(contentSearchActiveIndex$),
    );
  },
);
