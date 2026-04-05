import clsx from "clsx";
import { motion } from "framer-motion";
import { useState } from "react";

import ChevronIcon from "@/icons/chevron.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import { useMeasuredElementHeight } from "../use-measured-element-height";
import type { StreamErrorLocalConversationItem } from "./local-conversation-item";
import { TimelineItem } from "./timeline-item";

export function StreamErrorContent({
  item,
}: {
  item: StreamErrorLocalConversationItem;
}): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const details = item.additionalDetails;
  const hasDropdown = details != null && details.trim().length > 0;
  const isBodyVisible = hasDropdown && isExpanded && details != null;
  const targetHeight = isBodyVisible ? contentHeightPx : 0;
  return (
    <TimelineItem>
      <div className="flex min-w-0 flex-col">
        <div
          className={clsx(
            "group flex min-w-0 items-start gap-1",
            hasDropdown ? "cursor-interaction" : "cursor-default",
          )}
          onClick={(): void => {
            if (!hasDropdown) {
              return;
            }
            setIsExpanded((prev): boolean => !prev);
          }}
        >
          <div className="text-size-chat min-w-0 whitespace-pre-wrap text-token-description-foreground/80">
            {item.content}
          </div>
          {hasDropdown && (
            <ChevronIcon
              className={clsx(
                "text-token-input-placeholder-foreground icon-2xs mt-0.5 flex-shrink-0 transition-all duration-300 opacity-0 group-hover:opacity-100",
                isExpanded && "opacity-100",
                isExpanded ? "rotate-180" : "",
              )}
            />
          )}
        </div>

        <motion.div
          initial={false}
          animate={{
            height: targetHeight,
            opacity: isBodyVisible ? 1 : 0,
          }}
          transition={ACCORDION_TRANSITION}
          className={clsx(
            isBodyVisible ? "overflow-visible" : "overflow-hidden",
          )}
          style={{ pointerEvents: isBodyVisible ? "auto" : "none" }}
        >
          <div ref={contentRef}>
            {isBodyVisible ? (
              <div className="mt-1 flex flex-col gap-1">
                <div className="text-size-chat whitespace-pre-wrap text-token-description-foreground/80">
                  {details}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </TimelineItem>
  );
}
