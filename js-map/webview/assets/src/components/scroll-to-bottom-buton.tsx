import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

import ArrowUpIcon from "@/icons/arrow-up.svg";

export function AnimatedScrollToBottomButton({
  className,
  label,
  onClick,
  show,
}: {
  className?: string;
  label: string;
  onClick: () => void;
  show: boolean;
}): React.ReactElement {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <button
            className={clsx(
              "cursor-pointer absolute z-30 rounded-full bg-clip-padding border text-token-text-secondary border-token-border-default end-1/2 translate-x-1/2 bg-token-main-surface-primary w-8 h-8 flex items-center justify-center print:hidden",
              className,
            )}
            aria-label={label}
            type="button"
            onClick={onClick}
          >
            <ArrowUpIcon className="icon rotate-180 text-token-text-primary" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
