import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

import { Badge } from "@/components/badge";

const featureChipBaseClassName =
  "border-token-border-default text-token-text-secondary inline-flex shrink-0 items-center rounded-sm border bg-transparent px-0.5 py-px text-s font-light leading-none";

const featureChipVariants = {
  experimental: "",
  neutral: "",
  new: clsx(
    "!border-transparent",
    "!bg-token-text-link-foreground/10",
    "!text-token-text-link-foreground",
    "font-semibold",
  ),
} satisfies Record<string, string>;

type FeatureChipVariant = keyof typeof featureChipVariants;

export function FeatureChip({
  className,
  label,
  variant = "neutral",
}: {
  className?: string;
  label: ReactNode;
  variant?: FeatureChipVariant;
}): ReactElement {
  return (
    <Badge
      className={clsx(
        featureChipBaseClassName,
        featureChipVariants[variant],
        className,
      )}
    >
      {label}
    </Badge>
  );
}
