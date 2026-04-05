import clsx from "clsx";
import { motion } from "framer-motion";
import { FormattedMessage } from "react-intl";

import { ACCORDION_TRANSITION } from "@/utils/animations";

import { TimelineItem } from "./timeline-item";

export function WorkedForLabel({
  timeLabel,
  className,
}: {
  timeLabel: string;
  className?: string;
}): React.ReactElement {
  return (
    <span className={clsx("text-token-foreground/60", className)}>
      <FormattedMessage
        id="localConversation.workedFor"
        defaultMessage="Worked for {time}"
        description="Divider shown between agent activity and the final assistant response in a completed turn"
        values={{
          time: timeLabel,
        }}
      />
    </span>
  );
}

export function WorkedForItemContent({
  timeLabel,
}: {
  timeLabel: string;
}): React.ReactElement {
  return (
    <TimelineItem padding="offset">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={ACCORDION_TRANSITION}
        style={{ overflow: "hidden" }}
      >
        <div className="text-size-chat flex min-h-0 items-center gap-2 overflow-hidden text-token-text-secondary">
          <div className="flex-1 border-t border-current/20" />
          <WorkedForLabel timeLabel={timeLabel} />
          <div className="flex-1 border-t border-current/20" />
        </div>
      </motion.div>
    </TimelineItem>
  );
}
