import type { ReactElement } from "react";

import { PluginsPage } from "@/skills/plugins-page";

import { SettingsContentLayout } from "../settings-content-layout";

export function PluginsSettings(): ReactElement {
  return (
    <SettingsContentLayout>
      <PluginsPage />
    </SettingsContentLayout>
  );
}
