import clsx from "clsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import ChevronRight from "@/icons/chevron-right.svg";
import { ThinkingShimmer } from "@/local-conversation/items/thinking-shimmer";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import { useMeasuredElementHeight } from "../use-measured-element-height";
import type { UserInputResponseLocalConversationItem } from "./local-conversation-item";
import {
  NON_ASSISTANT_BODY_TEXT_CLASS,
  NON_ASSISTANT_HEADER_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS,
} from "./non-assistant-tone";
import { TimelineItem } from "./timeline-item";

const QUESTION_TEXT_CLASS = clsx(
  NON_ASSISTANT_BODY_TEXT_CLASS,
  "text-size-chat",
);
const ANSWER_TEXT_CLASS = clsx(
  NON_ASSISTANT_HEADER_TEXT_CLASS,
  "text-size-chat",
);

export function UserInputResponseItemContent({
  item,
}: {
  item: UserInputResponseLocalConversationItem;
}): React.ReactElement {
  const [expandedRequestId, setExpandedRequestId] = useState<
    typeof item.requestId | null
  >(null);
  const hasDropdown = item.questionsAndAnswers.length > 0;
  const isExpanded = expandedRequestId === item.requestId;
  const isBodyVisible = hasDropdown && isExpanded;
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const countsTextClassName =
    NON_ASSISTANT_SUMMARY_TRAILING_INTERACTIVE_TEXT_CLASS;
  const labelClassName = NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS;

  const targetHeight = isBodyVisible ? contentHeightPx : 0;

  if (!item.completed) {
    return (
      <TimelineItem padding="offset">
        <ThinkingShimmer
          className={NON_ASSISTANT_HEADER_TEXT_CLASS}
          message={
            <FormattedMessage
              id="localConversation.userInputRequest.inProgress"
              defaultMessage="Asking {count, plural, one {question} other {questions}}"
              description="Label shown while the assistant is waiting for user input"
              values={{ count: item.questionsAndAnswers.length }}
            />
          }
        />
      </TimelineItem>
    );
  }

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col">
        <button
          type="button"
          className={clsx(
            "group flex min-w-0 items-center gap-1.5 text-left",
            hasDropdown ? "cursor-interaction" : "cursor-default",
          )}
          onClick={() => {
            if (!hasDropdown) {
              return;
            }
            setExpandedRequestId((value) => {
              if (value === item.requestId) {
                return null;
              }
              return item.requestId;
            });
          }}
        >
          <span className="truncate">
            <FormattedMessage
              id="localConversation.userInputRequest.summary"
              defaultMessage="{label} {counts}"
              description="Summary shown for completed request_user_input items"
              values={{
                label: (
                  <span className={labelClassName}>
                    <FormattedMessage
                      id="localConversation.userInputRequest.summary.asked"
                      defaultMessage="Asked"
                      description="Verb prefix shown before the question count in completed request_user_input items"
                    />
                  </span>
                ),
                counts: (
                  <span className={countsTextClassName}>
                    <FormattedMessage
                      id="localConversation.userInputRequest.summary.count"
                      defaultMessage="{count, plural, one {# question} other {# questions}}"
                      description="Question count shown in completed request_user_input summary"
                      values={{ count: item.questionsAndAnswers.length }}
                    />
                  </span>
                ),
              }}
            />
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
        </button>
        <motion.div
          initial={false}
          animate={{
            height: targetHeight,
            opacity: isBodyVisible ? 1 : 0,
          }}
          transition={ACCORDION_TRANSITION}
          className={clsx(
            isBodyVisible ? "mt-1.5 overflow-visible" : "overflow-hidden",
          )}
          style={{ pointerEvents: isBodyVisible ? "auto" : "none" }}
        >
          <div ref={contentRef} className="flex flex-col gap-3 pt-1 pb-0.5">
            {item.questionsAndAnswers.map((question) => {
              const answers = question.answers;
              return (
                <div key={question.id} className="flex flex-col gap-1">
                  <span className={QUESTION_TEXT_CLASS}>
                    {question.question}
                  </span>
                  <span className={ANSWER_TEXT_CLASS}>
                    {answers.length > 0 ? (
                      answers.join(", ")
                    ) : (
                      <FormattedMessage
                        id="localConversation.userInputRequest.noAnswer"
                        defaultMessage="No answer provided"
                        description="Placeholder shown when a user input question has no answer"
                      />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </TimelineItem>
  );
}
