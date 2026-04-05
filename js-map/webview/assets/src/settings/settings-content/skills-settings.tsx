import type { ReactElement } from "react";

import { SkillsPage } from "@/skills/skills-page";

import { SettingsContentLayout } from "../settings-content-layout";

export function SkillsSettings(): ReactElement {
  return (
    <SettingsContentLayout>
      <SkillsPage />
    </SettingsContentLayout>
  );
}
