import clsx from "clsx";
import { motion } from "framer-motion";
import { Fragment, useEffect, useEffectEvent, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import {
  AutoScrollList,
  type AutoScrollListViewState,
} from "@/components/auto-scroll-list";
import ChevronRight from "@/icons/chevron-right.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { resolveFsPath } from "@/utils/path";

import type {
  LocalConversationItem,
  LocalConversationItemOrHook,
} from "./items/local-conversation-item";
import {
  NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
  NON_ASSISTANT_BODY_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
} from "./items/non-assistant-tone";
import { TimelineItem } from "./items/timeline-item";
import { normalizeConversationFilePath } from "./normalize-conversation-file-path";
import { formatSkillAwareExplorationLine } from "./skill-exploration-labels";
import { useMeasuredElementHeight } from "./use-measured-element-height";
import { useRootFontSizePx } from "./use-root-font-size-px";

export type ExplorationItem = Extract<
  LocalConversationItem,
  { type: "exec" | "reasoning" }
>;

export type AgentRenderEntry =
  | { kind: "item"; item: LocalConversationItemOrHook }
  | {
      kind: "exploration";
      items: Array<ExplorationItem>;
      status: "exploring" | "explored";
    };

type ExplorationCountPart = {
  key: string;
  node: React.ReactElement;
};

const EXPLORATION_MAX_HEIGHT_REM_BY_STATE: Record<
  AutoScrollListViewState,
  number
> = {
  preview: 7,
  expanded: 20,
  collapsed: 0,
};
const EXPLORATION_MAX_HEIGHT_BY_STATE: Record<AutoScrollListViewState, string> =
  {
    preview: `${EXPLORATION_MAX_HEIGHT_REM_BY_STATE.preview}rem`,
    expanded: `${EXPLORATION_MAX_HEIGHT_REM_BY_STATE.expanded}rem`,
    collapsed: "0px",
  };

export function ExplorationAccordion({
  items,
  status,
}: {
  items: Array<ExplorationItem>;
  status: "exploring" | "explored";
}): React.ReactElement {
  const isExploring = status === "exploring";
  const [viewState, setViewState] = useState<AutoScrollListViewState>(
    isExploring ? "preview" : "collapsed",
  );
  const rootFontSizePx = useRootFontSizePx();
  const { keyedItems, uniqueReadFileCount, searchCount, listCount } = useMemo(
    () => dedupeReadItemsAndCount(items),
    [items],
  );
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const explorationElements = useMemo(
    () => buildExplorationElements(keyedItems),
    [keyedItems],
  );
  const updateViewState = useEffectEvent(() => {
    setViewState(isExploring ? "preview" : "collapsed");
  });

  useEffect(() => {
    updateViewState();
  }, [isExploring]);

  const isBodyVisible = viewState !== "collapsed";
  const shouldAutoScroll = isExploring && isBodyVisible;

  const countParts =
    isExploring && keyedItems.length === 1
      ? []
      : getExplorationCountParts({
          uniqueReadFileCount,
          searchCount,
          listCount,
        });

  const maxHeightPx =
    viewState === "preview"
      ? EXPLORATION_MAX_HEIGHT_REM_BY_STATE.preview * rootFontSizePx
      : viewState === "expanded"
        ? EXPLORATION_MAX_HEIGHT_REM_BY_STATE.expanded * rootFontSizePx
        : 0;
  let targetHeight = 0;
  if (viewState === "preview" || viewState === "expanded") {
    targetHeight = Math.min(contentHeightPx, maxHeightPx);
  }

  const accordionTransition = ACCORDION_TRANSITION;

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col">
        <div className="gap-1 px-0">
          <div className="relative">
            <div
              className={clsx(
                "flex items-center gap-1.5 px-0 py-0",
                "cursor-interaction group",
              )}
              onClick={() => {
                setViewState((value): AutoScrollListViewState => {
                  if (value === "expanded") {
                    return isExploring ? "preview" : "collapsed";
                  } else {
                    return "expanded";
                  }
                });
              }}
            >
              <span
                className={clsx(
                  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
                  "min-w-0 flex-1 truncate",
                )}
              >
                <ExplorationHeader
                  isExploring={isExploring}
                  countParts={countParts}
                />
                <ChevronRight
                  className={clsx(
                    "inline-chevron icon-2xs ml-1 text-token-input-placeholder-foreground group-hover:text-token-foreground transition-all duration-500 opacity-0 group-hover:opacity-100",
                    viewState === "expanded" && "opacity-100",
                    viewState === "expanded" && "rotate-90",
                  )}
                />
              </span>
            </div>
            <motion.div
              data-testid="exploration-accordion-body"
              initial={false}
              animate={{
                height: targetHeight,
                opacity: isBodyVisible ? 1 : 0,
              }}
              transition={accordionTransition}
              className={clsx(
                isBodyVisible ? "overflow-visible" : "overflow-hidden",
              )}
              style={{
                pointerEvents: isBodyVisible ? "auto" : "none",
              }}
            >
              <div
                ref={contentRef}
                className={clsx(
                  "pt-0",
                  NON_ASSISTANT_BODY_TEXT_CLASS,
                  NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
                )}
              >
                <div className="-mx-2.5 mt-1">
                  <AutoScrollList
                    items={explorationElements}
                    autoScrollToBottom={shouldAutoScroll}
                    deferAutoScrollOnEnable
                    className="text-size-chat rounded-none border-0 px-2.5 font-sans text-token-description-foreground/80 [&_*]:text-token-description-foreground/80"
                    maxHeightByState={EXPLORATION_MAX_HEIGHT_BY_STATE}
                    viewState={viewState}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </TimelineItem>
  );
}

