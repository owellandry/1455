import clsx from "clsx";
import sortBy from "lodash/sortBy";
import uniqBy from "lodash/uniqBy";
import type { ComponentType } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useCurrentAccount } from "@/codex-api";
import { ConnectorLogo } from "@/components/connector-logo";
import { scoreQueryMatch } from "@/composer/score-query-match";
import { useEnabledInstalledApps } from "@/queries/apps-queries";
import { getSkillScopeLabel } from "@/skills/format-skill-scope";
import { useSkills } from "@/skills/use-skills";
import { useListNavigation } from "@/utils/list-navigation";

import { getSkillMentionIcon } from "./mention-icons";
import {
  getMentionInsertItemFromApp,
  getMentionInsertItemFromSkill,
  type ComposerMentionInsertItem,
} from "./mention-item";
import {
  MentionListContainer,
  MentionListPlaceholderRow,
  MentionListRow,
  MentionListScrollArea,
} from "./mention-list";

type SkillMentionListItem = ComposerMentionInsertItem & {
  key: string;
  scopeLabel: string;
  appLogoUrl?: string | null;
  appLogoDarkUrl?: string | null;
  Icon?: ComponentType<{ className?: string }>;
};

export function SkillMentionList({
  query,
  onUpdateSelectedMention,
  onAddMention,
  cwd,
  roots,
  appServerManager,
}: {
  query: string;
  onUpdateSelectedMention: (item: ComposerMentionInsertItem | null) => void;
  onAddMention: (item: ComposerMentionInsertItem) => void;
  cwd?: string;
  roots?: Array<string>;
  appServerManager?: Parameters<typeof useSkills>[1];
}): React.ReactElement | null {
  const intl = useIntl();
  const { data: account } = useCurrentAccount();
  const apps = useEnabledInstalledApps();
  const { skills, isLoading: isSkillsLoading } = useSkills(
    roots ?? cwd,
    appServerManager,
  );
  const rootsForLabel = roots ?? (cwd ? [cwd] : []);
  const appLabel = intl.formatMessage({
    id: "composer.skillMentionList.app",
    defaultMessage: "App",
    description:
      "Label shown on the right side of app entries in the skill/app mention list",
  });
  const mentionItems: Array<SkillMentionListItem> = [
    ...uniqBy(
      skills
        .filter((skill) => skill.enabled)
        .map((skill) => {
          const mention = getMentionInsertItemFromSkill(skill);
          return {
            ...mention,
            key: mention.path,
            scopeLabel: getSkillScopeLabel({
              skill,
              intl,
              roots: rootsForLabel,
              adminLabel: account?.name ?? undefined,
            }),
            Icon: getSkillMentionIcon(),
          };
        }),
      (item) => item.path,
    ),
    ...apps.map((app) => {
      const mention = getMentionInsertItemFromApp(app);
      return {
        ...mention,
        key: mention.path,
        scopeLabel: appLabel,
        appLogoUrl: app.logoUrl,
        appLogoDarkUrl: app.logoUrlDark,
      };
    }),
  ];
  const filteredItems = filterMentionItemsByQuery(mentionItems, query);
  const filteredItemKeys = filteredItems.map((item) => item.key);
  const isLoading = isSkillsLoading && filteredItems.length === 0;

  const { highlightedIndex, listRef, getItemProps } = useListNavigation<string>(
    {
      items: filteredItemKeys,
      isActive: filteredItems.length > 0,
      captureWindowKeydown: true,
      onSelect: (_itemKey, index) => {
        const item = filteredItems[index];
        if (item == null) {
          return;
        }
        onUpdateSelectedMention(item);
        onAddMention(item);
      },
      onHighlight: (_itemKey, index) => {
        const item = index >= 0 ? filteredItems[index] : null;
        onUpdateSelectedMention(item);
      },
    },
  );

  return (
    <MentionListContainer className="max-h-[240px] electron:text-base browser:text-base">
      <MentionListScrollArea listRef={listRef}>
        {isLoading ? (
          <MentionListPlaceholderRow>
            <FormattedMessage
              id="composer.skillMentionList.loading"
              defaultMessage="Loading skills and apps…"
              description="Shown while skill and app mentions are loading"
            />
          </MentionListPlaceholderRow>
        ) : filteredItems.length === 0 ? (
          <MentionListPlaceholderRow>
            <FormattedMessage
              id="composer.skillMentionList.noResults"
              defaultMessage="No skills or apps found"
              description="Shown when no skill or app mentions match the query"
            />
          </MentionListPlaceholderRow>
        ) : (
          filteredItems.map((item, idx) => {
            const FallbackIcon = getSkillMentionIcon();
            return (
              <MentionListRow
                key={item.key}
                getItemProps={getItemProps}
                highlighted={idx === highlightedIndex}
                itemIndex={idx}
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  {item.kind === "app" ? (
                    <ConnectorLogo
                      alt={intl.formatMessage(
                        {
                          id: "composer.skillMentionList.appLogoAlt",
                          defaultMessage: "{name} logo",
                          description:
                            "Alt text for app logos in the skill/app mention list",
                        },
                        {
                          name: item.displayName,
                        },
                      )}
                      className="icon-xs shrink-0 object-contain"
                      logoUrl={item.appLogoUrl}
                      logoDarkUrl={item.appLogoDarkUrl}
                      fallback={<FallbackIcon className="icon-xs shrink-0" />}
                    />
                  ) : item.Icon ? (
                    <item.Icon className="icon-xs shrink-0" />
                  ) : (
                    <FallbackIcon className="icon-xs shrink-0" />
                  )}
                  <span className="flex-shrink-0 truncate">
                    {item.displayName}
                  </span>
                  <span className="flex-1 truncate text-token-description-foreground">
                    {item.description}
                  </span>
                  <span
                    className={clsx(
                      "ml-auto text-token-description-foreground shrink-0",
                    )}
                  >
                    {item.scopeLabel}
                  </span>
                </div>
              </MentionListRow>
            );
          })
        )}
      </MentionListScrollArea>
    </MentionListContainer>
  );
}

function filterMentionItemsByQuery(
  items: Array<SkillMentionListItem>,
  query: string,
): Array<SkillMentionListItem> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return items;
  }

  return sortBy(
    items.map((item, index) => ({
      item,
      score: getMentionMatchScore(item, trimmedQuery),
      index,
    })),
    [
      (entry): number => -entry.score,
      (entry): string => entry.item.displayName,
      (entry): number => entry.index,
    ],
  )
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.item);
}

function getMentionMatchScore(
  item: SkillMentionListItem,
  query: string,
): number {
  return Math.max(
    scoreQueryMatch(item.name, query),
    scoreQueryMatch(item.displayName, query),
    scoreQueryMatch(item.path, query),
  );
}
