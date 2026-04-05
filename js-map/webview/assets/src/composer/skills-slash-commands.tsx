import type * as AppServer from "app-server-types";
import clsx from "clsx";
import sortBy from "lodash/sortBy";
import uniqBy from "lodash/uniqBy";
import { useIntl } from "react-intl";

import { useCurrentAccount } from "@/codex-api";
import {
  formatSkillScopeLabel,
  getSkillScopeLabel,
} from "@/skills/format-skill-scope";
import { getSkillDescription } from "@/skills/get-skill-description";
import { getSkillDisplayName } from "@/skills/skill-utils";
import { useSkills } from "@/skills/use-skills";

import { getSkillMentionIcon } from "./mention-icons";
import type { MentionUiState } from "./prosemirror/mentions-shared";
import { useComposerController } from "./prosemirror/use-composer-controller";
import { useProvideSlashCommand } from "./slash-commands/slash-command";

export function SkillsSlashCommands({
  cwd,
  roots,
  appServerManager,
}: {
  cwd?: string;
  roots?: Array<string>;
  appServerManager?: Parameters<typeof useSkills>[1];
}): React.ReactElement | null {
  const intl = useIntl();
  const { data: account } = useCurrentAccount();
  const { skills } = useSkills(roots ?? cwd, appServerManager);
  const composerController = useComposerController();
  const skillsGroupLabel = intl.formatMessage({
    id: "composer.slashCommands.skillsGroup",
    defaultMessage: "Skills",
    description: "Group heading for skill slash commands",
  });
  const uniqueSkills = uniqBy(
    skills.filter((skill) => skill.enabled),
    (skill) => skill.path,
  );
  const sortedSkills = sortBy(uniqueSkills, (skill) =>
    skill.name.toLowerCase(),
  );

  return (
    <>
      {sortedSkills.map((skill) => (
        <SkillSlashCommand
          key={skill.path}
          skill={skill}
          composerController={composerController}
          scopeLabel={getSkillScopeLabel({
            skill,
            intl,
            roots: roots ?? (cwd ? [cwd] : []),
            fallbackRepoLabel: formatSkillScopeLabel({ scope: "repo", intl }),
            adminLabel: account?.name ?? undefined,
          })}
          groupLabel={skillsGroupLabel}
        />
      ))}
    </>
  );
}

function SkillSlashCommand({
  skill,
  composerController,
  scopeLabel,
  groupLabel,
}: {
  skill: AppServer.v2.SkillMetadata;
  composerController: ReturnType<typeof useComposerController>;
  scopeLabel: string;
  groupLabel: string;
}): React.ReactElement | null {
  const description = getSkillDescription(skill);
  const displayName = getSkillDisplayName(skill);
  const ScopeBadge = ({
    className,
  }: {
    className?: string;
  }): React.ReactElement => (
    <span
      className={clsx(
        "ml-auto text-token-description-foreground shrink-0",
        className,
      )}
      style={{ width: "auto", height: "auto" }}
    >
      {scopeLabel}
    </span>
  );

  useProvideSlashCommand({
    id: `skill:${skill.path}`,
    title: displayName,
    description,
    requiresEmptyComposer: false,
    Icon: getSkillMentionIcon(),
    RightIcon: ScopeBadge,
    group: groupLabel,
    onSelect: async (): Promise<void> => {
      composerController.insertSkillMentionAtSelection(skill);
    },
    onSelectFromInlineSlash: async (ui: MentionUiState): Promise<void> => {
      composerController.insertSkillMentionFromSlashCommand(skill, ui);
    },
    dependencies: [
      composerController,
      displayName,
      description,
      skill.path,
      skill.interface?.iconSmall,
      skill.interface?.iconLarge,
      scopeLabel,
      groupLabel,
    ],
  });
  return null;
}
