import path from "path";

import clsx from "clsx";
import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import type { ComposerMode } from "@/composer/composer";
import { useComposerViewState } from "@/composer/composer-view-state";
import {
  useComposerController,
  useComposerControllerState,
} from "@/composer/prosemirror/use-composer-controller";
import { useCollaborationMode } from "@/composer/use-collaboration-mode";
import ChevronIcon from "@/icons/chevron.svg";
import XIcon from "@/icons/x.svg";
import { formatSkillMentionText } from "@/skills/skill-utils";
import { useRecommendedSkills } from "@/skills/use-recommended-skills";
import { useSkills } from "@/skills/use-skills";
import { persistedAtom } from "@/utils/persisted-atom";

import { WithWindow } from "./components/with-window";
import { HOME_CONVERSATION_STARTER_USE_CASES } from "./home-conversation-starter-data";
import {
  ColorIcon,
  ConversationStarterCard,
  HomeUseCases,
} from "./home-use-cases";
import type { HomeUseCase } from "./home-use-cases-data";

const SKILL_MENTION_REGEX = /\$([a-z0-9-]+)/i;
const aHasHiddenHomeConversationStarters = persistedAtom<boolean>(
  "has-hidden-home-conversation-starters",
  false,
);
const exploreMoreMessage = defineMessage({
  id: "home.conversationStarters.exploreMore",
  defaultMessage: "Explore more",
  description: "Button label for opening the use case gallery on the home page",
});
const hideConversationStartersMessage = defineMessage({
  id: "home.conversationStarters.hide",
  defaultMessage: "Hide conversation starters",
  description:
    "Aria label for permanently hiding the home page conversation starters",
});
const galleryTitleMessage = defineMessage({
  id: "home.useCases.title",
  defaultMessage: "Start with a task",
  description: "Heading for the use case gallery on the home page",
});
const closeGalleryMessage = defineMessage({
  id: "home.useCases.close",
  defaultMessage: "Close gallery",
  description: "Aria label for closing the use case gallery",
});

