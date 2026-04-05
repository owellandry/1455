import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { FormattedMessage, useIntl, type MessageDescriptor } from "react-intl";

import type { ComposerMode } from "@/composer/composer";
import type { HomeUseCase } from "@/home-use-cases-data";
import { HOME_USE_CASES } from "@/home-use-cases-data";
import { useIsDark } from "@/utils/use-is-dark";

const SKILL_TOKEN_REGEX = /\$[a-z0-9-]+/gi;
const COLOR_ICON_SOURCES = import.meta.glob<string>("./icons/color/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});
const COLOR_ICON_SOURCES_BY_FILENAME = Object.fromEntries(
  Object.entries(COLOR_ICON_SOURCES).map(([sourcePath, sourceUrl]) => [
    sourcePath.split("/").pop() ?? sourcePath,
    sourceUrl,
  ]),
);

const FALLBACK_CONVERSATION_STARTER_COLOR_ICON_NAME = "document";

export function HomeUseCases({
  onSelect,
}: {
  onSelect: (
    prompt: string,
    mode: ComposerMode,
    skillName?: string,
    initialCollaborationMode?: HomeUseCase["initialCollaborationMode"],
  ) => void;
}): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <HomeUseCaseSection
        titleMessage={{
          id: "home.useCases.section.getStarted",
          defaultMessage: "Get started",
          description: "Header for the get started section on the home page",
        }}
        useCases={HOME_USE_CASES.filter(isGetStartedUseCase)}
        onSelect={onSelect}
      />
      <HomeUseCaseSection
        titleMessage={{
          id: "home.useCases.section.skills",
          defaultMessage: "Skills",
          description: "Header for the skills section on the home page",
        }}
        useCases={HOME_USE_CASES.filter(isSkillUseCase)}
        onSelect={onSelect}
      />
      <HomeUseCaseSection
        titleMessage={{
          id: "home.useCases.section.automations",
          defaultMessage: "Automations",
          description: "Header for the automations section on the home page",
        }}
        useCases={HOME_USE_CASES.filter(isAutomationUseCase)}
        onSelect={onSelect}
      />
    </div>
  );
}

function HomeUseCaseSection({
  titleMessage,
  useCases,
  onSelect,
}: {
  titleMessage: MessageDescriptor;
  useCases: Array<HomeUseCase>;
  onSelect: (
    prompt: string,
    mode: ComposerMode,
    skillName?: string,
    initialCollaborationMode?: HomeUseCase["initialCollaborationMode"],
  ) => void;
}): ReactElement | null {
  const intl = useIntl();

  if (useCases.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="home-use-case-header pl-3 text-base font-medium text-token-description-foreground">
        <FormattedMessage {...titleMessage} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {useCases.map((useCase) => (
          <ConversationStarterCard
            key={useCase.id}
            className="home-use-case-card"
            icon={<ColorIcon name={useCase.iconName} />}
            mode={useCase.mode}
            onSelect={(prompt, mode, initialCollaborationMode) =>
              onSelect(
                prompt,
                mode,
                useCase.skillName,
                initialCollaborationMode,
              )
            }
            initialCollaborationMode={useCase.initialCollaborationMode}
            prompt={intl.formatMessage(useCase.promptMessage)}
          />
        ))}
      </div>
    </div>
  );
}

function isAutomationUseCase(useCase: { isAutomation?: boolean }): boolean {
  return useCase.isAutomation === true;
}

function isSkillUseCase(useCase: {
  promptMessage: MessageDescriptor;
}): boolean {
  const defaultMessage = useCase.promptMessage.defaultMessage;
  if (typeof defaultMessage !== "string") {
    return false;
  }
  return /\$[a-z0-9-]+/i.test(defaultMessage);
}

function isGetStartedUseCase(useCase: {
  promptMessage: MessageDescriptor;
  isAutomation?: boolean;
}): boolean {
  return !isSkillUseCase(useCase) && !isAutomationUseCase(useCase);
}

export function ConversationStarterCard({
  className,
  icon,
  mode,
  onSelect,
  initialCollaborationMode,
  prompt,
}: {
  className?: string;
  icon: ReactElement;
  mode: ComposerMode;
  onSelect: (
    prompt: string,
    mode: ComposerMode,
    initialCollaborationMode?: HomeUseCase["initialCollaborationMode"],
  ) => void;
  initialCollaborationMode?: HomeUseCase["initialCollaborationMode"];
  prompt: string;
}): ReactElement {
  return (
    <button
      className={clsx(
        "group flex w-full flex-col items-start gap-2 rounded-4xl border border-token-border/50 bg-token-input-background/70 px-3 py-3 text-left text-base transition-colors hover:border-token-border hover:bg-token-input-background focus-visible:outline-token-border focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
      type="button"
      onClick={() => onSelect(prompt, mode, initialCollaborationMode)}
    >
      <span className="ml-1 inline-flex h-6 w-6 items-center justify-center">
        {icon}
      </span>
      <span className="w-full pl-1 text-left text-base text-token-text-primary">
        {getConversationStarterPreviewContent(prompt)}
      </span>
    </button>
  );
}

export function ColorIcon({
  className,
  name,
}: {
  className?: string;
  name: string;
}): ReactElement {
  const isDark = useIsDark();
  const colorVariant = isDark ? "dark" : "light";
  const colorIconName = name;
  const colorIconFileName = `${colorIconName}-${colorVariant}.svg`;
  const fallbackColorIconFileName = `${FALLBACK_CONVERSATION_STARTER_COLOR_ICON_NAME}-${colorVariant}.svg`;
  const iconSrc =
    COLOR_ICON_SOURCES_BY_FILENAME[colorIconFileName] ??
    COLOR_ICON_SOURCES_BY_FILENAME[fallbackColorIconFileName];

  return (
    <img
      className={clsx("icon-md", className)}
      alt=""
      aria-hidden="true"
      src={iconSrc}
    />
  );
}

function getConversationStarterPreviewContent(prompt: string): ReactNode {
  const previewText = getConversationStarterPreviewText(prompt);
  if (!previewText) {
    return "";
  }
  const parts: Array<ReactNode> = [];
  SKILL_TOKEN_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match = SKILL_TOKEN_REGEX.exec(previewText);
  while (match) {
    const startIndex = match.index;
    if (startIndex > lastIndex) {
      parts.push(previewText.slice(lastIndex, startIndex));
    }
    parts.push(
      <span className="font-medium" key={`${match[0]}-${startIndex}`}>
        {match[0]}
      </span>,
    );
    lastIndex = startIndex + match[0].length;
    match = SKILL_TOKEN_REGEX.exec(previewText);
  }
  if (lastIndex < previewText.length) {
    parts.push(previewText.slice(lastIndex));
  }
  return parts;
}

function getConversationStarterPreviewText(prompt: string): string {
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    return "";
  }
  const firstLine = trimmedPrompt
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);
  if (!firstLine) {
    return "";
  }
  const trimmedLine = firstLine.trim();
  const sentenceMatch = trimmedLine.match(/^(.+?[.!?])(?:\s|$)/);
  if (!sentenceMatch) {
    return trimmedLine;
  }
  return sentenceMatch[1].trim();
}