function dedupeReadItemsAndCount(items: Array<ExplorationItem>): {
  keyedItems: Array<{ item: ExplorationItem; key: string }>;
  uniqueReadFileCount: number;
  searchCount: number;
  listCount: number;
} {
  const seenReadDedupeKeys = new Set<string>();
  const keyedItemsReversed: Array<{ item: ExplorationItem; key: string }> = [];
  let searchCount = 0;
  let listCount = 0;

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.type === "exec" && item.parsedCmd.type === "search") {
      searchCount += 1;
    }
    if (item.type === "exec" && item.parsedCmd.type === "list_files") {
      listCount += 1;
    }
    if (item.type === "exec" && item.parsedCmd.type === "read") {
      const readPath = item.parsedCmd.path ?? item.parsedCmd.name;
      const dedupeKey = getReadDedupeKey(readPath, item.cwd);
      if (seenReadDedupeKeys.has(dedupeKey)) {
        continue;
      }
      seenReadDedupeKeys.add(dedupeKey);
    }
    const key =
      item.type === "exec" ? `exec:${item.callId}` : `reasoning:${index}`;
    keyedItemsReversed.push({ item, key });
  }

  keyedItemsReversed.reverse();
  return {
    keyedItems: keyedItemsReversed,
    uniqueReadFileCount: seenReadDedupeKeys.size,
    searchCount,
    listCount,
  };
}

/**
 * Returns a stable key used to dedupe read entries in exploration.
 *
 * We resolve relative paths against cwd (when available) so files with the
 * same basename (for example `SKILL.md`) in different folders are not
 * collapsed into one entry.
 */
function getReadDedupeKey(readPath: string, cwd: string | null): string {
  const normalizedReadPath = normalizeConversationFilePath(readPath);
  if (cwd == null) {
    return normalizedReadPath;
  }
  return normalizeConversationFilePath(resolveFsPath(cwd, normalizedReadPath));
}

function getExplorationCountParts({
  uniqueReadFileCount,
  searchCount,
  listCount,
}: {
  uniqueReadFileCount: number;
  searchCount: number;
  listCount: number;
}): Array<ExplorationCountPart> {
  if (uniqueReadFileCount === 0 && searchCount === 0 && listCount === 0) {
    return [];
  }
  const countText = (chunks: React.ReactNode): React.ReactElement => (
    <span>{chunks}</span>
  );
  const parts: Array<ExplorationCountPart> = [];

  if (uniqueReadFileCount > 0) {
    parts.push({
      key: "files",
      node: (
        <FormattedMessage
          id="localConversationTurn.exploration.accordion.count.files"
          defaultMessage="<countText>{count, plural, one {# file} other {# files}}</countText>"
          description="Count of unique files in exploration header"
          values={{
            count: uniqueReadFileCount,
            countText,
          }}
        />
      ),
    });
  }

  if (searchCount > 0) {
    parts.push({
      key: "searches",
      node: (
        <FormattedMessage
          id="localConversationTurn.exploration.accordion.count.searches"
          defaultMessage="<countText>{count, plural, one {# search} other {# searches}}</countText>"
          description="Count of searches in exploration header"
          values={{
            count: searchCount,
            countText,
          }}
        />
      ),
    });
  }

  if (listCount > 0) {
    parts.push({
      key: "lists",
      node: (
        <FormattedMessage
          id="localConversationTurn.exploration.accordion.count.lists"
          defaultMessage="<countText>{count, plural, one {# list} other {# lists}}</countText>"
          description="Count of list commands in exploration header"
          values={{
            count: listCount,
            countText,
          }}
        />
      ),
    });
  }

  return parts;
}

