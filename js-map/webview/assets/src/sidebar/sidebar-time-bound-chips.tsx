import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { FeatureChip } from "@/components/feature-chip";
import { useTimeBoundAnnouncement } from "@/hooks/use-time-bound-announcement";

import type { SidebarTimeBoundChipConfig } from "./sidebar-time-bound-chip-config";

export function SidebarTimeBoundChip({
  chipConfig,
}: {
  chipConfig: SidebarTimeBoundChipConfig;
}): ReactElement | null {
  if (!chipConfig.enabled) {
    return null;
  }

  return <SidebarTimeBoundChipWithAnnouncement chipConfig={chipConfig} />;
}

function SidebarTimeBoundChipWithAnnouncement({
  chipConfig,
}: {
  chipConfig: SidebarTimeBoundChipConfig;
}): ReactElement | null {
  const { shouldShow } = useTimeBoundAnnouncement({
    campaignId: chipConfig.campaignId,
    startsAtMs: chipConfig.startsAtMs,
    endsAtMs: chipConfig.endsAtMs,
    storageNamespace: chipConfig.storageNamespace,
  });

  if (!shouldShow) {
    return null;
  }

  return (
    <FeatureChip
      label={<FormattedMessage {...chipConfig.chipLabel} />}
      variant={chipConfig.variant ?? "neutral"}
    />
  );
}
