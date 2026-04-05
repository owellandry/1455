import { formatSkillTitle } from "@/skills/format-skill-title";

import type { InstalledPlugin } from "./use-plugins";

export function getPluginDisplayName(plugin: InstalledPlugin): string {
  return plugin.displayName ?? formatSkillTitle(plugin.plugin.name);
}
