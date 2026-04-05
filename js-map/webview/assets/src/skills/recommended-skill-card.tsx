import path from "path";

import type { RecommendedSkillMetadata } from "protocol";
import type { ReactElement } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import PlusIcon from "@/icons/plus.svg";
import { formatSkillTitle } from "@/skills/format-skill-title";
import { getSkillIcon } from "@/skills/get-skill-icon";
import { SkillPreviewCardShell } from "@/skills/skill-preview-card-shell";
import {
  SkillMarkdownPreviewBody,
  SkillPreviewModalTitle,
} from "@/skills/skill-preview-modal";
import { getSkillIconClassName } from "@/utils/skill-icon-class";

const messages = defineMessages({
  installSkill: {
    id: "skills.recommended.installSkill",
    defaultMessage: "Install skill",
    description: "Label for the install skill icon button on recommended cards",
  },
});

export function RecommendedSkillCard({
  skill,
  canInstall,
  isInstalled,
  isInstalling,
  repoRoot,
  onInstall,
}: {
  skill: RecommendedSkillMetadata;
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  repoRoot: string | null;
  onInstall: (
    skill: RecommendedSkillMetadata,
    installRoot: string | null,
  ) => void;
}): ReactElement {
  const intl = useIntl();
  const description =
    skill.shortDescription && skill.shortDescription.length > 0
      ? skill.shortDescription
      : skill.description;
  const skillFilePath = getRecommendedSkillFilePath({
    repoRoot,
    repoPath: skill.repoPath,
  });
  const displayName = formatSkillTitle(skill.name);
  const skillIcon = (
    <RecommendedSkillIcon
      skill={skill}
      size={skill.iconLarge ? "large" : "small"}
      basePath={skillFilePath}
    />
  );
  const installSkillMessage = messages.installSkill;
  const isInstallDisabled = isInstalled || !canInstall || isInstalling;
  const actions = (
    <Tooltip tooltipContent={<FormattedMessage {...installSkillMessage} />}>
      <Button
        aria-label={intl.formatMessage(installSkillMessage)}
        color="secondary"
        size="icon"
        disabled={isInstallDisabled}
        loading={isInstalling}
        onClick={(event): void => {
          event.stopPropagation();
          if (isInstallDisabled) {
            return;
          }
          onInstall(skill, null);
        }}
      >
        <PlusIcon className="icon-sm" />
      </Button>
    </Tooltip>
  );
  return (
    <SkillPreviewCardShell
      cardIcon={skillIcon}
      cardTitle={displayName}
      cardDescription={description}
      cardActions={actions}
      cardClassName="justify-center border-none"
      modalTitle={<SkillPreviewModalTitle kind="Skill" title={displayName} />}
      modalTitleText={displayName}
      modalDescription={description}
      modalBody={({ isOpen }) => (
        <SkillMarkdownPreviewBody
          isOpen={isOpen}
          skillPath={skillFilePath}
          titleText={displayName}
        />
      )}
      modalFooter={
        <RecommendedInstallFooter
          canInstall={canInstall}
          installing={isInstalling}
          isInstalled={isInstalled}
          onInstall={onInstall}
          skill={skill}
        />
      }
    />
  );
}

function RecommendedInstallFooter({
  canInstall,
  installing,
  isInstalled,
  onInstall,
  skill,
}: {
  canInstall: boolean;
  installing: boolean;
  isInstalled: boolean;
  onInstall: (
    skill: RecommendedSkillMetadata,
    installRoot: string | null,
  ) => void;
  skill: RecommendedSkillMetadata;
}): ReactElement {
  const installLabel = (
    <FormattedMessage
      id="skills.recommended.install"
      defaultMessage="Install"
      description="Button label to install a recommended skill"
    />
  );
  const installedLabel = (
    <FormattedMessage
      id="skills.recommended.installed"
      defaultMessage="Installed"
      description="Label for installed recommended skills"
    />
  );
  if (isInstalled || !canInstall || installing) {
    return (
      <div className="flex w-full justify-end">
        <Button
          color="primary"
          size="toolbar"
          disabled={isInstalled || !canInstall || installing}
          loading={installing}
        >
          {isInstalled ? installedLabel : installLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end">
      <Button
        color="primary"
        size="toolbar"
        onClick={(event): void => {
          event.stopPropagation();
          onInstall(skill, null);
        }}
      >
        <PlusIcon className="icon-xs" />
        {installLabel}
      </Button>
    </div>
  );
}

function getRecommendedSkillFilePath({
  repoRoot,
  repoPath,
}: {
  repoRoot: string | null;
  repoPath: string;
}): string | null {
  if (!repoRoot) {
    return null;
  }
  const normalizedPath = repoPath.split("/").join(path.sep);
  const fullPath = path.join(repoRoot, normalizedPath);
  if (fullPath.toLowerCase().endsWith(".md")) {
    return fullPath;
  }
  return path.join(fullPath, "SKILL.md");
}

function RecommendedSkillIcon({
  skill,
  size = "small",
  basePath,
}: {
  skill: RecommendedSkillMetadata;
  size?: "small" | "large";
  basePath?: string | null;
}): ReactElement {
  const hasLargeIcon = !!skill.iconLarge;
  const Icon = getSkillIcon(null, {
    size,
    iconSmall: skill.iconSmall,
    iconLarge: skill.iconLarge,
    basePath,
    alt: skill.name,
    fallbackName: skill.name,
    fallbackDescription: skill.description,
  });
  const className = `${getSkillIconClassName({
    size,
    hasLargeIcon,
    largeFallbackClassName: "h-5 w-5",
  })} text-token-text-secondary`;
  // oxlint-disable-next-line react-hooks-js/static-components
  return <Icon className={className} />;
}
