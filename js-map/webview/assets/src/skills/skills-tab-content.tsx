import type * as AppServer from "app-server-types";
import clsx from "clsx";
import type { RecommendedSkillMetadata } from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { LargeEmptyState } from "@/components/large-empty-state";
import SkillsIcon from "@/icons/skills.svg";
import { getSkillScopeLabel } from "@/skills/format-skill-scope";
import { RecommendedSkillCard } from "@/skills/recommended-skill-card";
import { SkillCard } from "@/skills/skill-card";
import { getSkillDisplayName } from "@/skills/skill-utils";

import type { InstalledCardAction } from "./installed-card-action";
import { PluginsPageSection } from "./plugins-page-section";
import { isRecommendedSkillInstalled } from "./plugins-page-selectors";
import {
  getRepoRootForSkillPath,
  type PluginsPageSectionDescriptor,
} from "./plugins-page-utils";

import styles from "./skills-page-grid.module.css";

export type InstalledSkillGroup = {
  id: string;
  title: string;
  skillEntries: Array<{ skill: AppServer.v2.SkillMetadata }>;
};

export function SkillsTabContent({
  canInstallRecommendedSkills,
  errorMessage,
  hideInstalledSectionTitle = false,
  installedStateAction = "check",
  installedSkillGroups,
  installedSkills,
  installedSkillMatchKeys,
  installingSkillId,
  isLoadingInstalledSkills,
  isLoadingRecommendedSkills,
  onInstallRecommendedSkill,
  onSkillsUpdated,
  recommendedRepoRoot,
  recommendedSkills,
  roots,
  installedSection,
  recommendedSection,
}: {
  canInstallRecommendedSkills: boolean;
  errorMessage: string | null;
  hideInstalledSectionTitle?: boolean;
  installedStateAction?: InstalledCardAction;
  installedSkillGroups: Array<InstalledSkillGroup>;
  installedSkills: Array<{ skill: AppServer.v2.SkillMetadata }>;
  installedSkillMatchKeys: Set<string>;
  installingSkillId: string | null;
  isLoadingInstalledSkills: boolean;
  isLoadingRecommendedSkills: boolean;
  onInstallRecommendedSkill: (
    skill: RecommendedSkillMetadata,
    installRoot: string | null,
  ) => void;
  onSkillsUpdated: () => void;
  recommendedRepoRoot: string | null;
  recommendedSkills: Array<RecommendedSkillMetadata>;
  roots: Array<string>;
  installedSection: PluginsPageSectionDescriptor | null;
  recommendedSection: PluginsPageSectionDescriptor | null;
}): ReactElement {
  const uninstalledRecommendedSkills = recommendedSkills.filter((skill) => {
    return !isRecommendedSkillInstalled({
      installedSkillMatchKeys,
      skill,
    });
  });
  const hasInstalledSkillsContent =
    installedSection != null &&
    (installedSkillGroups.length > 0 || installedSkills.length > 0);
  const hasRecommendedSkillsContent =
    recommendedSection != null && uninstalledRecommendedSkills.length > 0;
  const shouldShowUnifiedEmptyState =
    !isLoadingInstalledSkills &&
    !isLoadingRecommendedSkills &&
    errorMessage == null &&
    !hasInstalledSkillsContent &&
    !hasRecommendedSkillsContent;

  if (shouldShowUnifiedEmptyState) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.appsPage.empty.skills"
              defaultMessage="No skills found"
              description="Empty state title when no skills match filters on the Skills & Apps page"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9 pb-panel">
      {recommendedSection != null ? (
        <PluginsPageSection
          id={recommendedSection.id}
          title={recommendedSection.title}
        >
          <RecommendedSkillsGrid
            canInstall={canInstallRecommendedSkills}
            errorMessage={errorMessage}
            installingSkillId={installingSkillId}
            isLoading={isLoadingRecommendedSkills}
            onInstall={onInstallRecommendedSkill}
            repoRoot={recommendedRepoRoot}
            skills={uninstalledRecommendedSkills}
          />
        </PluginsPageSection>
      ) : null}

      {installedSection != null ? (
        <InstalledSkillsSection
          hideTitle={hideInstalledSectionTitle}
          installedSection={installedSection}
          installedSkillGroups={installedSkillGroups}
          installedSkills={installedSkills}
          installedStateAction={installedStateAction}
          isLoadingInstalledSkills={isLoadingInstalledSkills}
          onSkillsUpdated={onSkillsUpdated}
          roots={roots}
        />
      ) : null}
    </div>
  );
}

function InstalledSkillsSection({
  hideTitle,
  installedSection,
  installedSkillGroups,
  installedSkills,
  installedStateAction,
  isLoadingInstalledSkills,
  onSkillsUpdated,
  roots,
}: {
  hideTitle: boolean;
  installedSection: PluginsPageSectionDescriptor;
  installedSkillGroups: Array<InstalledSkillGroup>;
  installedSkills: Array<{ skill: AppServer.v2.SkillMetadata }>;
  installedStateAction: InstalledCardAction;
  isLoadingInstalledSkills: boolean;
  onSkillsUpdated: () => void;
  roots: Array<string>;
}): ReactElement {
  const content =
    installedSkillGroups.length > 0 ? (
      <div className="flex flex-col gap-8">
        {installedSkillGroups.map((group) => (
          <InstalledSkillsGroupSection
            key={group.id}
            id={group.id}
            title={group.title}
          >
            <InstalledSkillsGrid
              installedStateAction={installedStateAction}
              isLoading={isLoadingInstalledSkills}
              roots={roots}
              skillEntries={group.skillEntries}
              onSkillsUpdated={onSkillsUpdated}
            />
          </InstalledSkillsGroupSection>
        ))}
      </div>
    ) : (
      <InstalledSkillsGrid
        installedStateAction={installedStateAction}
        isLoading={isLoadingInstalledSkills}
        roots={roots}
        skillEntries={installedSkills}
        onSkillsUpdated={onSkillsUpdated}
      />
    );

  if (hideTitle) {
    return <div id={installedSection.id}>{content}</div>;
  }

  return (
    <PluginsPageSection id={installedSection.id} title={installedSection.title}>
      {content}
    </PluginsPageSection>
  );
}

