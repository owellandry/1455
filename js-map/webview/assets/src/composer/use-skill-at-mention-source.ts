import sortBy from "lodash/sortBy";

import { getSkillDescription } from "@/skills/get-skill-description";
import { useSkills } from "@/skills/use-skills";

import type {
  AtMentionMenuSection,
  AtMentionSourceState,
} from "./at-mention-source-types";
import { getSkillMentionIcon } from "./mention-icons";
import { getMentionInsertItemFromSkill } from "./mention-item";
import { scoreQueryMatch } from "./score-query-match";

const SKILLS_SECTION_TITLE = {
  id: "composer.atMentionList.skills",
  defaultMessage: "Skills",
  description: "Section header for skill results in the @ mention list.",
} as const;

const SKILLS_LOADING_STATE = {
  id: "composer.atMentionList.skillsLoading",
  defaultMessage: "Loading skills…",
  description:
    "Shown in the skills section when skill discovery is loading and no results have arrived yet",
} as const;

export function useSkillAtMentionSource({
  appServerManager,
  query,
  roots,
}: {
  appServerManager?: Parameters<typeof useSkills>[1];
  query: string;
  roots: Array<string>;
}): AtMentionSourceState {
  const { skills, isLoading } = useSkills(roots, appServerManager);
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return { sections: [] };
  }
  const enabledSkills = skills.filter((skill) => skill.enabled);
  const filteredSkills = sortSkillsByQuery(enabledSkills, trimmedQuery).filter(
    (skill) => hasStrictSkillMatch(skill, trimmedQuery),
  );
  const emptyState =
    isLoading && filteredSkills.length === 0 ? SKILLS_LOADING_STATE : null;
  if (filteredSkills.length === 0 && emptyState == null) {
    return { sections: [] };
  }

  const sections: Array<AtMentionMenuSection> = [
    {
      id: "skills",
      title: SKILLS_SECTION_TITLE,
      items: filteredSkills.map((skill) => {
        const mention = getMentionInsertItemFromSkill(skill);
        return {
          key: `skill:${mention.path}`,
          label: mention.displayName,
          detail: getSkillDescription(skill),
          icon: getSkillMentionIcon(),
          insertMention: ({ composerController, mentionState }): void => {
            composerController.insertMentionFromAtMention(
              mention,
              mentionState,
            );
          },
        };
      }),
      emptyState,
      isLoading,
    },
  ];

  return {
    sections,
  };
}

function sortSkillsByQuery<
  T extends {
    enabled: boolean;
    description: string;
    displayName?: string | null;
    name: string;
    path: string;
  },
>(skills: Array<T>, query: string): Array<T> {
  return sortBy(
    skills.map((skill, index) => ({
      skill,
      score: getSkillMatchScore(skill, query),
      index,
    })),
    [
      (entry): number => -entry.score,
      (entry): string =>
        entry.skill.displayName == null || entry.skill.displayName === ""
          ? entry.skill.name
          : entry.skill.displayName,
      (entry): number => entry.index,
    ],
  ).map((entry) => entry.skill);
}

function getSkillMatchScore<
  T extends {
    description: string;
    displayName?: string | null;
    name: string;
    path: string;
  },
>(skill: T, query: string): number {
  return Math.max(
    scoreQueryMatch(skill.name, query),
    scoreQueryMatch(skill.displayName ?? "", query),
    scoreQueryMatch(`@${skill.displayName ?? skill.name}`, query),
    scoreQueryMatch(skill.description, query),
    scoreQueryMatch(skill.path, query),
  );
}

export function hasStrictSkillMatch<
  T extends {
    description: string;
    displayName?: string | null;
    name: string;
    path: string;
  },
>(skill: T, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  return [
    skill.name,
    skill.displayName ?? "",
    `@${skill.displayName ?? skill.name}`,
    skill.description,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}