function ExplorationHeader({
  isExploring,
  countParts,
}: {
  isExploring: boolean;
  countParts: Array<ExplorationCountPart>;
}): React.ReactElement {
  const hasCounts = countParts.length > 0;
  const countsTextClassName =
    NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS;
  const labelClassName = NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS;
  const countsNode = hasCounts ? (
    <span className={countsTextClassName}>
      <ExplorationCounts countParts={countParts} />
    </span>
  ) : null;
  if (isExploring) {
    return (
      <>
        <FormattedMessage
          id="localConversationTurn.exploration.accordion.header.active"
          defaultMessage="Exploring"
          description="Header for the exploration accordion while Codex is listing or reading files"
        >
          {(chunks) => (
            <span className="loading-shimmer-pure-text">{chunks}</span>
          )}
        </FormattedMessage>
        {hasCounts ? <span className={labelClassName}> </span> : null}
        {hasCounts ? (
          <FormattedMessage
            id="localConversationTurn.exploration.accordion.header.active.withCounts"
            defaultMessage="{counts}"
            description="Counts shown in the exploration accordion header while Codex is listing or searching"
            values={{ counts: countsNode }}
          />
        ) : null}
      </>
    );
  }

  return hasCounts ? (
    <span className={labelClassName}>
      <FormattedMessage
        id="localConversationTurn.exploration.accordion.header.complete.withCounts"
        defaultMessage="Explored {counts}"
        description="Header for the exploration accordion after Codex finishes listing or searching, including counts"
        values={{ counts: countsNode }}
      />
    </span>
  ) : (
    <span className={labelClassName}>
      <FormattedMessage
        id="localConversationTurn.exploration.accordion.header.complete"
        defaultMessage="Explored"
        description="Header for the exploration accordion after Codex finishes listing or reading files"
      />
    </span>
  );
}

function ExplorationCounts({
  countParts,
}: {
  countParts: Array<ExplorationCountPart>;
}): React.ReactElement {
  const renderSeparator = (index: number): React.ReactElement => (
    <span key={`exploration-count-separator-${index}`}>
      <FormattedMessage
        id="localConversationTurn.exploration.accordion.count.separator"
        defaultMessage=", "
        description="Separator between counts in the exploration header"
      />
    </span>
  );

  return (
    <>
      {countParts.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 ? renderSeparator(index) : null}
          {part.node}
        </Fragment>
      ))}
    </>
  );
}

function buildExplorationElements(
  items: Array<{ item: ExplorationItem; key: string }>,
): Array<{ key: string; node: React.ReactElement }> {
  return items
    .map(({ item, key }) => {
      const line = formatExplorationLine(item);
      if (line == null) {
        return null;
      }
      return {
        key,
        node: <div className="truncate">{line}</div>,
      };
    })
    .filter(
      (element): element is { key: string; node: React.ReactElement } =>
        element != null,
    );
}

function formatExplorationLine(item: ExplorationItem): string | null {
  if (item.type !== "exec") {
    return null;
  }
  const summary = item.parsedCmd;
  switch (summary.type) {
    case "read": {
      const skillAwareLine = formatSkillAwareExplorationLine({
        summary,
        cwd: item.cwd,
      });
      if (skillAwareLine) {
        return skillAwareLine;
      }
      const displayPath = normalizeConversationFilePath(summary.name);
      return `Read ${displayPath}`;
    }
    case "search": {
      const skillAwareLine = formatSkillAwareExplorationLine({
        summary,
        cwd: item.cwd,
      });
      if (skillAwareLine) {
        return skillAwareLine;
      }
      if (summary.query && summary.path) {
        return `Searched for ${summary.query} in ${summary.path}`;
      }
      if (summary.query) {
        return `Searched for ${summary.query}`;
      }
      return "Searched for files";
    }
    case "list_files": {
      const skillAwareLine = formatSkillAwareExplorationLine({
        summary,
        cwd: item.cwd,
      });
      if (skillAwareLine) {
        return skillAwareLine;
      }
      if (summary.path) {
        return `Listed files in ${summary.path}`;
      }
      return "Listed files";
    }
    case "format":
    case "test":
    case "lint":
    case "noop":
    case "unknown":
      return summary.cmd;
  }
}
