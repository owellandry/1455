import type React from "react";

import { fileIconComponents, getFileIconKey } from "@/files/get-file-icon";
import SkillsIcon from "@/icons/skills.svg";

export type IconComponent = React.ComponentType<{ className?: string }>;

/** Picks an icon for file mentions using extension and mime type fallbacks. */
export function getFileMentionIcon(path: string | undefined): IconComponent {
  return fileIconComponents[getFileIconKey(path)];
}

/** Skill icons are centralized so mentions align with future skill badges. */
export function getSkillMentionIcon(): IconComponent {
  return SkillsIcon;
}
