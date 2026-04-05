import clsx from "clsx";
import { useSignal } from "maitai";
import type React from "react";
import { useIntl } from "react-intl";

import {
  contentSearchActiveIndex$,
  contentSearchHasQuery$,
  contentSearchResult$,
} from "./search-model";

export function SearchBarResultLabel(): React.ReactElement {
  const intl = useIntl();
  const hasQuery = useSignal(contentSearchHasQuery$);
  const result = useSignal(contentSearchResult$);
  const activeIndex = useSignal(contentSearchActiveIndex$);
  const totalMatches = result?.totalMatches ?? 0;
  const activeMatch =
    activeIndex == null ? (totalMatches > 0 ? 1 : 0) : activeIndex + 1;
  const resultLabel = hasQuery
    ? totalMatches === 0
      ? intl.formatMessage({
          id: "codex.threadFindBar.noResults",
          defaultMessage: "0 results",
          description: "Find-in-thread label when there are no matches",
        })
      : intl.formatMessage(
          result?.isCapped
            ? {
                id: "codex.threadFindBar.results.capped",
                defaultMessage: "{active} / {matches}+ results",
                description:
                  "Find-in-thread label showing the active match index when matches are capped",
              }
            : {
                id: "codex.threadFindBar.results",
                defaultMessage: "{active} / {matches} results",
                description:
                  "Find-in-thread label showing the active match index",
              },
          {
            active: activeMatch,
            matches: totalMatches,
          },
        )
    : null;

  return (
    <span
      className={clsx(
        "text-token-description-foreground col-[2/4] row-[2] ml-auto px-4 text-right text-[13px] leading-6 transition-all duration-200 ease-out",
        hasQuery
          ? "max-h-9 translate-y-0 border-t border-token-border py-2 opacity-100"
          : "pointer-events-none max-h-0 -translate-y-2 border-t-0 py-0 opacity-0",
      )}
    >
      {resultLabel}
    </span>
  );
}
