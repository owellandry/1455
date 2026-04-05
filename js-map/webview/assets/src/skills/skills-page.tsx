import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { useScope } from "maitai";
import type { RecommendedSkillMetadata } from "protocol";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useCurrentAccount } from "@/codex-api";
import { Button } from "@/components/button";
import { LargeEmptyState } from "@/components/large-empty-state";
import { CODEX_SKILLS_URL } from "@/constants/links";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import { useWindowType } from "@/hooks/use-window-type";
import PlusIcon from "@/icons/plus.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import {
  formatSkillScopeLabel,
  getRepoLabelFromRoots,
} from "@/skills/format-skill-scope";
import { getSkillDescription } from "@/skills/get-skill-description";
import { PageSearchInput } from "@/skills/page-search-input";
import { PluginsPage } from "@/skills/plugins-page";
import { isRecommendedSkillInstalled } from "@/skills/plugins-page-selectors";
import { getRepoRootForSkillPath } from "@/skills/plugins-page-utils";
import { RecommendedSkillCard } from "@/skills/recommended-skill-card";
import { SkillCard } from "@/skills/skill-card";
import { getSkillDisplayName } from "@/skills/skill-utils";
import {
  useInstallRecommendedSkill,
  useInstalledSkillsData,
  useRecommendedSkillsData,
  useSkillsPagePaths,
} from "@/skills/use-skills-page-data";
import { ThreadPageHeader } from "@/thread-layout/thread-page-header";
import { useElementInView } from "@/utils/use-element-in-view";

import {
  aHasOpenedSkillCreatorPrefill,
  getCreatorPrefillPrompt,
} from "./creator-prefill";

import styles from "./skills-page-grid.module.css";

export function SkillsPage(): ReactElement {
  const pluginsFeatureEnabled = useIsPluginsEnabled();
  if (pluginsFeatureEnabled) {
    return <PluginsPage />;
  }
  return <SkillsTab />;
}