export function HomeConversationStarters({
  activeWorkspaceRoot,
  isUseCaseGalleryOpen,
  useCaseGalleryState,
  onCloseGallery,
  onExploreMore,
  useCasePortalTarget,
  portalTarget,
}: {
  activeWorkspaceRoot: string | null;
  isUseCaseGalleryOpen: boolean;
  useCaseGalleryState: "closed" | "opening" | "open" | "closing";
  onCloseGallery: () => void;
  onExploreMore: () => void;
  useCasePortalTarget: HTMLDivElement | null;
  portalTarget: HTMLDivElement | null;
}): ReactElement | null {
  const intl = useIntl();
  const composerController = useComposerController();
  const [
    hasHiddenHomeConversationStarters,
    setHasHiddenHomeConversationStarters,
  ] = useAtom(aHasHiddenHomeConversationStarters);
  const handleStarterSelect = useHomeStarterSelect(
    composerController,
    activeWorkspaceRoot,
  );
  const hasText = useComposerControllerState(composerController, (controller) =>
    controller.hasText(),
  );
  const isVisible = !hasText;

  if (hasHiddenHomeConversationStarters) {
    return null;
  }

  const content = !isUseCaseGalleryOpen ? (
    <div
      className={clsx(
        "[@container_home-main-content_(max-height:399px)]:hidden [@container_home-main-content_(max-width:449px)]:hidden [container-type:inline-size] mx-auto flex w-full max-w-3xl flex-col gap-2 motion-safe:transition-opacity motion-safe:duration-200",
        isVisible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      inert={!isVisible}
      aria-hidden={!isVisible}
    >
      <div className="flex items-center justify-end gap-1">
        <WithWindow electron>
          <>
            <Button
              className="focus-visible:outline-token-focus text-token-description-foreground transition-colors hover:text-token-foreground focus-visible:outline focus-visible:outline-offset-2"
              color="ghost"
              size="composerSm"
              onClick={onExploreMore}
            >
              <FormattedMessage {...exploreMoreMessage} />
            </Button>
            <span
              aria-hidden={true}
              className="mt-0.5 block h-3 w-px shrink-0 bg-token-foreground/10"
            />
          </>
        </WithWindow>
        <Button
          className="focus-visible:outline-token-focus mt-0.5 text-token-description-foreground transition-colors hover:text-token-foreground focus-visible:outline focus-visible:outline-offset-2"
          aria-label={intl.formatMessage(hideConversationStartersMessage)}
          color="ghost"
          size="icon"
          onClick={() => {
            setHasHiddenHomeConversationStarters(true);
          }}
        >
          <XIcon className="icon-xs" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {HOME_CONVERSATION_STARTER_USE_CASES.map((useCase) => (
          <ConversationStarterCard
            key={useCase.id}
            icon={<ColorIcon name={useCase.iconName} />}
            mode={useCase.mode}
            initialCollaborationMode={useCase.initialCollaborationMode}
            onSelect={(prompt, mode, initialCollaborationMode) => {
              handleStarterSelect(
                prompt,
                mode,
                useCase.skillName,
                initialCollaborationMode,
              );
            }}
            prompt={intl.formatMessage(useCase.promptMessage)}
          />
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      {isUseCaseGalleryOpen && useCasePortalTarget
        ? createPortal(
            <HomeUseCaseGallery
              activeWorkspaceRoot={activeWorkspaceRoot}
              onClose={onCloseGallery}
              useCaseGalleryState={useCaseGalleryState}
            />,
            useCasePortalTarget,
          )
        : null}
      {portalTarget && content ? createPortal(content, portalTarget) : content}
    </>
  );
}

function HomeUseCaseGallery({
  activeWorkspaceRoot,
  onClose,
  useCaseGalleryState,
}: {
  activeWorkspaceRoot: string | null;
  onClose: () => void;
  useCaseGalleryState: "closed" | "opening" | "open" | "closing";
}): ReactElement {
  const intl = useIntl();
  const composerController = useComposerController();
  const handleStarterSelect = useHomeStarterSelect(
    composerController,
    activeWorkspaceRoot,
  );

  return (
    <div
      className="home-use-case-gallery min-h-0 w-full flex-1 overflow-y-auto text-left"
      data-state={useCaseGalleryState}
    >
      <div className="[container-type:inline-size] mx-auto flex w-full max-w-3xl flex-col gap-4 px-panel">
        <div aria-hidden="true" className="h-5" />
        <div className="home-use-case-header sticky top-0 z-10 bg-token-bg-primary/90 pb-4">
          <div className="flex items-center gap-4 pt-2">
            <div className="heading-lg pl-3 font-normal text-token-foreground">
              <FormattedMessage {...galleryTitleMessage} />
            </div>
            <Button
              className="focus-visible:outline-token-focus !rounded-full text-token-description-foreground transition-colors hover:text-token-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={intl.formatMessage(closeGalleryMessage)}
              color="secondary"
              size="icon"
              onClick={onClose}
            >
              <ChevronIcon className="icon-sm" />
            </Button>
          </div>
        </div>
        <HomeUseCases onSelect={handleStarterSelect} />
      </div>
    </div>
  );
}

function useHomeStarterSelect(
  composerController: ReturnType<typeof useComposerController>,
  activeWorkspaceRoot: string | null,
): (
  prompt: string,
  mode: ComposerMode,
  skillName?: string,
  initialCollaborationMode?: HomeUseCase["initialCollaborationMode"],
) => void {
  const [, setComposerViewState] = useComposerViewState();
  const { setSelectedMode } = useCollaborationMode();
  const { findSkillByName, forceReload } = useSkills(
    activeWorkspaceRoot ?? undefined,
  );
  const { ensureSkillByName, installSkill } = useRecommendedSkills();

  return (prompt, mode, skillName, initialCollaborationMode): void => {
    setComposerViewState((prev) => {
      if (prev.composerMode === mode) {
        return prev;
      }
      return { ...prev, composerMode: mode };
    });
    if (initialCollaborationMode) {
      setSelectedMode(initialCollaborationMode);
    }
    const mentionMatch = prompt.match(SKILL_MENTION_REGEX);
    const resolvedSkillName = skillName ?? mentionMatch?.[1] ?? null;
    const mentionToken =
      mentionMatch?.[0] ?? (skillName ? `$${skillName}` : null);
    if (!resolvedSkillName || !mentionToken) {
      composerController.setText(prompt);
      composerController.focus();
      return;
    }
    const installedSkill = findSkillByName(resolvedSkillName);
    if (installedSkill) {
      composerController.setPromptText(
        prompt.replace(
          mentionToken,
          formatSkillMentionText({
            name: installedSkill.name,
            path: installedSkill.path,
          }),
        ),
      );
      composerController.focus();
      return;
    }

    composerController.setText(prompt);
    composerController.focus();

    void (async (): Promise<void> => {
      const recommendedSkill = await ensureSkillByName(resolvedSkillName);
      if (!recommendedSkill) {
        return;
      }
      const response = await installSkill({ skill: recommendedSkill });
      if (!response.success || !response.destination) {
        return;
      }
      void forceReload();
      if (composerController.getText() !== prompt) {
        return;
      }
      composerController.setPromptText(
        prompt.replace(
          mentionToken,
          formatSkillMentionText({
            name: recommendedSkill.name,
            path: path.join(response.destination, "SKILL.md"),
          }),
        ),
      );
      composerController.focus();
    })();
  };
}
