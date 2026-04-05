import clsx from "clsx";
import { useScope, useSignal } from "maitai";
import type React from "react";
import { useIntl } from "react-intl";

import { Button } from "@/components/button";
import ArrowUpIcon from "@/icons/arrow-up.svg";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import {
  contentSearchHasQuery$,
  contentSearchResult$,
  nextContentSearch,
  previousContentSearch,
} from "./search-model";

export function SearchBarNavigation(): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const intl = useIntl();
  const matches = useSignal(contentSearchResult$)?.totalMatches ?? 0;
  const hasQuery = useSignal(contentSearchHasQuery$);

  return (
    <div
      className={clsx(
        "col-[1/2] row-[2] flex items-center justify-between px-4 text-[13px] leading-6 transition-all duration-200 ease-out",
        hasQuery
          ? "max-h-9 translate-y-0 border-t border-token-border py-2 opacity-100"
          : "pointer-events-none max-h-0 -translate-y-2 border-t-0 py-0 opacity-0",
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          className="h-4 w-4 p-0 text-token-description-foreground"
          size="icon"
          color="ghost"
          uniform
          onClick={(): void => {
            previousContentSearch(scope);
          }}
          disabled={matches === 0}
          aria-label={intl.formatMessage({
            id: "codex.threadFindBar.previousResult",
            defaultMessage: "Previous result",
            description: "Button label to move to the previous find match",
          })}
        >
          <ArrowUpIcon className="size-4" />
        </Button>
        <Button
          className="h-4 w-4 p-0 text-token-description-foreground"
          size="icon"
          color="ghost"
          uniform
          onClick={(): void => {
            nextContentSearch(scope);
          }}
          disabled={matches === 0}
          aria-label={intl.formatMessage({
            id: "codex.threadFindBar.nextResult",
            defaultMessage: "Next result",
            description: "Button label to move to the next find match",
          })}
        >
          <ArrowUpIcon className="size-4 rotate-180" />
        </Button>
      </div>
    </div>
  );
}
