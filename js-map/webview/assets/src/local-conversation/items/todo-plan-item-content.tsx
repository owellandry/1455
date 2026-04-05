import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import sumBy from "lodash/sumBy";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Spinner } from "@/components/spinner";
import CheckCircle from "@/icons/check-circle.svg";
import CollapseIcon from "@/icons/collapse.svg";
import ExpandIcon from "@/icons/expand.svg";
import TaskIcon from "@/icons/tasks.svg";
import UnselectedCircle from "@/icons/unselected-circle.svg";
import XCircle from "@/icons/x-circle-filled.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import { InProgressFixedContentItem } from "../in-progress-fixed-content-item";
import { useMeasuredElementHeight } from "../use-measured-element-height";
import type { TodoListConversationItem } from "./local-conversation-item";

export function TodoPlanItemContent({
  item,
  isComplete = false,
}: {
  item: TodoListConversationItem;
  isComplete?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(true);
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const firstInProgressItemRef = useRef<HTMLDivElement>(null);
  const completedItems = sumBy(item.plan, (i) =>
    i.status === "completed" ? 1 : 0,
  );
  const totalItems = item.plan.length;

  const inProgressIndex = item.plan.findIndex(
    (i) => i.status === "in_progress",
  );
  const scrollIndex =
    completedItems === totalItems ? totalItems - 1 : inProgressIndex;
  useEffect(() => {
    const firstInProgressItem = firstInProgressItemRef.current;
    if (scrollIndex < 0 || !firstInProgressItem) {
      return;
    }
    firstInProgressItem.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [scrollIndex]);
  const targetHeight = isExpanded ? contentHeightPx : 0;

  return (
    <InProgressFixedContentItem
      onClick={() => setIsExpanded((e) => !e)}
      action={
        <button
          type="button"
          className="text-token-input-placeholder-foreground hover:bg-transparent hover:text-token-foreground focus-visible:outline-none"
        >
          {isExpanded ? (
            <CollapseIcon className="icon-2xs" />
          ) : (
            <ExpandIcon className="icon-2xs" />
          )}
        </button>
      }
      expandedContent={
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
          <div
            ref={contentRef}
            className="flex flex-col gap-2 bg-token-input-background/70 p-2 backdrop-blur-sm"
          >
            <div className="vertical-scroll-fade-mask max-h-40 space-y-2 overflow-y-auto [--edge-fade-distance:2rem]">
              {item.plan.map((p, i) => (
                <div
                  ref={i === inProgressIndex ? firstInProgressItemRef : null}
                  id={`plan-item-${i}`}
                  key={i}
                  className="flex items-start gap-2"
                >
                  <div className="flex flex-shrink-0 items-start gap-0.5">
                    <StatusBadge isComplete={isComplete} status={p.status} />
                    <span className="text-size-chat leading-4">
                      {intl.formatMessage(
                        {
                          id: "codex.todoPlan.stepIndexPrefix",
                          defaultMessage: "{index}.",
                          description:
                            "Prefix numbering for a plan step, including a trailing period",
                        },
                        { index: i + 1 },
                      )}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      "text-size-chat flex-1 leading-4",
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
      }
    >
      <div className="flex min-w-0 items-center">
        <div className="text-size-chat flex min-w-0 items-center gap-1">
          <AnimatePresence initial={false}>
            {!isComplete && (
              <motion.div
                className="flex items-center justify-center text-token-input-placeholder-foreground opacity-60"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <TaskIcon className="icon-xs text-token-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            <span className="min-w-0 truncate text-token-input-placeholder-foreground">
              <FormattedMessage
                id="localConversationPage.planItemsCompleted"
                defaultMessage="{completedItems} out of {totalItems, plural, one {# task completed} other {# tasks completed}}"
                description="Title for a plan that the model generates font-medium"
                values={{ completedItems, totalItems }}
              />
            </span>
          </AnimatePresence>
        </div>
      </div>
    </InProgressFixedContentItem>
  );
}

function StatusBadge({
  status,
  isComplete,
}: {
  status: "pending" | "in_progress" | "completed";
  isComplete: boolean;
}): React.ReactNode {
  const containerClassName =
    "flex h-3.5 w-4.5 items-center justify-center overflow-hidden";
  const iconClassName = "icon-3xs shrink-0";

  switch (status) {
    case "pending":
      return isComplete ? (
        <div className={containerClassName}>
          <XCircle className={iconClassName} />
        </div>
      ) : (
        <div className={containerClassName}>
          <UnselectedCircle className={iconClassName} />
        </div>
      );
    case "in_progress":
      return isComplete ? (
        <div className={containerClassName}>
          <XCircle className={iconClassName} />
        </div>
      ) : (
        <div className={containerClassName}>
          <Spinner className="h-[9px] w-[9px]" />
        </div>
      );
    case "completed":
      return (
        <div className={containerClassName}>
          <CheckCircle className={iconClassName} />
        </div>
      );
  }
}
