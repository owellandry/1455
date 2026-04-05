type SidebarFeatureChipVariant = "experimental" | "neutral" | "new";

type SidebarChipMessage = {
  description: string;
  defaultMessage: string;
  id: string;
};

export type SidebarTimeBoundChipConfig = {
  campaignId: string;
  chipLabel: SidebarChipMessage;
  enabled: boolean;
  endsAtMs?: number;
  startsAtMs?: number;
  storageNamespace?: string;
  variant?: SidebarFeatureChipVariant;
};

export const skillsAppsNewChipConfig: SidebarTimeBoundChipConfig = {
  enabled: false,
  campaignId: "skills-apps-sidebar-new-chip-2026-02",
  startsAtMs: Date.UTC(2026, 1, 24),
  endsAtMs: Date.UTC(2026, 2, 3),
  storageNamespace: "sidebar-feature-chip",
  chipLabel: {
    id: "sidebarElectron.skillsAppsRouteNavLink.newChip",
    defaultMessage: "New",
    description:
      "Time-bound chip shown next to the Skills & Apps nav link in the Electron sidebar",
  },
  variant: "new",
};