export function InstalledSkillsGrid({
  installedStateAction = "check",
  isLoading,
  isSingleColumn = false,
  roots,
  skillEntries,
  useCompactEmptyState = false,
  onSkillsUpdated,
}: {
  installedStateAction?: InstalledCardAction;
  isLoading: boolean;
  isSingleColumn?: boolean;
  roots: Array<string>;
  skillEntries: Array<{ skill: AppServer.v2.SkillMetadata }>;
  useCompactEmptyState?: boolean;
  onSkillsUpdated: () => void;
}): ReactElement {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
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

  if (skillEntries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        {useCompactEmptyState ? (
          <div className="text-sm text-token-text-secondary">
            <FormattedMessage
              id="skills.appsPage.empty.skills"
              defaultMessage="No skills found"
              description="Empty state title when no skills match filters on the Skills & Apps page"
            />
          </div>
        ) : (
          <LargeEmptyState
            title={
              <FormattedMessage
                id="skills.appsPage.empty.skills"
                defaultMessage="No skills found"
                description="Empty state title when no skills match filters on the Skills & Apps page"
              />
            }
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "grid gap-4",
        isSingleColumn ? "grid-cols-1" : styles.grid,
      )}
    >
      {skillEntries.map(({ skill }) => {
        return (
          <InstalledSkillCardItem
            installedStateAction={installedStateAction}
            key={skill.path}
            onSkillsUpdated={onSkillsUpdated}
            roots={roots}
            skill={skill}
          />
        );
      })}
    </div>
  );
}

function InstalledSkillCardItem({
  installedStateAction,
  onSkillsUpdated,
  roots,
  skill,
}: {
  installedStateAction: InstalledCardAction;
  onSkillsUpdated: () => void;
  roots: Array<string>;
  skill: AppServer.v2.SkillMetadata;
}): ReactElement {
  const intl = useIntl();
  const repoRoot =
    skill.scope === "repo"
      ? getRepoRootForSkillPath({
          skillPath: skill.path,
          roots,
        })
      : null;
  const actionLabel =
    installedStateAction === "toggle"
      ? getSkillScopeLabel({
          skill,
          roots,
          intl,
        })
      : undefined;

  return (
    <SkillCard
      cardIcon={
        installedStateAction === "toggle" ? (
          <MonochromeSkillCardIcon />
        ) : undefined
      }
      cardIconContainer={installedStateAction !== "toggle"}
      actionLabel={actionLabel}
      displayName={getSkillDisplayName(skill)}
      installedStateAction={installedStateAction}
      onSkillsUpdated={onSkillsUpdated}
      repoRoot={repoRoot}
      scopeBadges={[]}
      skill={skill}
    />
  );
}

function MonochromeSkillCardIcon(): ReactElement {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-token-border-default text-token-text-secondary">
      <SkillsIcon className="icon-sm" />
    </span>
  );
}

function InstalledSkillsGroupSection({
  children,
  id,
  nodeRef,
  title,
}: {
  children: React.ReactNode;
  id: string;
  nodeRef?: (node: HTMLElement | null) => void;
  title: string;
}): ReactElement {
  return (
    <section
      className="flex flex-col gap-4"
      id={id}
      ref={(node): void => {
        nodeRef?.(node);
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-token-border-light pr-0.5 pb-2">
        <div className="text-[15px] leading-6 text-token-foreground">
          {title}
        </div>
      </div>
      {children}
    </section>
  );
}

function RecommendedSkillsGrid({
  canInstall,
  errorMessage,
  installingSkillId,
  isLoading,
  onInstall,
  repoRoot,
  skills,
}: {
  canInstall: boolean;
  errorMessage: string | null;
  installingSkillId: string | null;
  isLoading: boolean;
  onInstall: (
    skill: RecommendedSkillMetadata,
    installRoot: string | null,
  ) => void;
  repoRoot: string | null;
  skills: Array<RecommendedSkillMetadata>;
}): ReactElement {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
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
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
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

  if (skills.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        <LargeEmptyState
          title={
            <FormattedMessage
              id="skills.appsPage.empty.skills"
              defaultMessage="No skills found"
              description="Empty state title when no skills match filters on the Skills & Apps page"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className={clsx("grid gap-4", styles.grid)}>
      {skills.map((skill) => {
        return (
          <RecommendedSkillCard
            key={skill.id}
            canInstall={canInstall}
            isInstalled={false}
            isInstalling={installingSkillId === skill.id}
            onInstall={onInstall}
            repoRoot={repoRoot}
            skill={skill}
          />
        );
      })}
    </div>
  );
}
