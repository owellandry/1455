import clsx from "clsx";
import { FormattedMessage } from "react-intl";

import type { WebSearchLocalConversationItem } from "./local-conversation-item";
import {
  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
} from "./non-assistant-tone";
import { TimelineItem } from "./timeline-item";

export function WebSearchItemContent({
  item,
}: {
  item: WebSearchLocalConversationItem;
}): React.ReactElement {
  const query = item.query ?? "";
  const detail = getWebSearchDetail(item.action, query).trim();
  const hasDetail = detail.length > 0;
  const labelTextClassName =
    NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS;
  const detailTextClassName =
    NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS;

  return (
    <TimelineItem padding="offset">
      <div className="group flex min-w-0 items-center gap-2">
        <span
          className={clsx(
            "min-w-0 truncate text-size-chat",
            !item.completed && "loading-shimmer-pure-text",
          )}
        >
          <FormattedMessage
            id="codex.webSearch.summary"
            defaultMessage="{label}{details}"
            description="Summary line shown for web search items in the local conversation"
            values={{
              label: (
                <span className={labelTextClassName}>
                  {item.completed ? (
                    <FormattedMessage
                      id="codex.webSearch.summary.verb.completed"
                      defaultMessage="Searched web"
                      description="Verb text shown for a completed web search item"
                    />
                  ) : (
                    <FormattedMessage
                      id="codex.webSearch.summary.verb.inProgress"
                      defaultMessage="Searching web"
                      description="Verb text shown for an in-progress web search item"
                    />
                  )}
                </span>
              ),
              details: hasDetail ? (
                <span className={detailTextClassName}>
                  <FormattedMessage
                    id="codex.webSearch.summary.details"
                    defaultMessage=" for {query}"
                    description="Details shown after the web search summary verb"
                    values={{
                      query: detail,
                    }}
                  />
                </span>
              ) : null,
            }}
          />
        </span>
      </div>
    </TimelineItem>
  );
}

function getWebSearchDetail(
  action: WebSearchLocalConversationItem["action"],
  query: string,
): string {
  if (action) {
    const detail = getWebSearchActionDetail(action).trim();
    if (detail.length > 0) {
      return detail;
    }
  }
  return query;
}

function getWebSearchActionDetail(
  action: NonNullable<WebSearchLocalConversationItem["action"]>,
): string {
  switch (action.type) {
    case "search":
      return getSearchActionDetail(action.query, action.queries);
    case "openPage":
      return action.url ?? "";
    case "findInPage":
      if (action.pattern && action.url) {
        return `'${action.pattern}' in ${action.url}`;
      }
      if (action.pattern) {
        return `'${action.pattern}'`;
      }
      if (action.url) {
        return action.url;
      }
      return "";
    case "other":
      return "";
  }
}

function getSearchActionDetail(
  query: string | null,
  queries: Array<string> | null,
): string {
  const trimmedQuery = query?.trim() ?? "";
  if (trimmedQuery) {
    return trimmedQuery;
  }
  const firstNonEmpty =
    queries?.map((entry) => entry.trim()).find((entry) => entry.length > 0) ??
    "";
  if (queries && queries.length > 1 && firstNonEmpty) {
    return `${firstNonEmpty} ...`;
  }
  return firstNonEmpty;
}
