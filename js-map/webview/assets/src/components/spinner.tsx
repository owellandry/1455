import clsx from "clsx";
import { useMemo } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import SpinnerIcon from "@/icons/spinner.svg";

export function Spinner({
  className,
  animationDurationMs,
}: {
  className?: string;
  animationDurationMs?: number;
}): React.ReactElement {
  const reducedMotion = useReducedMotion();

  // Use a negative animation delay based on absolute time so that
  // multiple spinners mounted at different times appear phase-aligned
  // and don't snap during transitions.
  const animationDelay = useMemo(() => {
    // oxlint-disable-next-line react-hooks-js/purity
    const now = Date.now();
    const offset = now % 1000;
    return `-${offset}ms`;
  }, []);

  const animationDuration =
    animationDurationMs != null ? `${animationDurationMs}ms` : undefined;

  return (
    <div
      className={clsx(
        !reducedMotion && "animate-spin",
        "inline-flex w-fit h-fit contain-paint contain-layout contain-style",
      )}
      style={{ animationDelay, animationDuration }}
    >
      <SpinnerIcon className={className} />
    </div>
  );
}
