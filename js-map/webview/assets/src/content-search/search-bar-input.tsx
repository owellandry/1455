import { useScope, useSignal } from "maitai";
import type React from "react";
import { useIntl } from "react-intl";

import { useWindowType } from "@/hooks/use-window-type";
import SearchIcon from "@/icons/search.svg";
import SpinnerIcon from "@/icons/spinner.svg";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import {
  closeContentSearch,
  contentSearchDomain$,
  contentSearchIsLoading$,
  contentSearchQuery$,
  setContentSearchQuery,
  submitContentSearch,
} from "./search-model";

export function SearchBarInput(): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const windowType = useWindowType();
  const intl = useIntl();
  const domain = useSignal(contentSearchDomain$);
  const isLoading = useSignal(contentSearchIsLoading$);
  const query = useSignal(contentSearchQuery$);

  const placeholder =
    domain === "diff"
      ? windowType === "extension"
        ? intl.formatMessage({
            id: "codex.threadFindBar.placeholder.review.extension",
            defaultMessage: "Search diff…",
            description: "Placeholder for the review find input in extension",
          })
        : intl.formatMessage({
            id: "codex.threadFindBar.placeholder.review",
            defaultMessage: "Search diff…",
            description: "Placeholder for the review find input",
          })
      : windowType === "extension"
        ? intl.formatMessage({
            id: "codex.threadFindBar.placeholder.extension",
            defaultMessage: "Search thread…",
            description: "Placeholder for the thread find input in extension",
          })
        : intl.formatMessage({
            id: "codex.threadFindBar.placeholder",
            defaultMessage: "Search thread…",
            description: "Placeholder for the thread find input",
          });

  return (
    <div className="col-[1/2] row-[1] flex h-[44px] min-w-0 items-center gap-2 pl-4">
      {isLoading ? (
        <SpinnerIcon
          aria-hidden
          className="size-4 animate-spin text-token-foreground"
        />
      ) : (
        <SearchIcon className="size-4 text-token-foreground" />
      )}
      <label className="sr-only" htmlFor="content-search-input">
        {intl.formatMessage({
          id: "codex.threadFindBar.label",
          defaultMessage: "Find in thread",
          description: "Accessible label for the thread find input",
        })}
      </label>
      <input
        id="content-search-input"
        type="text"
        autoFocus
        value={query}
        aria-busy={isLoading || undefined}
        aria-label={intl.formatMessage({
          id: "codex.threadFindBar.label",
          defaultMessage: "Find in thread",
          description: "Accessible label for the thread find input",
        })}
        placeholder={placeholder}
        className="h-6 min-w-0 flex-1 bg-transparent text-[13px] leading-6 text-token-foreground outline-none placeholder:text-token-input-placeholder-foreground"
        onChange={(event): void => {
          setContentSearchQuery(scope, event.target.value);
        }}
        onKeyDown={(event): void => {
          if (event.key === "Enter") {
            event.preventDefault();
            submitContentSearch(scope, { shift: event.shiftKey });
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            closeContentSearch(scope);
          }
        }}
      />
    </div>
  );
}