function SkillsTab(): ReactElement {
  const intl = useIntl();
  const windowType = useWindowType();
  const scope = useScope(AppScope);
  const { data: account } = useCurrentAccount();
  const startNewConversation = useStartNewConversation();
  const skillsLearnMoreUrl = CODEX_SKILLS_URL;
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [heroContainer, setHeroContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const isHeroVisible = useElementInView({
    container: scrollContainer,
    target: heroContainer,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [needsSkillsRefresh, setNeedsSkillsRefresh] = useState(false);
  const hasOpenedSkillCreatorPrefill = useAtomValue(
    aHasOpenedSkillCreatorPrefill,
  );
  const setHasOpenedSkillCreatorPrefill = useSetAtom(
    aHasOpenedSkillCreatorPrefill,
  );
  const {
    forceReloadSkills,
    installedSkillMatchKeys,
    isFetching: isFetchingSkills,
    isLoading: isLoadingSkills,
    markSkillsUpdated,
    skills,
    workspaceRoots,
  } = useInstalledSkillsData();
  const {
    canInstallRecommendedSkills,
    defaultRecommendedRepoRoot,
    skillCreatorPath,
  } = useSkillsPagePaths();
  const {
    errorMessage: recommendedSkillsErrorMessage,
    isLoading: isLoadingRecommendedSkills,
    refresh: refreshRecommendedSkills,
    repoRoot: recommendedRepoRoot,
    skills: recommendedSkills,
  } = useRecommendedSkillsData(defaultRecommendedRepoRoot);
  const { installRecommendedSkill, installingSkillId } =
    useInstallRecommendedSkill({
      forceReloadSkills,
      onInstalled: (): void => {
        setNeedsSkillsRefresh(true);
      },
    });
  const scopeFilterRepoLabel = formatSkillScopeLabel({
    scope: "repo",
    intl,
  });
  const scopeFilterAdminLabel = formatSkillScopeLabel({
    scope: "admin",
    intl,
    adminLabel: account?.name ?? undefined,
  });
  const getScopeBadgeLabel = ({
    scope,
    skillPath,
  }: {
    scope: AppServer.v2.SkillScope;
    skillPath: string;
  }): string => {
    return formatSkillScopeLabel({
      scope,
      intl,
      repoLabel: getRepoLabelFromRoots({
        skillPath,
        roots: workspaceRoots,
        fallbackLabel: scopeFilterRepoLabel,
      }),
      adminLabel: scopeFilterAdminLabel,
    });
  };

  const searchQueryNormalized = searchQuery.trim().toLowerCase();
  const filteredInstalledSkills = skills.filter(({ skill }) => {
    if (searchQueryNormalized.length === 0) {
      return true;
    }
    const description = getSkillDescription(skill).toLowerCase();
    const displayName = getSkillDisplayName(skill).toLowerCase();
    return (
      skill.name.toLowerCase().includes(searchQueryNormalized) ||
      displayName.includes(searchQueryNormalized) ||
      description.includes(searchQueryNormalized)
    );
  });
  const handleRefreshSkills = async (): Promise<void> => {
    await Promise.all([forceReloadSkills(), refreshRecommendedSkills()]);
    setNeedsSkillsRefresh(false);
  };

  useEffect(() => {
    document.documentElement.dataset.hideHeaderDivider = "true";
    return (): void => {
      delete document.documentElement.dataset.hideHeaderDivider;
    };
  }, []);

  return (
    <div className="flex h-full flex-col text-base">
      <ThreadPageHeader
        start={
          isHeroVisible ? null : (
            <FormattedMessage
              id="skills.page.heading"
              defaultMessage="Skills"
              description="Header title for the skills page"
            />
          )
        }
        trailing={
          <div className="flex flex-nowrap items-center gap-1.5">
            <Button
              color={needsSkillsRefresh ? "secondary" : "ghost"}
              size="toolbar"
              onClick={(): void => {
                void handleRefreshSkills();
              }}
              disabled={isLoadingSkills || isFetchingSkills}
            >
              <RegenerateIcon className="icon-xs" />
              <span className="hidden lg:inline">
                {needsSkillsRefresh ? (
                  <FormattedMessage
                    id="skills.page.refreshSkillsToUseNew"
                    defaultMessage="Refresh to use new skill(s)"
                    description="Button label shown when newly installed skills require a refresh before they can be used in the composer"
                  />
                ) : (
                  <FormattedMessage
                    id="skills.page.refreshSkills"
                    defaultMessage="Refresh"
                    description="Button label for reloading skills list"
                  />
                )}
              </span>
            </Button>
            <div className="hidden min-w-[160px] flex-1 lg:flex lg:w-[220px] lg:flex-none">
              <PageSearchInput
                id="skills-search"
                label={intl.formatMessage({
                  id: "skills.page.search.label",
                  defaultMessage: "Search skills",
                  description: "Label for the skills page search input",
                })}
                placeholder={intl.formatMessage({
                  id: "skills.page.search",
                  defaultMessage: "Search skills",
                  description: "Placeholder for the skills page search input",
                })}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            </div>
            <Button
              color="primary"
              size="toolbar"
              onClick={(): void => {
                if (!skillCreatorPath) {
                  return;
                }
                scope.get(productEventLogger$).log({
                  eventName: "codex_skill_new_clicked",
                });
                const prompt = getCreatorPrefillPrompt({
                  creatorPath: skillCreatorPath,
                  isFirstOpen: !hasOpenedSkillCreatorPrefill,
                  kind: "skill",
                });
                if (!hasOpenedSkillCreatorPrefill) {
                  setHasOpenedSkillCreatorPrefill(true);
                }
                // In VS Code settings webview, keep Settings open and prefill the sidebar composer.
                startNewConversation(
                  {
                    prefillPrompt: prompt,
                  },
                  { startInSidebar: true },
                );
              }}
              disabled={!skillCreatorPath}
            >
              <PlusIcon className="icon-xs" />
              <FormattedMessage
                id="skills.page.createSkill"
                defaultMessage="New skill"
                description="Button label for creating a new skill"
              />
            </Button>
          </div>
        }
      />
      <div
        className="flex-1 overflow-y-auto p-panel"
        ref={(node): void => {
          setScrollContainer(node);
        }}
      >
        <div
          className={clsx(
            "mx-auto flex min-h-full w-full max-w-[var(--thread-content-max-width)] flex-1 flex-col gap-8",
            windowType !== "extension" && styles.container,
          )}
        >
          <div className="flex items-end justify-between gap-4">
            <div
              className="flex flex-col gap-1"
              ref={(node): void => {
                setHeroContainer(node);
              }}
            >
              <div className="heading-xl font-normal text-token-foreground">
                <FormattedMessage
                  id="skills.page.heading"
                  defaultMessage="Skills"
                  description="Header title for the skills page"
                />
              </div>
              <div className="text-lg font-normal text-token-description-foreground">
                <FormattedMessage
                  id="skills.page.subheading"
                  defaultMessage="Give Codex superpowers. <link>Learn more</link>"
                  description="Subheading shown above the skills sections"
                  values={{
                    link: (chunks) => (
                      <a
                        href={skillsLearnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-token-link"
                      >
                        {chunks}
                      </a>
                    ),
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex min-h-0 w-full flex-1">
            <div className="flex min-h-0 flex-1 flex-col gap-9 pb-10">
              <SkillsSection
                title={
                  <FormattedMessage
                    id="skills.section.installed"
                    defaultMessage="Installed"
                    description="Heading for the installed skills section"
                  />
                }
              >
                <SkillsGrid
                  isLoading={isLoadingSkills}
                  uniqueSkillCount={skills.length}
                  filteredSkills={filteredInstalledSkills}
                  getScopeBadgeLabel={getScopeBadgeLabel}
                  roots={workspaceRoots}
                  onSkillsUpdated={markSkillsUpdated}
                />
              </SkillsSection>

              <SkillsSection
                title={
                  <FormattedMessage
                    id="skills.section.recommended"
                    defaultMessage="Recommended"
                    description="Heading for the recommended skills section"
                  />
                }
              >
                <RecommendedSkillsGrid
                  isLoading={isLoadingRecommendedSkills}
                  errorMessage={recommendedSkillsErrorMessage}
                  skills={recommendedSkills}
                  searchQuery={searchQuery}
                  canInstall={canInstallRecommendedSkills}
                  repoRoot={recommendedRepoRoot}
                  onInstall={installRecommendedSkill}
                  installedSkillMatchKeys={installedSkillMatchKeys}
                  installingSkillId={installingSkillId}
                />
              </SkillsSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillsSection({
  title,
  children,
}: {
  title: ReactElement;
  children: ReactElement;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <div className="pr-0.5 pl-2 text-base font-medium text-token-foreground opacity-75">
        {title}
      </div>
      {children}
    </section>
  );
}

function SkillsGrid({
  isLoading,
  uniqueSkillCount,
  filteredSkills,
  getScopeBadgeLabel,
  roots,
  onSkillsUpdated,
}: {
  isLoading: boolean;
  uniqueSkillCount: number;
  filteredSkills: Array<{
    skill: AppServer.v2.SkillMetadata;
  }>;
  getScopeBadgeLabel: (args: {
    scope: AppServer.v2.SkillScope;
    skillPath: string;
  }) => string;
  roots: Array<string>;
  onSkillsUpdated?: () => void;
}): ReactElement {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.page.loading"
              defaultMessage="Loading skills..."
              description="Loading label on the skills page"
            />
          }
        />
      </div>
    );
  }

  if (uniqueSkillCount === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.page.empty"
              defaultMessage="No skills found"
              description="Empty state on the skills page"
            />
          }
        />
      </div>
    );
  }

  if (filteredSkills.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.page.filteredEmpty"
              defaultMessage="No skills match your filters"
              description="Empty state when filters hide all skills"
            />
          }
          description={
            <FormattedMessage
              id="skills.page.filteredEmptyDescription"
              defaultMessage="Try adjusting your search or scope filters"
              description="Description for filtered skills empty state"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className={clsx("grid gap-4", styles.grid)}>
      {filteredSkills.map(({ skill }): ReactElement => {
        const scopeBadges =
          skill.scope === "repo"
            ? [
                <RepoScopeBadge
                  key={`${skill.path}-repo`}
                  label={getScopeBadgeLabel({
                    scope: "repo",
                    skillPath: skill.path,
                  })}
                />,
              ]
            : [];
        const repoRoot =
          skill.scope === "repo"
            ? getRepoRootForSkillPath({ skillPath: skill.path, roots })
            : null;
        return (
          <SkillCard
            key={skill.path}
            skill={skill}
            displayName={getSkillDisplayName(skill)}
            scopeBadges={scopeBadges}
            repoRoot={repoRoot}
            onSkillsUpdated={onSkillsUpdated}
          />
        );
      })}
    </div>
  );
}

function RepoScopeBadge({ label }: { label: string }): ReactElement {
  return <span className="text-token-description-foreground">{label}</span>;
}

function RecommendedSkillsGrid({
  isLoading,
  errorMessage,
  skills,
  searchQuery,
  canInstall,
  repoRoot,
  onInstall,
  installedSkillMatchKeys,
  installingSkillId,
}: {
  isLoading: boolean;
  errorMessage: string | null;
  skills: Array<RecommendedSkillMetadata>;
  searchQuery: string;
  canInstall: boolean;
  repoRoot: string | null;
  onInstall: (
    skill: RecommendedSkillMetadata,
    installRoot: string | null,
  ) => void;
  installedSkillMatchKeys: Set<string>;
  installingSkillId: string | null;
}): ReactElement {
  const uninstalledSkills = skills.filter(
    (skill) =>
      !isRecommendedSkillInstalled({
        installedSkillMatchKeys,
        skill,
      }),
  );
  const query = searchQuery.trim().toLowerCase();
  const filteredSkills = uninstalledSkills.filter((skill) => {
    if (query.length === 0) {
      return true;
    }
    const haystack = [
      skill.name,
      skill.description,
      skill.shortDescription ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.page.loading"
              defaultMessage="Loading skills..."
              description="Loading label on the skills page"
            />
          }
        />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.recommended.error"
              defaultMessage="Unable to load recommended skills"
              description="Error title when recommended skills fail to load"
            />
          }
          description={errorMessage}
        />
      </div>
    );
  }

  if (uninstalledSkills.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.page.empty"
              defaultMessage="No skills found"
              description="Empty state on the skills page"
            />
          }
        />
      </div>
    );
  }

  if (filteredSkills.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.page.filteredEmpty"
              defaultMessage="No skills match your filters"
              description="Empty state when filters hide all skills"
            />
          }
          description={
            <FormattedMessage
              id="skills.page.filteredEmptyDescription"
              defaultMessage="Try adjusting your search or scope filters"
              description="Description for filtered skills empty state"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className={clsx("grid gap-4", styles.grid)}>
      {filteredSkills.map((skill) => {
        const isInstalled = isRecommendedSkillInstalled({
          installedSkillMatchKeys,
          skill,
        });
        const isInstalling = installingSkillId === skill.id;
        return (
          <RecommendedSkillCard
            key={skill.id}
            skill={skill}
            canInstall={canInstall}
            isInstalled={isInstalled}
            isInstalling={isInstalling}
            repoRoot={repoRoot}
            onInstall={onInstall}
          />
        );
      })}
    </div>
  );
}
