import { registerCustomTheme } from "@pierre/diffs";

import { getRegisteredCodeThemes } from "@/theme/code-theme";

for (const theme of getRegisteredCodeThemes()) {
  registerCustomTheme(theme.name, theme.load);
}
