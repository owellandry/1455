import { escapePromptLinkPath } from "@/composer/prosemirror/prompt-link-path";
import { persistedAtom } from "@/utils/persisted-atom";

export type CreatorPrefillKind = "plugin" | "skill";

const CREATOR_PREFILL_CONFIG = {
  plugin: {
    firstUsePrompt: "help me create a plugin",
    skillName: "plugin-creator",
  },
  skill: {
    firstUsePrompt: "help me create a skill",
    skillName: "skill-creator",
  },
} satisfies Record<
  CreatorPrefillKind,
  {
    firstUsePrompt: string;
    skillName: string;
  }
>;

export const aHasOpenedPluginCreatorPrefill = persistedAtom<boolean>(
  "has-opened-plugin-creator-prefill-v1",
  false,
);

export const aHasOpenedSkillCreatorPrefill = persistedAtom<boolean>(
  "has-opened-skill-creator-prefill-v1",
  false,
);

export function getCreatorPrefillPrompt({
  creatorPath,
  isFirstOpen,
  kind,
}: {
  creatorPath: string;
  isFirstOpen: boolean;
  kind: CreatorPrefillKind;
}): string {
  const config = CREATOR_PREFILL_CONFIG[kind];
  const creatorChip = `[$${config.skillName}](${escapePromptLinkPath(creatorPath)})`;

  return isFirstOpen
    ? `${creatorChip} ${config.firstUsePrompt}`
    : `${creatorChip} `;
}
