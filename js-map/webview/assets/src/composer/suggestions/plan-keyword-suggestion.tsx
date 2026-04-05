import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import type {
  AboveComposerSuggestion,
  AboveComposerSuggestionMatchContext,
} from "@/composer/above-composer-suggestions-types";
import {
  PLAN_MODE_KEYWORD_SUGGESTION_ID,
  shouldShowPlanKeywordSuggestion,
} from "@/composer/above-composer-suggestions-utils";
import PlanIcon from "@/icons/plan.svg";

export function buildPlanKeywordSuggestion({
  intl,
  composerText,
  collaborationModes,
  activeCollaborationMode,
  dismissedSuggestionIds,
  setSelectedCollaborationMode,
  setDismissedSuggestionIds,
}: AboveComposerSuggestionMatchContext): AboveComposerSuggestion | null {
  const hasPlanMode = collaborationModes.some((mode) => mode.mode === "plan");
  const isPlanMode = activeCollaborationMode?.mode === "plan";
  const isDismissed = dismissedSuggestionIds.has(
    PLAN_MODE_KEYWORD_SUGGESTION_ID,
  );

  if (
    !shouldShowPlanKeywordSuggestion({
      composerText,
      hasPlanMode,
      isPlanMode,
      isDismissed,
    })
  ) {
    return null;
  }

  return {
    id: PLAN_MODE_KEYWORD_SUGGESTION_ID,
    title: intl.formatMessage({
      id: "composer.aboveSuggestion.plan.title",
      defaultMessage: "Create a plan",
      description: "Title for the above-composer plan keyword suggestion",
    }),
    icon: PlanIcon,
    meta: (
      <FormattedMessage
        id="composer.aboveSuggestion.plan.shortcutWithAction"
        defaultMessage="{shortcut}"
        description="Keyboard shortcut hint shown before the above-composer plan suggestion button"
        values={{
          shortcut: (
            <Button
              aria-hidden
              tabIndex={-1}
              color="outline"
              size="composerSm"
              className="pointer-events-none !h-auto rounded-md px-1 py-0.5 text-xs !leading-none"
            >
              <FormattedMessage
                id="composer.aboveSuggestion.plan.shortcut"
                defaultMessage="Shift + Tab"
                description="Keyboard shortcut hint shown next to the above-composer plan suggestion button"
              />
            </Button>
          ),
        }}
      />
    ),
    actionLabel: intl.formatMessage({
      id: "composer.aboveSuggestion.plan.action",
      defaultMessage: "Use plan mode",
      description:
        "Primary button label for enabling plan mode from the above-composer suggestion",
    }),
    onAction: (): void => {
      setSelectedCollaborationMode("plan");
    },
    onDismiss: (): void => {
      setDismissedSuggestionIds((prev) => {
        if (prev.includes(PLAN_MODE_KEYWORD_SUGGESTION_ID)) {
          return prev;
        }
        return [...prev, PLAN_MODE_KEYWORD_SUGGESTION_ID];
      });
    },
  };
}
