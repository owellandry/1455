import clsx from "clsx";
import { motion } from "framer-motion";
import type { CSSProperties, ReactElement, ReactNode } from "react";

const ENTER_TRANSITION = {
  duration: 0.15,
  ease: [0.19, 1, 0.22, 1],
} as const;
const EXIT_TRANSITION = {
  duration: 0.15,
  ease: [0.65, 0, 0.4, 1],
} as const;

export function SidebarListItem({
  children,
  className,
  disableLayout = false,
  nodeRef,
  style,
}: {
  children: ReactNode;
  className?: string;
  disableLayout?: boolean;
  nodeRef?: (node: HTMLDivElement | null) => void;
  style?: CSSProperties;
}): ReactElement {
  return (
    <motion.div
      ref={nodeRef}
      className={clsx(
        "overflow-hidden will-change-[height,opacity,transform]",
        className,
      )}
      layout={disableLayout ? false : "position"}
      transition={{
        layout: { duration: 0.3, ease: ENTER_TRANSITION.ease },
      }}
      style={style}
      initial={{ opacity: 0, height: 0 }}
      animate={{
        opacity: 1,
        height: "auto",
        transition: ENTER_TRANSITION,
      }}
      exit={{
        opacity: 0,
        height: 0,
        transition: EXIT_TRANSITION,
      }}
      role="listitem"
    >
      {children}
    </motion.div>
  );
}
