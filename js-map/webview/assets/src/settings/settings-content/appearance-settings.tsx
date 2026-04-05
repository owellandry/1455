import type { ReactElement } from "react";

import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";

import { AppearanceSettingsContent } from "./general-settings";

export function AppearanceSettings(): ReactElement {
  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug="appearance" />}
    >
      <AppearanceSettingsContent />
    </SettingsContentLayout>
  );
}
