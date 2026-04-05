import { motion } from "framer-motion";
import { FormattedMessage } from "react-intl";

import HeartIcon from "@/icons/heart.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";

import { TimelineItem } from "./timeline-item";

export function HeartbeatDividerItemContent(): React.ReactElement {
  return (
    <TimelineItem padding="offset">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={ACCORDION_TRANSITION}
      >
        <div className="text-size-chat flex min-h-0 items-center gap-2 overflow-hidden text-token-text-secondary">
          <div className="flex-1 border-t border-current/20" />
          <HeartIcon
            aria-hidden
            className="icon-sm shrink-0 text-token-foreground/60"
          />
          <span className="sr-only">
            <FormattedMessage
              id="localConversation.heartbeatAutomationDivider"
              defaultMessage="Heartbeat"
              description="Accessible label for the divider shown for heartbeat automation trigger messages"
            />
          </span>
          <div className="flex-1 border-t border-current/20" />
        </div>
      </motion.div>
    </TimelineItem>
  );
}
