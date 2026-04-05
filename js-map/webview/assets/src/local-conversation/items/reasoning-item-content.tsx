import clsx from "clsx";
import { motion } from "framer-motion";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { toString } from "mdast-util-to-string";
import type { GitCwd } from "protocol";
import {
  Children,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormattedMessage } from "react-intl";

import { Markdown } from "@/components/markdown";
import {
  getOrderedListPaddingClassName,
  groupOrderedListItems,
} from "@/components/markdown/ordered-list-utils";
import ChevronRight from "@/icons/chevron-right.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { useInterval } from "@/utils/use-interval";

import { formatElapsedDuration } from "../format-elapsed-duration";
import { useMeasuredElementHeight } from "../use-measured-element-height";
import type { ReasoningLocalConversationItem } from "./local-conversation-item";
import {
  NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
  NON_ASSISTANT_BODY_TEXT_CLASS,
  NON_ASSISTANT_HEADER_TEXT_CLASS,
} from "./non-assistant-tone";
import { TimelineItem } from "./timeline-item";

export function ReasoningItemContent({
  item,
  cwd,
  hideCodeBlocks,
}: {
  item: ReasoningLocalConversationItem;
  cwd: GitCwd | null;
  hideCodeBlocks?: boolean;
}): React.ReactElement {
  const isInProgress = !item.completed;
  const elapsedLabel = useReasoningElapsedLabel(isInProgress);
  const { body } = useExtractHeading(item.content);
  const label = getReasoningItemLabel(isInProgress, elapsedLabel);
  const [isExpanded, setIsExpanded] = useState(isInProgress);
  const hasDropdown = !isInProgress && Boolean(body);
  const streamingBody = stripLeadingBoldHeading(item.content).trimStart();
  const showContent = isInProgress ? Boolean(streamingBody) : isExpanded;
  const markdownBody = isInProgress ? streamingBody : body;
  const streamingScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();

  const setIsExpandedEvent = useEffectEvent((value: boolean) =>
    setIsExpanded(value),
  );

  useEffect((): void => {
    if (!isInProgress) {
      setIsExpandedEvent(false);
      return;
    }
    const el = streamingScrollContainerRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [isInProgress, markdownBody]);

  const targetHeight = showContent ? contentHeightPx : 0;

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col">
        <div
          className={clsx(
            "group flex items-center gap-1.5",
            hasDropdown ? "cursor-interaction " : "cursor-default",
          )}
          onClick={() => {
            if (!hasDropdown) {
              return;
            }
            setIsExpanded((value) => !value);
          }}
        >
          <span
            className={clsx(
              NON_ASSISTANT_HEADER_TEXT_CLASS,
              "group-hover:text-token-foreground text-size-chat truncate",
              isInProgress && "loading-shimmer-pure-text",
            )}
          >
            {label}
          </span>
          {hasDropdown ? (
            <ChevronRight
              className={clsx(
                "text-token-input-placeholder-foreground group-hover:text-token-foreground icon-2xs flex-shrink-0 transition-all duration-500 opacity-0 group-hover:opacity-100",
                isExpanded && "opacity-100",
                isExpanded && "rotate-90",
              )}
            />
          ) : null}
        </div>
        <motion.div
          initial={false}
          animate={{
            height: targetHeight,
            opacity: showContent ? 1 : 0,
          }}
          transition={ACCORDION_TRANSITION}
          className={clsx(showContent ? "overflow-visible" : "overflow-hidden")}
          style={{ pointerEvents: showContent ? "auto" : "none" }}
        >
          <div ref={contentRef} className="pb-0">
            {showContent ? (
              <div
                ref={streamingScrollContainerRef}
                className="vertical-scroll-fade-mask max-h-35 overflow-y-auto [--edge-fade-distance:1rem]"
              >
                <Markdown
                  className={clsx(
                    NON_ASSISTANT_BODY_TEXT_CLASS,
                    NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
                    "break-words text-size-chat [&_*]:text-size-chat [&>h1]:mt-2 [&>h2]:mt-2 [&>h3]:mt-2 [&>h1+*]:mt-1 [&>h2+*]:mt-1 [&>h3+*]:mt-1 [&>p+p]:mt-1",
                  )}
                  cwd={cwd}
                  hideCodeBlocks={hideCodeBlocks}
                  fadeType={isInProgress ? "indexed" : "none"}
                  components={{
                    p({ children }) {
                      return (
                        <p className="m-0 has-[.inline-markdown]:py-0.5">
                          {children}
                        </p>
                      );
                    },
                    h1({ children }) {
                      return <h1 className="m-0 font-semibold">{children}</h1>;
                    },
                    h2({ children }) {
                      return <h2 className="m-0 font-semibold">{children}</h2>;
                    },
                    h3({ children }) {
                      return <h3 className="m-0 font-semibold">{children}</h3>;
                    },
                    ul({ children }) {
                      return (
                        <ul className="my-0 list-disc pl-4">{children}</ul>
                      );
                    },
                    ol({ children, start }) {
                      const groups = groupOrderedListItems(
                        Children.toArray(children),
                        start,
                      );
                      return (
                        <>
                          {groups.map((group) => {
                            const paddingClassName =
                              getOrderedListPaddingClassName(group.digits);
                            return (
                              <ol
                                key={`ol-${group.start}`}
                                className={clsx(
                                  "my-0 list-decimal",
                                  paddingClassName,
                                )}
                                start={group.start}
                              >
                                {group.items}
                              </ol>
                            );
                          })}
                        </>
                      );
                    },
                    li({ children }) {
                      return <li className="m-0">{children}</li>;
                    },
                  }}
                >
                  {markdownBody}
                </Markdown>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </TimelineItem>
  );
}

function useExtractHeading(content: string): {
  heading: string | null;
  body: string;
} {
  const { heading, body } = useMemo(() => {
    const trimmed = content.trimStart();
    const boldHeadingMatch = trimmed.match(/^\*\*([^\n]*?)\*\*\s*/);
    if (boldHeadingMatch) {
      const extractedHeading = boldHeadingMatch[1]?.trim() ?? "";
      return {
        heading: extractedHeading.length > 0 ? extractedHeading : null,
        body: trimmed.slice(boldHeadingMatch[0].length).trim(),
      };
    }

    try {
      const tree = fromMarkdown(content);
      const [first, ...rest] = tree.children ?? [];
      if (first?.type === "heading") {
        return {
          heading: toString(first),
          body: toMarkdown({ type: "root", children: rest }).trim(),
        };
      }
      if (
        first?.type === "paragraph" &&
        Array.isArray(first.children) &&
        first.children.length === 1 &&
        first.children[0]?.type === "strong"
      ) {
        const strong = first.children[0];
        return {
          heading: toString(strong),
          body: toMarkdown({ type: "root", children: rest }).trim(),
        };
      }
    } catch {
      return { heading: null, body: content };
    }
    return { heading: null, body: content };
  }, [content]);

  return { heading, body };
}

function getReasoningItemLabel(
  isInProgress: boolean,
  elapsedLabel: string | null,
): React.ReactElement {
  if (isInProgress) {
    return (
      <FormattedMessage
        id="reasoningItem.thinking"
        defaultMessage="Thinking"
        description="Message shown when AI is currently thinking"
      />
    );
  }
  if (elapsedLabel) {
    return (
      <FormattedMessage
        id="reasoningItem.thoughtWithElapsed"
        defaultMessage="Thought for {elapsed}"
        description="Message shown when AI has finished thinking, including elapsed time"
        values={{ elapsed: elapsedLabel }}
      />
    );
  }
  return (
    <FormattedMessage
      id="reasoningItem.thought"
      defaultMessage="Thought"
      description="Message shown when AI has finished thinking"
    />
  );
}

function stripLeadingBoldHeading(content: string): string {
  const trimmed = content.trimStart();
  const match = trimmed.match(/^\*\*([^\n]*?)\*\*/);
  if (!match) {
    if (trimmed.startsWith("**")) {
      return "";
    }
    return trimmed;
  }
  return trimmed.slice(match[0].length);
}

function useReasoningElapsedLabel(isInProgress: boolean): string | null {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startTimeMs, setStartTimeMs] = useState<number | null>(() =>
    isInProgress ? Date.now() : null,
  );
  const [completedElapsedMs, setCompletedElapsedMs] = useState<number | null>(
    null,
  );
  const wasInProgressRef = useRef(isInProgress);
  const startTimingEvent = useEffectEvent((start: number): void => {
    setStartTimeMs(start);
    setCompletedElapsedMs(null);
    setNowMs(start);
  });
  const stopTimingEvent = useEffectEvent((start: number): void => {
    const finishedAt = Date.now();
    setCompletedElapsedMs(finishedAt - start);
    setNowMs(finishedAt);
    setStartTimeMs(null);
  });

  useEffect((): void => {
    const wasInProgress = wasInProgressRef.current;
    if (!wasInProgress && isInProgress) {
      startTimingEvent(Date.now());
    }
    if (wasInProgress && !isInProgress) {
      if (startTimeMs != null && completedElapsedMs == null) {
        stopTimingEvent(startTimeMs);
      }
    }
    wasInProgressRef.current = isInProgress;
  }, [completedElapsedMs, isInProgress, startTimeMs]);

  useInterval(
    () => {
      if (isInProgress) {
        setNowMs(Date.now());
      }
    },
    isInProgress ? 1000 : null,
  );

  const displayElapsedMs =
    completedElapsedMs ??
    (startTimeMs != null && nowMs >= startTimeMs ? nowMs - startTimeMs : 0);
  if (displayElapsedMs <= 0) {
    return null;
  }
  return formatElapsedTime(displayElapsedMs);
}

const formatElapsedTime = formatElapsedDuration;
