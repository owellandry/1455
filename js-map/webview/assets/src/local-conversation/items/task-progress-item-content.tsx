import clsx from "clsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { useIntl } from "react-intl";

import CheckCircle from "@/icons/check-circle.svg";
import ChevronIcon from "@/icons/chevron.svg";
import UnselectedCircle from "@/icons/unselected-circle.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import { useMeasuredElementHeight } from "../use-measured-element-height";
import type { TodoListConversationItem } from "./local-conversation-item";
import { TimelineItem } from "./timeline-item";

export function TaskProgressItemContent({
  item,
}: {
  item: TodoListConversationItem;
}): React.ReactElement {
  const total = item.plan.length;
  const completed = item.plan.reduce(
    (acc, p) => acc + (p.status === "completed" ? 1 : 0),
    0,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const intl = useIntl();
  const summaryText =
    completed === 0
      ? intl.formatMessage(
          {
            id: "codex.plan.todoListCreated",
            defaultMessage: "To do list created with {total} tasks",
            description:
              "Summary shown when a to-do plan has just been created with a given number of tasks",
          },
          { total },
        )
      : intl.formatMessage(
          {
            id: "codex.plan.tasksCompletedSummary",
            defaultMessage: "{completed} out of {total} tasks completed",
            description:
              "Summary shown indicating how many tasks are completed out of the total in the plan",
          },
          { completed, total },
        );

  const targetHeight = isExpanded ? contentHeightPx : 0;

  return (
    <TimelineItem>
      <div
        className="group flex min-w-0 cursor-interaction items-center justify-between"
        onClick={() => setIsExpanded((e) => !e)}
      >
        <span className="text-size-chat min-w-0 truncate text-token-input-placeholder-foreground">
          {summaryText}
        </span>
        <ChevronIcon
          className={clsx(
            "icon-xs flex-shrink-0 transition-all duration-300",
            isExpanded
              ? "rotate-180 opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        />
      </div>
      <motion.div
        initial={false}
        animate={{
          height: targetHeight,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={ACCORDION_TRANSITION}
        className={clsx(isExpanded ? "overflow-visible" : "overflow-hidden")}
        style={{ pointerEvents: isExpanded ? "auto" : "none" }}
      >
        <div ref={contentRef} className="mt-2">
          <div className="vertical-scroll-fade-mask max-h-40 space-y-1 overflow-y-auto [--edge-fade-distance:2rem]">
            {item.plan.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                {p.status === "completed" ? (
                  <CheckCircle className="icon-xxs shrink-0" />
                ) : (
                  <UnselectedCircle className="icon-xxs shrink-0" />
                )}
                <span className="text-size-chat text-token-description-foreground/80">
                  {intl.formatMessage(
                    {
                      id: "codex.plan.stepIndexPrefix",
                      defaultMessage: "{index}.",
                      description:
                        "Prefix numbering for a compact to-do plan step, including a trailing period",
                    },
                    { index: i + 1 },
                  )}
                </span>
                <span
                  className={clsx(
                    "text-token-description-foreground/80 text-size-chat",
                    p.status === "completed" && "line-through",
                  )}
                >
                  {p.step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </TimelineItem>
  );
}
